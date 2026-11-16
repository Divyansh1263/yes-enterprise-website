/**
 * Admin Products API: List Products (GET) and Create Product (POST)
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { parsePagination, sanitizeSearchQuery } from '../../../_shared/validation.js';
import { validateProductInput } from '../../../_shared/product-validation.js';

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

  const statusParam = url.searchParams.get('status');
  const categoryIdParam = url.searchParams.get('category_id');
  const typeParam = url.searchParams.get('type');
  const searchQuery = sanitizeSearchQuery(url.searchParams.get('search'));

  try {
    const db = getDatabase(context);

    const conditions = [];
    const params = [];

    // Filter by status (default is 'all' for admin)
    if (statusParam && statusParam !== 'all') {
      if (!['active', 'draft', 'archived'].includes(statusParam)) {
        return errorResponse('Invalid status parameter. Must be "all", "active", "draft", or "archived".', 400, 'INVALID_FILTER');
      }
      conditions.push('p.status = ?');
      params.push(statusParam);
    }

    // Filter by product structure type
    if (typeParam === 'variable') {
      conditions.push('p.has_variants = 1');
    } else if (typeParam === 'simple' || typeParam === 'standalone') {
      conditions.push('p.has_variants = 0');
    }

    // Filter by category_id
    if (categoryIdParam && categoryIdParam !== 'all') {
      conditions.push('p.category_id = ?');
      params.push(categoryIdParam);
    }

    // Search query filter
    if (searchQuery) {
      conditions.push('(p.name LIKE ? OR p.name_hi LIKE ? OR p.slug LIKE ? OR p.sku LIKE ?)');
      const term = `%${searchQuery}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total rows
    const countSql = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
    const countResult = await db.prepare(countSql).bind(...params).first();
    const total = countResult?.total || 0;

    // Fetch products with admin metadata
    const querySql = `
      SELECT
        p.id,
        p.name,
        p.name_hi,
        p.slug,
        p.category_id,
        p.has_variants,
        p.base_price_paise,
        p.compare_at_price_paise,
        p.expected_price_per_100_paise,
        p.min_order_quantity,
        p.sku,
        p.stock_quantity,
        p.low_stock_threshold,
        p.status,
        p.is_featured,
        p.sort_order,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        c.name_hi as category_name_hi,
        c.slug as category_slug,
        (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active') as variant_count,
        (SELECT COALESCE(SUM(pv.stock_quantity), 0) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active') as variants_stock,
        (SELECT MIN(pv.price_paise) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active') as min_variant_price_paise,
        (SELECT MAX(pv.price_paise) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active') as max_variant_price_paise,
        (SELECT MIN(pv.expected_price_per_100_paise) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active' AND pv.expected_price_per_100_paise IS NOT NULL) as min_variant_expected_price_100_paise,
        (SELECT MAX(pv.expected_price_per_100_paise) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active' AND pv.expected_price_per_100_paise IS NOT NULL) as max_variant_expected_price_100_paise,
        (
          SELECT GROUP_CONCAT(title, ', ')
          FROM (
            SELECT title
            FROM product_variants
            WHERE product_id = p.id AND status = 'active'
            ORDER BY sort_order ASC, price_paise ASC, id ASC
          )
        ) as variant_capacities_summary,
        (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) as image_count,
        (
          SELECT pi.image_key FROM product_images pi
          WHERE pi.product_id = p.id AND pi.variant_id IS NULL
          ORDER BY pi.is_primary DESC, pi.sort_order ASC
          LIMIT 1
        ) as primary_image_key
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, pagination.limit, pagination.offset];
    const { results } = await db.prepare(querySql).bind(...queryParams).all();

    const formatted = results.map(row => {
      const hasVariants = Boolean(row.has_variants);
      return {
        id: row.id,
        name: row.name,
        name_hi: row.name_hi,
        slug: row.slug,
        category_id: row.category_id,
        category: row.category_id ? {
          id: row.category_id,
          name: row.category_name,
          name_hi: row.category_name_hi,
          slug: row.category_slug
        } : null,
        has_variants: hasVariants,
        price_paise: hasVariants ? row.min_variant_price_paise : row.base_price_paise,
        base_price_paise: hasVariants ? row.min_variant_price_paise : row.base_price_paise,
        compare_at_price_paise: hasVariants ? null : row.compare_at_price_paise,
        expected_price_per_100_paise: hasVariants ? row.min_variant_expected_price_100_paise : row.expected_price_per_100_paise,
        min_variant_price_paise: row.min_variant_price_paise ?? null,
        max_variant_price_paise: row.max_variant_price_paise ?? null,
        min_variant_expected_price_100_paise: row.min_variant_expected_price_100_paise ?? null,
        max_variant_expected_price_100_paise: row.max_variant_expected_price_100_paise ?? null,
        variant_capacities_summary: row.variant_capacities_summary || null,
        min_order_quantity: row.min_order_quantity ?? null,
        sku: hasVariants ? null : row.sku,
        stock_quantity: hasVariants ? row.variants_stock : row.stock_quantity,
        variant_count: row.variant_count,
        low_stock_threshold: row.low_stock_threshold,
        status: row.status,
        is_featured: Boolean(row.is_featured),
        sort_order: row.sort_order,
        image_count: row.image_count || 0,
        primary_image_key: row.primary_image_key,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return jsonResponse({
      data: formatted,
      pagination: {
        total,
        limit: pagination.limit,
        offset: pagination.offset,
        has_more: pagination.offset + results.length < total
      }
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to fetch admin products.');
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

  const validation = validateProductInput(body, false);
  if (!validation.valid) {
    return errorResponse(validation.error, 400, 'VALIDATION_ERROR');
  }

  const prod = validation.data;

  try {
    const db = getDatabase(context);

    // Verify category exists
    const category = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(prod.category_id).first();
    if (!category) {
      return errorResponse(`Category "${prod.category_id}" does not exist.`, 400, 'CATEGORY_NOT_FOUND');
    }

    // Verify slug uniqueness & auto-resolve collision safely (e.g. -2, -3)
    let candidateSlug = prod.slug;
    let slugExists = await db.prepare('SELECT id FROM products WHERE slug = ?').bind(candidateSlug).first();
    if (slugExists) {
      let counter = 2;
      while (slugExists) {
        candidateSlug = `${prod.slug}-${counter}`;
        slugExists = await db.prepare('SELECT id FROM products WHERE slug = ?').bind(candidateSlug).first();
        counter++;
      }
      prod.slug = candidateSlug;
    }

    const productId = crypto.randomUUID();
    const statements = [];

    // 1. Insert product statement
    statements.push(
      db.prepare(`
        INSERT INTO products (
          id, name, name_hi, slug, category_id, description, description_hi,
          material, brand, has_variants, base_price_paise, compare_at_price_paise,
          expected_price_per_100_paise, min_order_quantity,
          sku, stock_quantity, low_stock_threshold, specifications_json,
          variant_attributes_schema_json, status, is_featured, sort_order, notes,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).bind(
        productId, prod.name, prod.name_hi, prod.slug, prod.category_id, prod.description, prod.description_hi,
        prod.material, prod.brand, prod.has_variants, prod.base_price_paise, prod.compare_at_price_paise,
        prod.expected_price_per_100_paise, prod.min_order_quantity,
        prod.sku, prod.stock_quantity, prod.low_stock_threshold, prod.specifications_json,
        prod.variant_attributes_schema_json, prod.status, prod.is_featured, prod.sort_order, prod.notes
      )
    );

    // 2. Inventory log for simple product
    if (prod.has_variants === 0 && prod.stock_quantity > 0) {
      statements.push(
        db.prepare(`
          INSERT INTO inventory_logs (
            product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
          ) VALUES (?, NULL, 0, ?, ?, 'Initial stock on product creation', ?, CURRENT_TIMESTAMP)
        `).bind(productId, prod.stock_quantity, prod.stock_quantity, auth.user.email)
      );
    }

    // 3. Variant inserts and inventory logs for variable products
    if (prod.has_variants === 1) {
      for (const v of prod.variants) {
        const variantId = v.id || crypto.randomUUID();
        statements.push(
          db.prepare(`
            INSERT INTO product_variants (
              id, product_id, sku, title, title_hi, attributes_json,
              price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
              stock_quantity, low_stock_threshold, status, sort_order, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
          `).bind(
            variantId, productId, v.sku, v.title, v.title_hi, v.attributes_json,
            v.price_paise, v.compare_at_price_paise, v.expected_price_per_100_paise ?? null, v.min_order_quantity ?? null,
            v.stock_quantity, v.low_stock_threshold, v.status || 'active', v.sort_order
          )
        );

        if (v.stock_quantity > 0) {
          statements.push(
            db.prepare(`
              INSERT INTO inventory_logs (
                product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
              ) VALUES (?, ?, 0, ?, ?, 'Initial stock on variant creation', ?, CURRENT_TIMESTAMP)
            `).bind(productId, variantId, v.stock_quantity, v.stock_quantity, auth.user.email)
          );
        }
      }
    }

    // Atomic execution of product, variants, and inventory logs
    await db.batch(statements);

    // Fetch created product with variants
    const createdProduct = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    const createdVariants = prod.has_variants === 1
      ? (await db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC').bind(productId).all()).results
      : [];

    return jsonResponse({
      success: true,
      data: {
        ...createdProduct,
        variants: createdVariants
      }
    }, 201, noCacheHeaders());
  } catch (err) {
    // Check for trigger/constraint violation messages
    const msg = err?.message || '';
    if (msg.includes('SKU collision') || msg.includes('idx_products_sku_normalized') || msg.includes('idx_variants_sku_normalized')) {
      return errorResponse('SKU collision: The specified SKU already exists on another product or variant.', 409, 'SKU_COLLISION');
    }
    return handleDbError(err, 'Failed to create product.');
  }
}
