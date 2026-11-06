/**
 * Public & Admin R2 Image Delivery Route
 * Cloudflare Pages Functions: /uploads/[[key]]
 *
 * Serves verified product images from Cloudflare R2 (env.PRODUCT_BUCKET).
 * - Restricts delivery to registered product_images in D1.
 * - Protects unpublished / draft / archived product images (admin session required).
 * - Implements strict directory-traversal, malformed-key, and extension defenses.
 * - Supports HTTP GET and HEAD.
 * - Returns binary image streams with accurate Content-Type, Content-Length, and ETag.
 * - Supports conditional HTTP 304 Not Modified (If-None-Match).
 * - Applies immutable caching for public active images, private caching for admin previews.
 */

import { getDatabase } from '../_shared/db.js';
import { validateAdminSession } from '../_shared/auth.js';
import { ALLOWED_MIME_TYPES } from '../_shared/image-utils.js';

const EXTENSION_TO_MIME = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'gif': 'image/gif',
  'avif': 'image/avif'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"
};

function notFoundResponse() {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS
    }
  });
}

function badRequestResponse(message = 'Invalid image request.') {
  return new Response(message, {
    status: 400,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS
    }
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = (request.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD',
        'Content-Type': 'text/plain; charset=utf-8',
        ...SECURITY_HEADERS
      }
    });
  }

  // 1. Raw URL Traversal Checks (before any parser or normalizer can alter it)
  const rawUrl = request.url || '';
  if (/%2e/i.test(rawUrl) || rawUrl.includes('..') || rawUrl.includes('\\')) {
    return badRequestResponse('Directory traversal sequence detected.');
  }

  // 1b. Extract raw path / key from params or request URL
  let rawKey = '';
  if (params?.key) {
    rawKey = Array.isArray(params.key) ? params.key.join('/') : String(params.key);
  } else {
    try {
      const url = new URL(request.url);
      rawKey = url.pathname.replace(/^\/uploads\/?/, '');
    } catch {
      return badRequestResponse('Malformed request URL.');
    }
  }

  if (!rawKey || !rawKey.trim()) {
    return notFoundResponse();
  }

  // 2. Traversal & malformed character detection
  if (/%2e/i.test(rawKey) || rawKey.includes('..') || rawKey.includes('\\')) {
    return badRequestResponse('Directory traversal sequence detected.');
  }

  let decodedKey;
  try {
    decodedKey = decodeURIComponent(rawKey);
  } catch {
    return badRequestResponse('Malformed URI encoding in image key.');
  }

  // Check decoded key for traversal, separators, and forbidden characters
  if (
    decodedKey.includes('..') ||
    decodedKey.includes('\\') ||
    decodedKey.includes('//') ||
    decodedKey.startsWith('/') ||
    decodedKey.startsWith('./') ||
    /[\x00-\x1F\x7F]/.test(decodedKey) || // control characters / null byte
    decodedKey.length > 256 ||
    decodedKey.length < 5
  ) {
    return badRequestResponse('Invalid characters or malformed path in image key.');
  }

  // 3. Expected prefix validation: Must start with "products/"
  if (!decodedKey.startsWith('products/')) {
    // Unexpected prefix -> Reject (do not expose arbitrary bucket objects)
    return notFoundResponse();
  }

  // 4. Strict filename and extension format check
  // Format: products/<safe-filename>.<ext>
  const keyRegex = /^products\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|gif|avif)$/i;
  if (!keyRegex.test(decodedKey) || decodedKey.includes('..')) {
    return badRequestResponse('Unsupported image format or invalid key format.');
  }

  const ext = decodedKey.split('.').pop()?.toLowerCase();
  const fallbackMime = EXTENSION_TO_MIME[ext];
  if (!fallbackMime) {
    return badRequestResponse('Unsupported image extension.');
  }

  try {
    // 5. Query D1 to verify registration in product_images and inspect authorization
    const db = getDatabase(context);
    const imageRecord = await db.prepare(`
      SELECT 
        pi.id,
        pi.product_id,
        pi.variant_id,
        pi.image_key,
        pi.mime_type,
        pi.file_size_bytes,
        p.status AS product_status,
        pv.status AS variant_status
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      LEFT JOIN product_variants pv ON pi.variant_id = pv.id
      WHERE pi.image_key = ?
    `).bind(decodedKey).first();

    if (!imageRecord) {
      // Unregistered image key -> Return 404
      return notFoundResponse();
    }

    // 6. Access Control Evaluation
    // Public catalogue may ONLY see images of active products (and active variants)
    const isPublicActive =
      imageRecord.product_status === 'active' &&
      (!imageRecord.variant_id || imageRecord.variant_status === 'active');

    let isAuthorized = false;
    let isPublicCache = false;

    if (isPublicActive) {
      isAuthorized = true;
      isPublicCache = true;
    } else {
      // Image belongs to a draft or archived product/variant
      // Only authenticated admin session may preview
      const auth = await validateAdminSession(context, env?.FETCH_FN || fetch);
      if (auth.ok) {
        isAuthorized = true;
        isPublicCache = false;
      } else {
        // Return 404 to avoid leaking existence of draft images to unauthorized clients
        return notFoundResponse();
      }
    }

    // 7. Retrieve object from R2 (env.PRODUCT_BUCKET)
    const bucket = env?.PRODUCT_BUCKET;
    if (!bucket || typeof bucket.get !== 'function') {
      console.error('[R2_DELIVERY_ERROR] PRODUCT_BUCKET binding is missing or invalid.');
      return new Response('Storage service unavailable.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }
      });
    }

    const r2Object = await bucket.get(decodedKey);
    if (!r2Object) {
      return notFoundResponse();
    }

    // 8. Determine Content-Type safely from verified metadata
    let contentType = null;
    if (imageRecord.mime_type && ALLOWED_MIME_TYPES.includes(imageRecord.mime_type.toLowerCase())) {
      contentType = imageRecord.mime_type.toLowerCase();
    } else if (r2Object.httpMetadata?.contentType && ALLOWED_MIME_TYPES.includes(r2Object.httpMetadata.contentType.toLowerCase())) {
      contentType = r2Object.httpMetadata.contentType.toLowerCase();
    } else {
      contentType = fallbackMime;
    }

    // 9. Derive ETag
    let etag = r2Object.httpEtag;
    if (!etag) {
      etag = `"${imageRecord.id}"`;
    } else if (!etag.startsWith('"') && !etag.startsWith('W/')) {
      etag = `"${etag}"`;
    }

    // 10. Cache headers
    // Immutable caching ONLY for public active images (keys are unique UUIDs)
    // Admin previews of draft/archived products must never be cached publicly!
    const cacheControl = isPublicCache
      ? 'public, max-age=31536000, immutable'
      : 'private, no-cache, no-store, must-revalidate';

    // 11. Handle conditional request (If-None-Match -> 304)
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch) {
      const clientEtags = ifNoneMatch.split(',').map(e => e.trim().replace(/^W\//, ''));
      const cleanEtag = etag.replace(/^W\//, '');
      if (clientEtags.includes('*') || clientEtags.includes(cleanEtag)) {
        return new Response(null, {
          status: 304,
          headers: {
            'ETag': etag,
            'Cache-Control': cacheControl,
            ...SECURITY_HEADERS
          }
        });
      }
    }

    // 12. Build response headers
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'ETag': etag,
      'Cache-Control': cacheControl,
      ...SECURITY_HEADERS
    });

    if (r2Object.size) {
      responseHeaders.set('Content-Length', String(r2Object.size));
    } else if (imageRecord.file_size_bytes) {
      responseHeaders.set('Content-Length', String(imageRecord.file_size_bytes));
    }

    // 13. Return binary image or HEAD null
    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: responseHeaders
      });
    }

    // Handle both ReadableStream (standard R2) and Uint8Array/Buffer in test mocks
    const responseBody = r2Object.body || r2Object.bytes || (r2Object.arrayBuffer ? await r2Object.arrayBuffer() : null);

    return new Response(responseBody, {
      status: 200,
      headers: responseHeaders
    });

  } catch (err) {
    console.error('[IMAGE_DELIVERY_ERROR]', err);
    return new Response('An error occurred while retrieving the image.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        ...SECURITY_HEADERS
      }
    });
  }
}

// Export individual method handlers for compatibility
export const onRequestGet = onRequest;
export const onRequestHead = onRequest;
