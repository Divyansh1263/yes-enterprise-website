/**
 * Admin Inventory Management API: Update Stock (PUT)
 * Atomically updates stock level and records audit log in inventory_logs.
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';

export async function onRequestPut(context) {
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

  const { product_id, variant_id, new_quantity, reason } = body || {};

  if (!product_id || typeof product_id !== 'string') {
    return errorResponse('product_id is required.', 400, 'VALIDATION_ERROR');
  }

  if (new_quantity === undefined || !Number.isInteger(new_quantity) || new_quantity < 0) {
    return errorResponse('new_quantity must be a non-negative integer.', 400, 'VALIDATION_ERROR');
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return errorResponse('reason is required for audit logging.', 400, 'VALIDATION_ERROR');
  }

  try {
    const db = getDatabase(context);
    const trimmedReason = reason.trim().slice(0, 200);

    let previousQuantity = 0;
    const statements = [];

    if (variant_id) {
      // 1. Variant stock update
      const variant = await db.prepare('SELECT id, product_id, stock_quantity FROM product_variants WHERE id = ?').bind(variant_id).first();
      if (!variant) {
        return errorResponse('Variant not found.', 404, 'NOT_FOUND');
      }
      if (variant.product_id !== product_id) {
        return errorResponse('Variant does not belong to the specified product_id.', 400, 'PRODUCT_MISMATCH');
      }

      previousQuantity = variant.stock_quantity;
      const changeAmount = new_quantity - previousQuantity;

      statements.push(
        db.prepare('UPDATE product_variants SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(new_quantity, variant_id),
        db.prepare(`
          INSERT INTO inventory_logs (
            product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(product_id, variant_id, previousQuantity, new_quantity, changeAmount, trimmedReason, auth.user.email)
      );
    } else {
      // 2. Simple product stock update
      const product = await db.prepare('SELECT id, has_variants, stock_quantity FROM products WHERE id = ?').bind(product_id).first();
      if (!product) {
        return errorResponse('Product not found.', 404, 'NOT_FOUND');
      }
      if (product.has_variants) {
        return errorResponse('For variable products, stock must be updated per variant by supplying "variant_id".', 400, 'VARIABLE_PRODUCT_ERROR');
      }

      previousQuantity = product.stock_quantity;
      const changeAmount = new_quantity - previousQuantity;

      statements.push(
        db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(new_quantity, product_id),
        db.prepare(`
          INSERT INTO inventory_logs (
            product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
          ) VALUES (?, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(product_id, previousQuantity, new_quantity, changeAmount, trimmedReason, auth.user.email)
      );
    }

    await db.batch(statements);

    return jsonResponse({
      success: true,
      data: {
        product_id,
        variant_id: variant_id || null,
        previous_quantity: previousQuantity,
        new_quantity,
        change_amount: new_quantity - previousQuantity,
        reason: trimmedReason,
        updated_by: auth.user.email
      }
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to update inventory.');
  }
}
