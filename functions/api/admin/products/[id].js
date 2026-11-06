/**
 * Admin Product Detail API: Get (GET), Update (PUT), and Delete (DELETE) Product
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { validateProductInput } from '../../../_shared/product-validation.js';
import { deleteR2Object } from '../../../_shared/r2.js';

export async function onRequestGet(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const productId = context.params?.id;
  if (!productId || typeof productId !== 'string') {
    return errorResponse('Product ID is required.', 400, 'BAD_REQUEST');
  }

  try {
    const db = getDatabase(context);

    // Support lookup by either ID or slug for convenience
    const product = await db.prepare(`
      SELECT p.*, c.name as category_name, c.name_hi as category_name_hi, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? OR p.slug = ?
    `).bind(productId, productId).first();

    if (!product) {
      return errorResponse('Product not found.', 404, 'NOT_FOUND');
    }

    const [variantsResult, imagesResult] = await Promise.all([
      db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC').bind(product.id).all(),
      db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC').bind(product.id).all()
    ]);

    return jsonResponse({
      data: {
        ...product,
        has_variants: Boolean(product.has_variants),
        is_featured: Boolean(product.is_featured),
        category: product.category_id ? {
          id: product.category_id,
          name: product.category_name,
          name_hi: product.category_name_hi,
          slug: product.category_slug
        } : null,
        variants: variantsResult.results || [],
        images: imagesResult.results || []
      }
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to fetch product.');
  }
}

export async function onRequestPut(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const productId = context.params?.id;
  if (!productId || typeof productId !== 'string') {
    return errorResponse('Product ID is required.', 400, 'BAD_REQUEST');
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON in request body.', 400, 'INVALID_JSON');
  }

  const validation = validateProductInput(body, true);
  if (!validation.valid) {
    return errorResponse(validation.error, 400, 'VALIDATION_ERROR');
  }

  const prod = validation.data;

  try {
    const db = getDatabase(context);

    const existing = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    if (!existing) {
      return errorResponse('Product not found.', 404, 'NOT_FOUND');
    }

    // Check slug collision
    if (prod.slug && prod.slug !== existing.slug) {
      const slugCollision = await db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').bind(prod.slug, productId).first();
      if (slugCollision) {
        return errorResponse(`Product slug "${prod.slug}" is already in use by another product.`, 409, 'SLUG_ALREADY_EXISTS');
      }
    }

    // Check category if provided
    if (prod.category_id) {
      const cat = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(prod.category_id).first();
      if (!cat) {
        return errorResponse(`Category "${prod.category_id}" does not exist.`, 400, 'CATEGORY_NOT_FOUND');
      }
    }

    const statements = [];

    const updatedName = prod.name ?? existing.name;
    const updatedNameHi = prod.name_hi ?? existing.name_hi;
    const updatedSlug = prod.slug ?? existing.slug;
    const updatedCatId = prod.category_id ?? existing.category_id;
    const updatedDesc = prod.description !== undefined ? prod.description : existing.description;
    const updatedDescHi = prod.description_hi !== undefined ? prod.description_hi : existing.description_hi;
    const updatedMat = prod.material !== undefined ? prod.material : existing.material;
    const updatedBrand = prod.brand !== undefined ? prod.brand : existing.brand;
    const updatedStatus = prod.status ?? existing.status;
    const updatedFeatured = prod.is_featured !== undefined ? prod.is_featured : existing.is_featured;
    const updatedSort = prod.sort_order ?? existing.sort_order;
    const updatedNotes = prod.notes !== undefined ? prod.notes : existing.notes;
    const updatedSpecs = prod.specifications_json !== undefined ? prod.specifications_json : existing.specifications_json;
    const updatedSchema = prod.variant_attributes_schema_json !== undefined ? prod.variant_attributes_schema_json : existing.variant_attributes_schema_json;

    const hasVariants = Boolean(existing.has_variants);

    if (!hasVariants) {
      const updatedPrice = prod.base_price_paise !== undefined ? prod.base_price_paise : existing.base_price_paise;
      const updatedComparePrice = prod.compare_at_price_paise !== undefined ? prod.compare_at_price_paise : existing.compare_at_price_paise;
      const updatedSku = prod.sku !== undefined ? prod.sku : existing.sku;
      const updatedStock = prod.stock_quantity !== undefined ? prod.stock_quantity : existing.stock_quantity;
      const updatedLowStock = prod.low_stock_threshold !== undefined ? prod.low_stock_threshold : existing.low_stock_threshold;

      // Track stock change in inventory_logs
      if (updatedStock !== existing.stock_quantity) {
        const changeAmount = updatedStock - existing.stock_quantity;
        statements.push(
          db.prepare(`
            INSERT INTO inventory_logs (
              product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
            ) VALUES (?, NULL, ?, ?, ?, 'Stock updated via product edit', ?, CURRENT_TIMESTAMP)
          `).bind(productId, existing.stock_quantity, updatedStock, changeAmount, auth.user.email)
        );
      }

      statements.push(
        db.prepare(`
          UPDATE products SET
            name = ?, name_hi = ?, slug = ?, category_id = ?, description = ?, description_hi = ?,
            material = ?, brand = ?, base_price_paise = ?, compare_at_price_paise = ?,
            sku = ?, stock_quantity = ?, low_stock_threshold = ?, specifications_json = ?,
            status = ?, is_featured = ?, sort_order = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          updatedName, updatedNameHi, updatedSlug, updatedCatId, updatedDesc, updatedDescHi,
          updatedMat, updatedBrand, updatedPrice, updatedComparePrice,
          updatedSku, updatedStock, updatedLowStock, updatedSpecs,
          updatedStatus, updatedFeatured, updatedSort, updatedNotes, productId
        )
      );
    } else {
      // Variable product update
      statements.push(
        db.prepare(`
          UPDATE products SET
            name = ?, name_hi = ?, slug = ?, category_id = ?, description = ?, description_hi = ?,
            material = ?, brand = ?, specifications_json = ?, variant_attributes_schema_json = ?,
            status = ?, is_featured = ?, sort_order = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          updatedName, updatedNameHi, updatedSlug, updatedCatId, updatedDesc, updatedDescHi,
          updatedMat, updatedBrand, updatedSpecs, updatedSchema,
          updatedStatus, updatedFeatured, updatedSort, updatedNotes, productId
        )
      );

      // Handle variant updates if variants array was provided
      if (body.variants && Array.isArray(body.variants)) {
        const existingVariants = (await db.prepare('SELECT * FROM product_variants WHERE product_id = ?').bind(productId).all()).results;
        const existingMap = new Map(existingVariants.map(v => [v.id, v]));

        for (const v of prod.variants) {
          if (v.id && existingMap.has(v.id)) {
            const oldVar = existingMap.get(v.id);

            // Track stock change on variant
            if (v.stock_quantity !== oldVar.stock_quantity) {
              const diff = v.stock_quantity - oldVar.stock_quantity;
              statements.push(
                db.prepare(`
                  INSERT INTO inventory_logs (
                    product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
                  ) VALUES (?, ?, ?, ?, ?, 'Stock updated via variant edit', ?, CURRENT_TIMESTAMP)
                `).bind(productId, v.id, oldVar.stock_quantity, v.stock_quantity, diff, auth.user.email)
              );
            }

            // Note: product_id is NOT updated to preserve immutable trigger trg_variant_product_id_immutable
            statements.push(
              db.prepare(`
                UPDATE product_variants SET
                  sku = ?, title = ?, title_hi = ?, attributes_json = ?,
                  price_paise = ?, compare_at_price_paise = ?, stock_quantity = ?,
                  low_stock_threshold = ?, status = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).bind(
                v.sku, v.title, v.title_hi, v.attributes_json,
                v.price_paise, v.compare_at_price_paise, v.stock_quantity,
                v.low_stock_threshold, v.status, v.sort_order, v.id
              )
            );
          } else {
            // New variant added during product update
            const newVarId = v.id || crypto.randomUUID();
            statements.push(
              db.prepare(`
                INSERT INTO product_variants (
                  id, product_id, sku, title, title_hi, attributes_json,
                  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
                  status, sort_order, created_at, updated_at
                ) VALUES (
                  ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?,
                  ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
              `).bind(
                newVarId, productId, v.sku, v.title, v.title_hi, v.attributes_json,
                v.price_paise, v.compare_at_price_paise, v.stock_quantity,
                v.low_stock_threshold, v.status, v.sort_order
              )
            );

            if (v.stock_quantity > 0) {
              statements.push(
                db.prepare(`
                  INSERT INTO inventory_logs (
                    product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
                  ) VALUES (?, ?, 0, ?, ?, 'Initial stock on new variant added', ?, CURRENT_TIMESTAMP)
                `).bind(productId, newVarId, v.stock_quantity, v.stock_quantity, auth.user.email)
              );
            }
          }
        }
      }
    }

    await db.batch(statements);

    const updatedProduct = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    const updatedVariants = (await db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC').bind(productId).all()).results;

    return jsonResponse({
      success: true,
      data: {
        ...updatedProduct,
        has_variants: Boolean(updatedProduct.has_variants),
        variants: updatedVariants
      }
    }, 200, noCacheHeaders());
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('SKU collision') || msg.includes('idx_products_sku_normalized') || msg.includes('idx_variants_sku_normalized')) {
      return errorResponse('SKU collision: The specified SKU already exists on another product or variant.', 409, 'SKU_COLLISION');
    }
    return handleDbError(err, 'Failed to update product.');
  }
}

export async function onRequestDelete(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const productId = context.params?.id;
  if (!productId || typeof productId !== 'string') {
    return errorResponse('Product ID is required.', 400, 'BAD_REQUEST');
  }

  try {
    const db = getDatabase(context);

    const existing = await db.prepare('SELECT id, name FROM products WHERE id = ?').bind(productId).first();
    if (!existing) {
      return errorResponse('Product not found.', 404, 'NOT_FOUND');
    }

    // 1. Gather all image keys associated with this product (both product_images and pending_uploads)
    const [images, pending] = await Promise.all([
      db.prepare('SELECT image_key FROM product_images WHERE product_id = ?').bind(productId).all(),
      db.prepare('SELECT image_key FROM pending_uploads WHERE product_id = ?').bind(productId).all()
    ]);

    const allKeys = [
      ...(images.results || []).map(r => r.image_key),
      ...(pending.results || []).map(r => r.image_key)
    ];

    // Reference-count safeguard: only delete R2 objects that have NO OTHER references in product_images
    const keysToDelete = [];
    for (const key of allKeys) {
      const otherRef = await db.prepare('SELECT 1 FROM product_images WHERE image_key = ? AND product_id != ?').bind(key, productId).first();
      if (!otherRef) {
        keysToDelete.push(key);
      }
    }

    // 2. Acquire cleanup claims for each key before deleting records to ensure orphan cleanup
    const claimStatements = [];
    const claimToken = crypto.randomUUID();
    for (const key of keysToDelete) {
      claimStatements.push(
        db.prepare(`
          INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
          VALUES (?, ?, datetime('now', '+15 minutes'), 'deleting')
          ON CONFLICT(image_key) DO UPDATE SET
            claim_token = excluded.claim_token,
            lease_expires_at = excluded.lease_expires_at,
            status = 'deleting'
          WHERE cleanup_claims.status != 'tombstone'
        `).bind(key, claimToken)
      );
    }

    if (claimStatements.length > 0) {
      await db.batch(claimStatements);
    }

    // 3. Delete product from database (cascades variants, images, pending uploads)
    await db.prepare('DELETE FROM products WHERE id = ?').bind(productId).run();

    // 4. Asynchronously attempt R2 deletion for the claimed images
    for (const key of keysToDelete) {
      try {
        await deleteR2Object(context.env, key);
        await db.prepare(`
          UPDATE cleanup_claims
          SET status = 'tombstone', claim_token = 'tombstone', lease_expires_at = '9999-12-31 23:59:59'
          WHERE image_key = ? AND claim_token = ?
        `).bind(key, claimToken).run();
      } catch (r2Err) {
        console.error('[R2_DELETE_ERROR]', { key, error: r2Err.message });
        await db.prepare("UPDATE cleanup_claims SET status = 'failed' WHERE image_key = ? AND claim_token = ?").bind(key, claimToken).run();
      }
    }

    return jsonResponse({
      success: true,
      message: `Product "${existing.name}" and associated resources deleted successfully.`
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to delete product.');
  }
}
