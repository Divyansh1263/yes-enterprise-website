/**
 * Admin Category Detail API: Update (PUT) and Delete (DELETE) Category
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { validateCategoryInput } from '../../../_shared/product-validation.js';

export async function onRequestPut(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const categoryId = context.params?.id;
  if (!categoryId || typeof categoryId !== 'string') {
    return errorResponse('Category ID is required.', 400, 'BAD_REQUEST');
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON in request body.', 400, 'INVALID_JSON');
  }

  const validation = validateCategoryInput(body, true);
  if (!validation.valid) {
    return errorResponse(validation.error, 400, 'VALIDATION_ERROR');
  }

  try {
    const db = getDatabase(context);

    const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first();
    if (!existing) {
      return errorResponse('Category not found.', 404, 'NOT_FOUND');
    }

    const { name, name_hi, slug, description, description_hi, sort_order } = validation.data;

    // Check slug collision with other categories
    if (slug && slug !== existing.slug) {
      const slugCollision = await db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').bind(slug, categoryId).first();
      if (slugCollision) {
        return errorResponse('A category with this slug already exists.', 409, 'SLUG_ALREADY_EXISTS');
      }
    }

    const updatedName = name ?? existing.name;
    const updatedNameHi = name_hi ?? existing.name_hi;
    const updatedSlug = slug ?? existing.slug;
    const updatedDesc = description !== undefined ? description : existing.description;
    const updatedDescHi = description_hi !== undefined ? description_hi : existing.description_hi;
    const updatedSort = sort_order ?? existing.sort_order;

    await db.prepare(`
      UPDATE categories
      SET name = ?, name_hi = ?, slug = ?, description = ?, description_hi = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(updatedName, updatedNameHi, updatedSlug, updatedDesc, updatedDescHi, updatedSort, categoryId).run();

    const updated = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first();

    return jsonResponse({ success: true, data: updated }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to update category.');
  }
}

export async function onRequestDelete(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const categoryId = context.params?.id;
  if (!categoryId || typeof categoryId !== 'string') {
    return errorResponse('Category ID is required.', 400, 'BAD_REQUEST');
  }

  try {
    const db = getDatabase(context);

    const existing = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(categoryId).first();
    if (!existing) {
      return errorResponse('Category not found.', 404, 'NOT_FOUND');
    }

    // Safety check: Prevent deletion of categories that have products referencing them
    const productCountResult = await db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').bind(categoryId).first();
    const count = productCountResult?.count || 0;
    if (count > 0) {
      return errorResponse(
        `Cannot delete category because it is referenced by ${count} product(s). Reassign or delete products first.`,
        409,
        'CATEGORY_IN_USE'
      );
    }

    await db.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();

    return jsonResponse({ success: true, message: 'Category deleted successfully.' }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to delete category.');
  }
}
