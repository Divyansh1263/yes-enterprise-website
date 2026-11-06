/**
 * Admin Upload API: Request Presigned Upload URL (POST)
 * Pre-authorizes R2 direct upload, registers pending_uploads record,
 * and signs Content-Type header with allHeaders: true.
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { isAllowedMimeType, getExtensionForMime, MAX_IMAGE_SIZE_BYTES } from '../../../_shared/image-utils.js';
import { generatePresignedUploadUrl } from '../../../_shared/r2.js';

export async function onRequestPost(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON in request body.', 400, 'INVALID_JSON');
  }

  const { product_id, variant_id, mime_type, file_size_bytes } = body || {};

  if (!product_id || typeof product_id !== 'string') {
    return errorResponse('product_id is required.', 400, 'VALIDATION_ERROR');
  }

  if (!mime_type || typeof mime_type !== 'string' || !isAllowedMimeType(mime_type)) {
    return errorResponse('Invalid or unsupported mime_type. Supported formats: JPEG, PNG, WebP, GIF, AVIF.', 400, 'INVALID_MIME_TYPE');
  }

  if (!file_size_bytes || !Number.isInteger(file_size_bytes) || file_size_bytes <= 0) {
    return errorResponse('file_size_bytes must be a positive integer.', 400, 'VALIDATION_ERROR');
  }

  if (file_size_bytes > MAX_IMAGE_SIZE_BYTES) {
    return errorResponse(`File size exceeds maximum allowable limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`, 400, 'FILE_TOO_LARGE');
  }

  try {
    const db = getDatabase(context);

    // 1. Verify product exists
    const product = await db.prepare('SELECT id FROM products WHERE id = ?').bind(product_id).first();
    if (!product) {
      return errorResponse('Product not found.', 404, 'NOT_FOUND');
    }

    // 2. Verify variant if supplied
    if (variant_id) {
      const variant = await db.prepare('SELECT id, product_id FROM product_variants WHERE id = ?').bind(variant_id).first();
      if (!variant) {
        return errorResponse('Variant not found.', 404, 'NOT_FOUND');
      }
      if (variant.product_id !== product_id) {
        return errorResponse('Variant does not belong to the specified product_id.', 400, 'PRODUCT_MISMATCH');
      }
    }

    // 3. Generate fresh unpredictable UUID key — never trust client-supplied keys
    const ext = getExtensionForMime(mime_type);
    const imageKey = `products/${crypto.randomUUID()}.${ext}`;

    // 4. Final safeguard: Ensure no cleanup claim exists for this key
    const claim = await db.prepare('SELECT 1 FROM cleanup_claims WHERE image_key = ?').bind(imageKey).first();
    if (claim) {
      return errorResponse('Image key conflict with cleanup claims. Retry request.', 409, 'KEY_CONFLICT');
    }

    // 5. Insert pending upload record and verify database insertion succeeded
    const insertResult = await db.prepare(`
      INSERT INTO pending_uploads (image_key, product_id, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(imageKey, product_id).run();

    const changes = insertResult?.meta?.changes ?? insertResult?.changes;
    if (changes !== 1) {
      return errorResponse('Failed to record pending upload in database.', 500, 'DATABASE_ERROR');
    }

    // 6. Only after database insertion succeeded, generate the presigned PUT URL
    const expiresInSeconds = 900; // 15 minutes
    const uploadUrl = await generatePresignedUploadUrl(context.env, {
      key: imageKey,
      contentType: mime_type,
      expiresInSeconds
    });

    return jsonResponse({
      success: true,
      upload_url: uploadUrl,
      image_key: imageKey,
      expires_in_seconds: expiresInSeconds
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to generate upload URL.');
  }
}
