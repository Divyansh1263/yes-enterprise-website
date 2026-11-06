/**
 * Admin Image Management API: Update Metadata (PUT) and Delete Image (DELETE)
 * Supports primary image switching, deterministic fallback upon deletion,
 * and lease-based cleanup claims.
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { deleteR2Object } from '../../../_shared/r2.js';

export async function onRequestPut(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const imageId = context.params?.id;
  if (!imageId || typeof imageId !== 'string') {
    return errorResponse('Image ID is required.', 400, 'BAD_REQUEST');
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON in request body.', 400, 'INVALID_JSON');
  }

  const { alt_text, alt_text_hi, is_primary, sort_order, variant_id } = body || {};

  try {
    const db = getDatabase(context);

    const existing = await db.prepare('SELECT * FROM product_images WHERE id = ?').bind(imageId).first();
    if (!existing) {
      return errorResponse('Image not found.', 404, 'NOT_FOUND');
    }

    // Verify variant belongs to same product if variant_id provided
    const targetVariantId = variant_id !== undefined ? variant_id : existing.variant_id;
    if (targetVariantId) {
      const variant = await db.prepare('SELECT id, product_id FROM product_variants WHERE id = ?').bind(targetVariantId).first();
      if (!variant) {
        return errorResponse('Variant not found.', 404, 'NOT_FOUND');
      }
      if (variant.product_id !== existing.product_id) {
        return errorResponse('Variant does not belong to the product.', 400, 'PRODUCT_MISMATCH');
      }
    }

    const statements = [];

    const updatedAlt = alt_text !== undefined ? (alt_text?.trim() || null) : existing.alt_text;
    const updatedAltHi = alt_text_hi !== undefined ? (alt_text_hi?.trim() || null) : existing.alt_text_hi;
    const updatedSort = Number.isInteger(sort_order) && sort_order >= 0 ? sort_order : existing.sort_order;
    const setPrimary = is_primary !== undefined ? Boolean(is_primary) : Boolean(existing.is_primary);

    // If making this image primary, unset other primary images for this product / variant
    if (setPrimary && !existing.is_primary) {
      if (targetVariantId) {
        statements.push(
          db.prepare('UPDATE product_images SET is_primary = 0 WHERE variant_id = ? AND is_primary = 1').bind(targetVariantId)
        );
      } else {
        statements.push(
          db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ? AND variant_id IS NULL AND is_primary = 1').bind(existing.product_id)
        );
      }
    }

    statements.push(
      db.prepare(`
        UPDATE product_images SET
          alt_text = ?, alt_text_hi = ?, is_primary = ?, sort_order = ?, variant_id = ?
        WHERE id = ?
      `).bind(updatedAlt, updatedAltHi, setPrimary ? 1 : 0, updatedSort, targetVariantId || null, imageId)
    );

    await db.batch(statements);

    const updated = await db.prepare('SELECT * FROM product_images WHERE id = ?').bind(imageId).first();

    return jsonResponse({
      success: true,
      data: {
        ...updated,
        is_primary: Boolean(updated.is_primary)
      }
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to update image.');
  }
}

export async function onRequestDelete(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const imageId = context.params?.id;
  if (!imageId || typeof imageId !== 'string') {
    return errorResponse('Image ID is required.', 400, 'BAD_REQUEST');
  }

  try {
    const db = getDatabase(context);

    const existing = await db.prepare('SELECT * FROM product_images WHERE id = ?').bind(imageId).first();
    if (!existing) {
      return errorResponse('Image not found.', 404, 'NOT_FOUND');
    }

    // Check if another product or variant image still references this key
    const otherRef = await db.prepare('SELECT 1 FROM product_images WHERE image_key = ? AND id != ?').bind(existing.image_key, imageId).first();

    const claimToken = crypto.randomUUID();
    if (!otherRef) {
      // 1. Acquire lease-based cleanup claim before deleting from database (only if no other references)
      await db.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, ?, datetime('now', '+15 minutes'), 'deleting')
        ON CONFLICT(image_key) DO UPDATE SET
          claim_token = excluded.claim_token,
          lease_expires_at = excluded.lease_expires_at,
          status = 'deleting'
        WHERE cleanup_claims.status != 'tombstone'
      `).bind(existing.image_key, claimToken).run();
    }

    // 2. Delete database record
    await db.prepare('DELETE FROM product_images WHERE id = ?').bind(imageId).run();

    // 3. Deterministic Primary Image Fallback
    // If the deleted image was primary, select the next available image (lowest sort_order, then earliest created_at)
    if (existing.is_primary) {
      let candidate;
      if (existing.variant_id) {
        candidate = await db.prepare(`
          SELECT id FROM product_images
          WHERE variant_id = ?
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        `).bind(existing.variant_id).first();
      } else {
        candidate = await db.prepare(`
          SELECT id FROM product_images
          WHERE product_id = ? AND variant_id IS NULL
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        `).bind(existing.product_id).first();
      }

      if (candidate) {
        await db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').bind(candidate.id).run();
      }
    }

    // 4. Asynchronously attempt R2 deletion (only if no other records reference this key)
    if (!otherRef) {
      try {
        await deleteR2Object(context.env, existing.image_key);
        // Permanently tombstone claim upon successful storage deletion
        await db.prepare(`
          UPDATE cleanup_claims
          SET status = 'tombstone', claim_token = 'tombstone', lease_expires_at = '9999-12-31 23:59:59'
          WHERE image_key = ? AND claim_token = ?
        `).bind(existing.image_key, claimToken).run();
      } catch (r2Err) {
        console.error('[R2_DELETE_ERROR]', { image_key: existing.image_key, error: r2Err.message });
        await db.prepare("UPDATE cleanup_claims SET status = 'failed' WHERE image_key = ? AND claim_token = ?").bind(existing.image_key, claimToken).run();
      }
    }

    return jsonResponse({
      success: true,
      message: 'Image deleted successfully.'
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to delete image.');
  }
}
