/**
 * Product detail endpoint: GET /api/products/:slug
 * Retrieves a single active product by slug, including full category, active variants, and images.
 */

import { jsonResponse, errorResponse, publicCacheHeaders } from '../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../_shared/db.js';
import { validateSlug } from '../../_shared/validation.js';

function parseJsonSafe(jsonString, fallback) {
  if (!jsonString || typeof jsonString !== 'string') return fallback;
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

export async function onRequestGet(context) {
  try {
    const slug = context.params?.slug;

    // Validate slug format
    const { valid, error } = validateSlug(slug);
    if (!valid) {
      return errorResponse(error || 'Invalid product slug.', 400, 'INVALID_SLUG');
    }

    const db = getDatabase(context);

    // 1. Fetch active product and joined category details
    const productSql = `
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
        p.low_stock_threshold,
        p.specifications_json,
        p.variant_attributes_schema_json,
        p.status,
        p.is_featured,
        p.sort_order,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.status = 'active'
      LIMIT 1;
    `;

    const product = await db.prepare(productSql).bind(slug).first();

    if (!product) {
      return errorResponse(`Product with slug '${slug}' not found.`, 404, 'PRODUCT_NOT_FOUND');
    }

    // 2. Fetch active variants and images in parallel
    const [variantsResult, imagesResult] = await Promise.all([
      db.prepare(`
        SELECT 
          id,
          product_id,
          sku,
          title,
          title_hi,
          attributes_json,
          price_paise,
          compare_at_price_paise,
          expected_price_per_100_paise,
          min_order_quantity,
          stock_quantity,
          low_stock_threshold,
          status,
          sort_order
        FROM product_variants
        WHERE product_id = ? AND status = 'active'
        ORDER BY sort_order ASC, price_paise ASC, id ASC;
      `).bind(product.id).all(),

      db.prepare(`
        SELECT 
          id,
          product_id,
          variant_id,
          image_key,
          alt_text,
          alt_text_hi,
          mime_type,
          file_size_bytes,
          width,
          height,
          is_primary,
          sort_order
        FROM product_images
        WHERE product_id = ?
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC;
      `).bind(product.id).all()
    ]);

    const formattedVariants = (variantsResult?.results || []).map(v => ({
      id: v.id,
      product_id: v.product_id,
      sku: v.sku,
      title: v.title,
      title_hi: v.title_hi,
      attributes: parseJsonSafe(v.attributes_json, {}),
      price_paise: v.price_paise,
      compare_at_price_paise: v.compare_at_price_paise,
      expected_price_per_100_paise: v.expected_price_per_100_paise ?? null,
      min_order_quantity: v.min_order_quantity ?? null,
      stock_quantity: v.stock_quantity,
      low_stock_threshold: v.low_stock_threshold,
      status: v.status,
      sort_order: v.sort_order
    }));

    const isVariable = formattedVariants.length > 0;

    const allImages = (imagesResult?.results || []).map(img => ({
      id: img.id,
      product_id: img.product_id,
      variant_id: img.variant_id,
      image_key: img.image_key,
      alt_text: img.alt_text,
      alt_text_hi: img.alt_text_hi,
      mime_type: img.mime_type,
      file_size_bytes: img.file_size_bytes,
      width: img.width,
      height: img.height,
      is_primary: Boolean(img.is_primary),
      sort_order: img.sort_order
    }));

    // If simple product, only expose parent/shared images where variant_id IS NULL
    const formattedImages = isVariable
      ? allImages
      : (allImages.some(img => img.variant_id === null)
          ? allImages.filter(img => img.variant_id === null)
          : allImages);

    const responseData = {
      id: product.id,
      name: product.name,
      name_hi: product.name_hi,
      slug: product.slug,
      category: {
        id: product.category_id,
        name: product.category_name,
        name_hi: product.category_name_hi,
        slug: product.category_slug
      },
      description: product.description,
      description_hi: product.description_hi,
      material: product.material,
      brand: product.brand,
      has_variants: Boolean(product.has_variants),
      base_price_paise: product.base_price_paise,
      compare_at_price_paise: product.compare_at_price_paise,
      expected_price_per_100_paise: product.expected_price_per_100_paise ?? null,
      min_order_quantity: product.min_order_quantity ?? null,
      sku: product.sku,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      specifications: parseJsonSafe(product.specifications_json, {}),
      variant_attributes_schema: parseJsonSafe(product.variant_attributes_schema_json, []),
      is_featured: Boolean(product.is_featured),
      sort_order: product.sort_order,
      variants: formattedVariants,
      images: formattedImages,
      created_at: product.created_at,
      updated_at: product.updated_at
    };

    return jsonResponse(
      {
        success: true,
        data: responseData
      },
      200,
      publicCacheHeaders(60, 300)
    );
  } catch (err) {
    return handleDbError(err, 'Failed to retrieve product details.');
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestGet(context);
}

