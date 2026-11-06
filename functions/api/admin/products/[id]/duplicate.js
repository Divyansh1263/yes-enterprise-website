/**
 * Admin Product Duplication API (POST)
 * Clones a product, its variants, and image references into a new draft product.
 * Guarantees unique slug and non-colliding SKUs.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../../_shared/db.js';
import { validateAdminSession } from '../../../../_shared/auth.js';
import { copyR2Object, deleteR2Object } from '../../../../_shared/r2.js';

async function compensateCopiedObjects(env, db, keys) {
  for (const key of keys) {
    try {
      await deleteR2Object(env, key);
    } catch (delErr) {
      console.error('[DUPLICATION_COMPENSATION_DELETE_FAILED]', { key, error: delErr.message });
      try {
        await db.prepare(`
          INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
          VALUES (?, ?, datetime('now'), 'failed')
          ON CONFLICT(image_key) DO UPDATE SET
            status = 'failed',
            lease_expires_at = datetime('now')
        `).bind(key, `orphan_dup_${crypto.randomUUID()}`).run();
      } catch (claimErr) {
        console.error('[DUPLICATION_ORPHAN_CLAIM_FAILED]', { key, error: claimErr.message });
      }
    }
  }
}

export async function onRequestPost(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  const sourceProductId = context.params?.id;
  if (!sourceProductId || typeof sourceProductId !== 'string') {
    return errorResponse('Product ID is required.', 400, 'BAD_REQUEST');
  }

  try {
    const db = getDatabase(context);

    // Fetch original product
    const source = await db.prepare('SELECT * FROM products WHERE id = ?').bind(sourceProductId).first();
    if (!source) {
      return errorResponse('Source product not found.', 404, 'NOT_FOUND');
    }

    // Fetch original variants and images
    const [variantsResult, imagesResult] = await Promise.all([
      db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC').bind(sourceProductId).all(),
      db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC').bind(sourceProductId).all()
    ]);

    const sourceVariants = variantsResult.results || [];
    const sourceImages = imagesResult.results || [];

    // Generate unique slug
    let candidateSlug = `${source.slug}-copy`;
    let counter = 1;
    while (true) {
      const exists = await db.prepare('SELECT id FROM products WHERE slug = ?').bind(candidateSlug).first();
      if (!exists) break;
      counter++;
      candidateSlug = `${source.slug}-copy-${counter}`;
    }

    const newProductId = crypto.randomUUID();
    const newName = `${source.name} (Copy)`;
    const newNameHi = `${source.name_hi} (प्रतिलिपि)`;

    // Handle SKU safely: Append -COPY, check collision, fallback to NULL if collision
    let newSku = null;
    if (source.sku) {
      const trySku = `${source.sku}-COPY`;
      const pSkuExists = await db.prepare('SELECT id FROM products WHERE sku = ?').bind(trySku).first();
      const vSkuExists = await db.prepare('SELECT id FROM product_variants WHERE sku = ?').bind(trySku).first();
      if (!pSkuExists && !vSkuExists) {
        newSku = trySku;
      }
    }

    const statements = [];

    // 1. Insert duplicated product
    statements.push(
      db.prepare(`
        INSERT INTO products (
          id, name, name_hi, slug, category_id, description, description_hi,
          material, brand, has_variants, base_price_paise, compare_at_price_paise,
          sku, stock_quantity, low_stock_threshold, specifications_json,
          variant_attributes_schema_json, status, is_featured, sort_order, notes,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'draft', 0, ?, ?,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).bind(
        newProductId, newName, newNameHi, candidateSlug, source.category_id,
        source.description, source.description_hi, source.material, source.brand,
        source.has_variants, source.base_price_paise, source.compare_at_price_paise,
        newSku, source.stock_quantity, source.low_stock_threshold, source.specifications_json,
        source.variant_attributes_schema_json, source.sort_order,
        `Duplicated from product ${source.id} (${source.slug})`
      )
    );

    // Initial stock log if simple product has stock
    if (!source.has_variants && source.stock_quantity > 0) {
      statements.push(
        db.prepare(`
          INSERT INTO inventory_logs (
            product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
          ) VALUES (?, NULL, 0, ?, ?, 'Initial stock on product duplication', ?, CURRENT_TIMESTAMP)
        `).bind(newProductId, source.stock_quantity, source.stock_quantity, auth.user.email)
      );
    }

    // 2. Clone variants and map oldVariantId -> newVariantId
    const variantIdMap = new Map();
    for (const v of sourceVariants) {
      const newVarId = crypto.randomUUID();
      variantIdMap.set(v.id, newVarId);

      let newVarSku = null;
      if (v.sku) {
        const tryVarSku = `${v.sku}-COPY`;
        const pSkuExists = await db.prepare('SELECT id FROM products WHERE sku = ?').bind(tryVarSku).first();
        const vSkuExists = await db.prepare('SELECT id FROM product_variants WHERE sku = ?').bind(tryVarSku).first();
        if (!pSkuExists && !vSkuExists) {
          newVarSku = tryVarSku;
        }
      }

      statements.push(
        db.prepare(`
          INSERT INTO product_variants (
            id, product_id, sku, title, title_hi, attributes_json,
            price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
            status, sort_order, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `).bind(
          newVarId, newProductId, newVarSku, `${v.title} (Copy)`, `${v.title_hi} (प्रतिलिपि)`,
          v.attributes_json, v.price_paise, v.compare_at_price_paise, v.stock_quantity,
          v.low_stock_threshold, v.sort_order
        )
      );

      if (v.stock_quantity > 0) {
        statements.push(
          db.prepare(`
            INSERT INTO inventory_logs (
              product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by, created_at
            ) VALUES (?, ?, 0, ?, ?, 'Initial stock on variant duplication', ?, CURRENT_TIMESTAMP)
          `).bind(newProductId, newVarId, v.stock_quantity, v.stock_quantity, auth.user.email)
        );
      }
    }

    // 3. Clone images: copy to unique R2 keys with strict tracking and compensation
    const copiedNewKeys = [];

    try {
      for (const img of sourceImages) {
        const newImgId = crypto.randomUUID();
        const mappedVariantId = img.variant_id ? (variantIdMap.get(img.variant_id) || null) : null;
        const ext = img.image_key.split('.').pop() || 'jpg';
        const newImageKey = `products/${crypto.randomUUID()}.${ext}`;

        // Copy underlying R2 object; fail fast and trigger compensation if any copy fails
        await copyR2Object(context.env, img.image_key, newImageKey);
        copiedNewKeys.push(newImageKey);

        statements.push(
          db.prepare(`
            INSERT INTO product_images (
              id, product_id, variant_id, image_key, alt_text, alt_text_hi,
              mime_type, file_size_bytes, width, height, is_primary, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(
            newImgId, newProductId, mappedVariantId, newImageKey, img.alt_text, img.alt_text_hi,
            img.mime_type, img.file_size_bytes, img.width, img.height, img.is_primary, img.sort_order
          )
        );
      }

      // Atomic D1 execution
      await db.batch(statements);
    } catch (copyOrBatchErr) {
      console.error('[PRODUCT_DUPLICATION_ABORTED]', copyOrBatchErr.message);
      // Safe compensation: clean up any newly created copies
      if (copiedNewKeys.length > 0) {
        await compensateCopiedObjects(context.env, db, copiedNewKeys);
      }
      return handleDbError(copyOrBatchErr, 'Failed to duplicate product images or database records.');
    }

    const duplicatedProduct = await db.prepare('SELECT * FROM products WHERE id = ?').bind(newProductId).first();
    const duplicatedVariants = (await db.prepare('SELECT * FROM product_variants WHERE product_id = ?').bind(newProductId).all()).results;

    return jsonResponse({
      success: true,
      data: {
        ...duplicatedProduct,
        variants: duplicatedVariants
      }
    }, 201, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to duplicate product.');
  }
}
