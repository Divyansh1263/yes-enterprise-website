/**
 * Admin Categories API: Create Category (POST)
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { validateCategoryInput } from '../../../_shared/product-validation.js';

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

  const validation = validateCategoryInput(body);
  if (!validation.valid) {
    return errorResponse(validation.error, 400, 'VALIDATION_ERROR');
  }

  try {
    const db = getDatabase(context);
    const { name, name_hi, slug, description, description_hi, sort_order } = validation.data;

    // Verify slug uniqueness
    const existing = await db.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first();
    if (existing) {
      return errorResponse('A category with this slug already exists.', 409, 'SLUG_ALREADY_EXISTS');
    }

    const id = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(id, name, name_hi, slug, description, description_hi, sort_order).run();

    const created = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();

    return jsonResponse({ success: true, data: created }, 201, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to create category.');
  }
}
