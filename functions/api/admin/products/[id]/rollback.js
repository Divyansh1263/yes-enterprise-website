/**
 * YES ENTERPRISES — Admin Product Conversion Rollback Handler
 * POST /api/admin/products/:id/rollback
 *
 * Restores a variable product back to its pre-conversion baseline state
 * using the verified record in product_conversion_snapshots.
 * Preserves all product_images relationships and soft-archives child variants.
 */

import { jsonResponse, errorResponse } from '../../../../_shared/responses.js';
import { handleDbError } from '../../../../_shared/db.js';
import { validateAdminSession } from '../../../../_shared/auth.js';

export async function onRequestPost(context) {
  try {
    const auth = await validateAdminSession(context);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status, auth.code);
    }

    const productId = context.params.id;
    if (!productId) {
      return errorResponse('Product ID is required.', 400, 'MISSING_ID');
    }

    const db = context.env.DB;
    if (!db) {
      return errorResponse('Database connection unavailable.', 500, 'DB_UNAVAILABLE');
    }

    // 1. Fetch current product record
    const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    if (!product) {
      return errorResponse(`Product '${productId}' not found.`, 404, 'PRODUCT_NOT_FOUND');
    }

    // 2. Fetch the latest active pre-conversion snapshot
    const snapshot = await db.prepare(`
      SELECT * FROM product_conversion_snapshots 
      WHERE product_id = ? AND status = 'active'
      ORDER BY snapshot_timestamp DESC 
      LIMIT 1
    `).bind(productId).first();

    if (!snapshot) {
      return errorResponse(
        `No active pre-conversion snapshot found for product '${productId}'. Cannot rollback safely without baseline data.`,
        400,
        'NO_SNAPSHOT_FOUND'
      );
    }

    const statements = [
      // A. Restore parent product baseline pricing, MOQ, SKU and toggle has_variants = 0
      db.prepare(`
        UPDATE products SET
          base_price_paise = ?,
          compare_at_price_paise = ?,
          expected_price_per_100_paise = ?,
          min_order_quantity = ?,
          sku = ?,
          has_variants = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        snapshot.baseline_base_price_paise,
        snapshot.baseline_compare_at_price_paise,
        snapshot.baseline_expected_price_per_100_paise,
        snapshot.baseline_min_order_quantity,
        snapshot.baseline_sku,
        productId
      ),

      // B. Soft-archive child variants (never hard DELETE; preserves history & inventory logs)
      db.prepare(`
        UPDATE product_variants SET
          status = 'archived',
          updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ?
      `).bind(productId),

      // C. Mark snapshot as restored
      db.prepare(`
        UPDATE product_conversion_snapshots SET
          status = 'restored'
        WHERE id = ?
      `).bind(snapshot.id)

      // D. Note: product_images records are deliberately NOT modified to maintain
      // full reversibility without severing variant-to-image links.
    ];

    await db.batch(statements);

    // Fetch refreshed product
    const restoredProduct = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();

    return jsonResponse({
      success: true,
      message: `Product '${productId}' successfully rolled back to simple baseline state.`,
      data: {
        product: restoredProduct,
        snapshot_id: snapshot.id,
        restored_from: snapshot.snapshot_timestamp
      }
    }, 200);

  } catch (err) {
    return handleDbError(err, 'Failed to rollback product conversion.');
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestPost(context);
}
