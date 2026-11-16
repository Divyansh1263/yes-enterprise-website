/**
 * Categories listing endpoint: GET /api/categories
 * Returns active categories with product counts, sorted by sort_order.
 */

import { jsonResponse, errorResponse, publicCacheHeaders } from '../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../_shared/db.js';

export async function onRequestGet(context) {
  try {
    const db = getDatabase(context);

    // Query categories with live active product counts
    const query = `
      SELECT 
        c.id,
        c.name,
        c.name_hi,
        c.slug,
        c.description,
        c.description_hi,
        c.sort_order,
        COUNT(p.id) as product_count,
        (
          SELECT pi.image_key
          FROM product_images pi
          JOIN products p2 ON pi.product_id = p2.id
          WHERE p2.category_id = c.id AND p2.status = 'active' AND pi.variant_id IS NULL
          ORDER BY p2.sort_order ASC, pi.is_primary DESC, pi.sort_order ASC
          LIMIT 1
        ) as primary_image_key
      FROM categories c
      LEFT JOIN products p 
        ON p.category_id = c.id AND p.status = 'active'
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC;
    `;

    const { results } = await db.prepare(query).all();

    return jsonResponse(
      {
        success: true,
        data: results || []
      },
      200,
      publicCacheHeaders(120, 600)
    );
  } catch (err) {
    return handleDbError(err, 'Failed to retrieve categories.');
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestGet(context);
}

