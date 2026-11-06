/**
 * Admin Inventory Logs API: Retrieve Inventory Audit Logs (GET)
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { parsePagination } from '../../../_shared/validation.js';

export async function onRequestGet(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const url = new URL(context.request.url);
  const pagination = parsePagination(url, 20, 100);
  if (pagination.error) {
    return errorResponse(pagination.error, 400, 'INVALID_PAGINATION');
  }

  const productId = url.searchParams.get('product_id');
  const variantId = url.searchParams.get('variant_id');

  try {
    const db = getDatabase(context);

    const conditions = [];
    const params = [];

    if (productId) {
      conditions.push('il.product_id = ?');
      params.push(productId);
    }

    if (variantId) {
      conditions.push('il.variant_id = ?');
      params.push(variantId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM inventory_logs il ${whereClause}`;
    const countResult = await db.prepare(countSql).bind(...params).first();
    const total = countResult?.total || 0;

    const querySql = `
      SELECT
        il.id,
        il.product_id,
        il.variant_id,
        il.previous_quantity,
        il.new_quantity,
        il.change_amount,
        il.reason,
        il.updated_by,
        il.created_at,
        p.name as product_name,
        p.slug as product_slug,
        pv.title as variant_title,
        pv.sku as variant_sku
      FROM inventory_logs il
      LEFT JOIN products p ON il.product_id = p.id
      LEFT JOIN product_variants pv ON il.variant_id = pv.id
      ${whereClause}
      ORDER BY il.created_at DESC, il.id DESC
      LIMIT ? OFFSET ?
    `;

    const { results } = await db.prepare(querySql).bind(...params, pagination.limit, pagination.offset).all();

    return jsonResponse({
      data: results || [],
      pagination: {
        total,
        limit: pagination.limit,
        offset: pagination.offset,
        has_more: pagination.offset + (results?.length || 0) < total
      }
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to fetch inventory logs.');
  }
}
