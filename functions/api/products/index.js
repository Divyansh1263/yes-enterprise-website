/**
 * Products listing endpoint: GET /api/products
 * Returns active catalogue products with category details, primary image, and pagination.
 */

import { jsonResponse, errorResponse, publicCacheHeaders } from '../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../_shared/db.js';
import { parsePagination, sanitizeSearchQuery } from '../../_shared/validation.js';

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);

    // 1. Validate pagination parameters
    const { limit, offset, error: paginationError } = parsePagination(url, 20, 50);
    if (paginationError) {
      return errorResponse(paginationError, 400, 'INVALID_PAGINATION');
    }

    // 2. Parse query filters
    const categoryParam = url.searchParams.get('category');
    const featuredParam = url.searchParams.get('featured');
    const searchParam = sanitizeSearchQuery(url.searchParams.get('search'));

    const whereClauses = ["p.status = 'active'"];
    const params = [];

    // Category filter: support category ID or category slug
    if (categoryParam) {
      whereClauses.push('(c.slug = ? OR c.id = ?)');
      params.push(categoryParam.trim(), categoryParam.trim());
    }

    // Featured filter
    if (featuredParam === 'true' || featuredParam === '1') {
      whereClauses.push('p.is_featured = 1');
    }

    // Keyword search filter (name, description, or SKU)
    if (searchParam) {
      whereClauses.push('(p.name LIKE ? OR p.name_hi LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      const searchPattern = `%${searchParam}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.join(' AND ');

    const db = getDatabase(context);

    // 3. Count total matching records for pagination metadata
    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${whereSql};
    `;
    const countResult = await db.prepare(countSql).bind(...params).first();
    const total = countResult?.total || 0;

    // 4. Retrieve paginated product rows with primary image and counts
    const dataSql = `
      SELECT 
        p.id,
        p.name,
        p.name_hi,
        p.slug,
        p.category_id,
        c.name as category_name,
        c.name_hi as category_name_hi,
        c.slug as category_slug,
        p.description,
        p.description_hi,
        p.material,
        p.brand,
        p.has_variants,
        p.base_price_paise,
        p.compare_at_price_paise,
        p.expected_price_per_100_paise,
        p.min_order_quantity,
        p.sku,
        p.stock_quantity,
        p.is_featured,
        p.sort_order,
        (
          SELECT image_key 
          FROM product_images 
          WHERE product_id = p.id 
          ORDER BY is_primary DESC, (variant_id IS NULL) DESC, sort_order ASC 
          LIMIT 1
        ) as primary_image_key,
        (
          SELECT COUNT(*) 
          FROM product_variants 
          WHERE product_id = p.id AND status = 'active'
        ) as variants_count,
        (
          SELECT MIN(price_paise)
          FROM product_variants
          WHERE product_id = p.id AND status = 'active'
        ) as min_variant_price_paise,
        (
          SELECT MAX(price_paise)
          FROM product_variants
          WHERE product_id = p.id AND status = 'active'
        ) as max_variant_price_paise,
        (
          SELECT MIN(expected_price_per_100_paise)
          FROM product_variants
          WHERE product_id = p.id AND status = 'active' AND expected_price_per_100_paise IS NOT NULL
        ) as min_variant_expected_price_100_paise,
        (
          SELECT GROUP_CONCAT(title, ', ')
          FROM (
            SELECT title
            FROM product_variants
            WHERE product_id = p.id AND status = 'active'
            ORDER BY sort_order ASC, price_paise ASC, id ASC
          )
        ) as variant_capacities_summary,
        (
          SELECT COUNT(*) 
          FROM product_images 
          WHERE product_id = p.id
        ) as images_count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${whereSql}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT ? OFFSET ?;
    `;

    const { results } = await db.prepare(dataSql).bind(...params, limit, offset).all();

    // Map rows into clean structured objects
    const formattedProducts = (results || []).map(row => {
      const isVariable = Boolean(row.has_variants) && row.variants_count > 0;
      const capacitiesSummary = isVariable ? (row.variant_capacities_summary || '') : '';
      const availableCapacities = capacitiesSummary
        ? capacitiesSummary.split(', ').map(s => s.trim()).filter(Boolean)
        : [];

      return {
        id: row.id,
        name: row.name,
        name_hi: row.name_hi,
        slug: row.slug,
        category: {
          id: row.category_id,
          name: row.category_name,
          name_hi: row.category_name_hi,
          slug: row.category_slug
        },
        description: row.description,
        description_hi: row.description_hi,
        material: row.material,
        brand: row.brand,
        has_variants: Boolean(row.has_variants),
        base_price_paise: row.base_price_paise,
        compare_at_price_paise: row.compare_at_price_paise,
        expected_price_per_100_paise: row.expected_price_per_100_paise ?? null,
        min_order_quantity: row.min_order_quantity ?? null,
        min_variant_price_paise: isVariable ? (row.min_variant_price_paise ?? null) : null,
        max_variant_price_paise: isVariable ? (row.max_variant_price_paise ?? null) : null,
        min_variant_expected_price_100_paise: isVariable ? (row.min_variant_expected_price_100_paise ?? null) : null,
        variant_capacities_summary: capacitiesSummary,
        available_capacities: availableCapacities,
        sku: row.sku,
        stock_quantity: row.stock_quantity,
        is_featured: Boolean(row.is_featured),
        sort_order: row.sort_order,
        primary_image_key: row.primary_image_key || null,
        variants_count: row.variants_count,
        images_count: row.images_count
      };
    });

    return jsonResponse(
      {
        success: true,
        data: formattedProducts,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total
        }
      },
      200,
      publicCacheHeaders(60, 300)
    );
  } catch (err) {
    return handleDbError(err, 'Failed to retrieve products catalogue.');
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestGet(context);
}

