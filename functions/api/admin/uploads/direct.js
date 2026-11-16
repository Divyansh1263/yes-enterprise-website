/**
 * Admin Upload API: Direct Upload Endpoint (POST)
 * Accepts multipart/form-data with file bytes and product metadata,
 * validates magic bytes and dimensions, writes directly to Cloudflare R2 PRODUCT_BUCKET,
 * and atomically creates the product_images record in D1.
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { validateImagePayload, getExtensionForMime, MAX_IMAGE_SIZE_BYTES } from '../../../_shared/image-utils.js';
import { getR2Client } from '../../../_shared/r2.js';

export async function onRequestPost(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  let formData;
  try {
    formData = await context.request.formData();
  } catch (formErr) {
    return errorResponse('Failed to parse multipart form data: ' + (formErr.message || ''), 400, 'INVALID_FORM_DATA');
  }

  const file = formData.get('file');
  const productId = formData.get('product_id');
  const variantId = formData.get('variant_id') || null;
  const altText = formData.get('alt_text') || '';
  const altTextHi = formData.get('alt_text_hi') || '';
  const isPrimary = formData.get('is_primary') === 'true' || formData.get('is_primary') === true;
  const sortOrder = parseInt(formData.get('sort_order') || '0', 10) || 0;

  if (!file || typeof file === 'string') {
    return errorResponse('Image file is required.', 400, 'FILE_REQUIRED');
  }

  if (!productId || typeof productId !== 'string') {
    return errorResponse('product_id is required.', 400, 'PRODUCT_ID_REQUIRED');
  }

  try {
    const db = getDatabase(context);

    // 1. Verify target product exists
    const product = await db.prepare('SELECT id, name FROM products WHERE id = ?').bind(productId).first();
    if (!product) {
      return errorResponse('Product not found.', 404, 'NOT_FOUND');
    }

    // 2. Verify variant if supplied
    if (variantId) {
      const variant = await db.prepare('SELECT id, product_id FROM product_variants WHERE id = ?').bind(variantId).first();
      if (!variant) {
        return errorResponse('Variant not found.', 404, 'NOT_FOUND');
      }
      if (variant.product_id !== productId) {
        return errorResponse('Variant does not belong to the specified product.', 400, 'PRODUCT_MISMATCH');
      }
    }

    // 3. Read and validate binary bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length === 0) {
      return errorResponse('Image file is empty.', 400, 'EMPTY_FILE');
    }

    if (bytes.length > MAX_IMAGE_SIZE_BYTES) {
      return errorResponse(`File size exceeds maximum allowable limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`, 400, 'FILE_TOO_LARGE');
    }

    const payloadCheck = validateImagePayload(bytes, file.type);
    if (!payloadCheck.valid) {
      return errorResponse(`Invalid image file: ${payloadCheck.error}`, 400, 'INVALID_IMAGE');
    }

    // 4. Generate unpredictable key
    const ext = getExtensionForMime(payloadCheck.mimeType);
    const imageKey = `products/${crypto.randomUUID()}.${ext}`;

    // 5. Store in R2 bucket
    let storedInR2 = false;
    if (context.env?.PRODUCT_BUCKET && typeof context.env.PRODUCT_BUCKET.put === 'function') {
      await context.env.PRODUCT_BUCKET.put(imageKey, bytes, {
        httpMetadata: {
          contentType: payloadCheck.mimeType
        }
      });
      storedInR2 = true;
    } else {
      // Fallback to S3 REST API via aws4fetch
      const r2 = getR2Client(context.env);
      if (r2) {
        const endpoint = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucketName}/${imageKey}`;
        const s3Res = await r2.client.fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': payloadCheck.mimeType
          },
          body: bytes
        });
        if (!s3Res.ok) {
          throw new Error(`S3 client upload failed: HTTP ${s3Res.status}`);
        }
        storedInR2 = true;
      }
    }

    if (!storedInR2 && context.env?.ENVIRONMENT !== 'development') {
      return errorResponse('Storage bucket is not available. Please verify R2 bindings.', 500, 'STORAGE_UNAVAILABLE');
    }

    // 6. Database record insertion
    const imageId = crypto.randomUUID();
    const statements = [];

    // If marked primary or if this is the first image for the product, ensure primary flag is handled
    const currentPrimary = await db.prepare('SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1').bind(productId).first();
    const willBePrimary = isPrimary || !currentPrimary;

    if (willBePrimary) {
      statements.push(
        db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').bind(productId)
      );
    }

    statements.push(
      db.prepare(`
        INSERT INTO product_images (
          id, product_id, variant_id, image_key, alt_text, alt_text_hi,
          mime_type, file_size_bytes, width, height, is_primary, sort_order, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )
      `).bind(
        imageId,
        productId,
        variantId,
        imageKey,
        altText || product.name,
        altTextHi || null,
        payloadCheck.mimeType,
        payloadCheck.sizeBytes,
        payloadCheck.width || null,
        payloadCheck.height || null,
        willBePrimary ? 1 : 0,
        sortOrder
      )
    );

    await db.batch(statements);

    const createdImage = await db.prepare('SELECT * FROM product_images WHERE id = ?').bind(imageId).first();

    return jsonResponse({
      success: true,
      data: {
        ...createdImage,
        is_primary: Boolean(createdImage.is_primary)
      }
    }, 201, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to upload product image.');
  }
}
