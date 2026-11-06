/**
 * Admin Category Reorder API (PUT)
 * Batch updates sort_order for categories.
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

  const orders = body?.orders;
  if (!Array.isArray(orders) || orders.length === 0) {
    return errorResponse('Request body must include a non-empty "orders" array.', 400, 'VALIDATION_ERROR');
  }

  for (const item of orders) {
    if (!item || typeof item.id !== 'string' || !Number.isInteger(item.sort_order) || item.sort_order < 0) {
      return errorResponse('Each order item must contain an "id" string and a non-negative "sort_order" integer.', 400, 'VALIDATION_ERROR');
    }
  }

  try {
    const db = getDatabase(context);
    const statements = orders.map(item =>
      db.prepare('UPDATE categories SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(item.sort_order, item.id)
    );

    await db.batch(statements);

    return jsonResponse({ success: true, message: 'Categories reordered successfully.' }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to reorder categories.');
  }
}
