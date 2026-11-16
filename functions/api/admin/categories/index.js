/**
 * Admin Categories API: List Categories (GET) and Create Category (POST)
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { validateCategoryInput } from '../../../_shared/product-validation.js';

export async function onRequestGet(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  try {
    const db = getDatabase(context);

    // Retrieve all categories with active and draft counts
    const query = `
      SELECT 
        c.id,
        c.name,
        c.name_hi,
        c.slug,
        c.description,
        c.description_hi,
        c.sort_order,
        c.created_at,
        c.updated_at,
        COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN p.status = 'draft' THEN 1 END) as draft_count,
        COUNT(p.id) as total_count,
        COUNT(CASE WHEN p.status = 'active' THEN 1 END) as product_count,
        CASE WHEN COUNT(CASE WHEN p.status = 'active' THEN 1 END) > 0 THEN 1 ELSE 0 END as is_publicly_visible,
        (
          SELECT pi.image_key
          FROM product_images pi
          JOIN products p2 ON pi.product_id = p2.id
          WHERE p2.category_id = c.id AND pi.variant_id IS NULL
          ORDER BY p2.sort_order ASC, pi.is_primary DESC, pi.sort_order ASC
          LIMIT 1
        ) as primary_image_key
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC;
    `;

    const { results } = await db.prepare(query).all();

    return jsonResponse({
      success: true,
      data: results || []
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to retrieve admin categories.');
  }
}

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

export async function onRequest(context) {
  if (context.request.method === 'GET') {
    return onRequestGet(context);
  }
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
}
