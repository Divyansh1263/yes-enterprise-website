/**
 * Validation rules and normalization helpers for products, variants, categories and SKUs.
 */

import { validateSlug } from './validation.js';

const VALID_STATUSES = ['active', 'draft', 'archived'];
const VALID_VARIANT_STATUSES = ['active', 'archived'];

/**
 * Normalizes SKU string per database constraints: UPPER(TRIM(sku)).
 *
 * @param {any} sku
 * @returns {string | null}
 */
export function normalizeSku(sku) {
  if (sku === null || sku === undefined) return null;
  if (typeof sku !== 'string') return null;
  const trimmed = sku.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates SKU format.
 *
 * @param {any} sku
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSku(sku) {
  if (sku === null || sku === undefined || sku === '') {
    return { valid: true };
  }
  if (typeof sku !== 'string') {
    return { valid: false, error: 'SKU must be a string.' };
  }
  if (sku !== sku.trim() || sku !== sku.toUpperCase()) {
    return { valid: false, error: 'SKU must be uppercase and without leading/trailing whitespace.' };
  }
  if (sku.length > 50) {
    return { valid: false, error: 'SKU cannot exceed 50 characters.' };
  }
  return { valid: true };
}

/**
 * Validates category creation or update input.
 *
 * @param {Record<string, any>} body
 * @param {boolean} [isUpdate=false]
 * @returns {{ valid: boolean, error?: string, data?: any }}
 */
export function validateCategoryInput(body, isUpdate = false) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid JSON request body.' };
  }

  const { name, name_hi, slug, description, description_hi, sort_order } = body;

  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { valid: false, error: 'Category name (English) is required.' };
    }
    if (name.trim().length > 100) {
      return { valid: false, error: 'Category name cannot exceed 100 characters.' };
    }
  }

  if (!isUpdate || name_hi !== undefined) {
    if (!name_hi || typeof name_hi !== 'string' || name_hi.trim().length === 0) {
      return { valid: false, error: 'Category Hindi name (name_hi) is required.' };
    }
    if (name_hi.trim().length > 100) {
      return { valid: false, error: 'Category Hindi name cannot exceed 100 characters.' };
    }
  }

  if (!isUpdate || slug !== undefined) {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.valid) {
      return { valid: false, error: slugCheck.error };
    }
  }

  let parsedSortOrder = 0;
  if (sort_order !== undefined && sort_order !== null) {
    if (!Number.isInteger(sort_order) || sort_order < 0) {
      return { valid: false, error: 'sort_order must be a non-negative integer.' };
    }
    parsedSortOrder = sort_order;
  }

  return {
    valid: true,
    data: {
      name: name?.trim(),
      name_hi: name_hi?.trim(),
      slug: slug?.trim().toLowerCase(),
      description: typeof description === 'string' ? description.trim() : null,
      description_hi: typeof description_hi === 'string' ? description_hi.trim() : null,
      sort_order: parsedSortOrder
    }
  };
}

/**
 * Validates product variant input.
 *
 * @param {Record<string, any>} variant
 * @returns {{ valid: boolean, error?: string, data?: any }}
 */
export function validateVariantInput(variant) {
  if (!variant || typeof variant !== 'object') {
    return { valid: false, error: 'Variant must be an object.' };
  }

  const {
    id,
    sku,
    title,
    title_hi,
    attributes,
    price_paise,
    compare_at_price_paise,
    stock_quantity,
    low_stock_threshold,
    status,
    sort_order
  } = variant;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { valid: false, error: 'Variant title (English) is required.' };
  }
  if (!title_hi || typeof title_hi !== 'string' || title_hi.trim().length === 0) {
    return { valid: false, error: 'Variant Hindi title (title_hi) is required.' };
  }

  const normalizedSku = normalizeSku(sku);
  if (sku !== undefined && sku !== null) {
    const skuCheck = validateSku(normalizedSku);
    if (!skuCheck.valid) {
      return { valid: false, error: `Variant "${title}": ${skuCheck.error}` };
    }
  }

  if (price_paise !== undefined && price_paise !== null) {
    if (!Number.isInteger(price_paise) || price_paise < 0) {
      return { valid: false, error: `Variant "${title}": price_paise must be a non-negative integer or null.` };
    }
  }

  if (compare_at_price_paise !== undefined && compare_at_price_paise !== null) {
    if (!Number.isInteger(compare_at_price_paise) || compare_at_price_paise < 0) {
      return { valid: false, error: `Variant "${title}": compare_at_price_paise must be a non-negative integer or null.` };
    }
  }

  let stock = 0;
  if (stock_quantity !== undefined && stock_quantity !== null) {
    if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
      return { valid: false, error: `Variant "${title}": stock_quantity must be a non-negative integer.` };
    }
    stock = stock_quantity;
  }

  let lowStock = 5;
  if (low_stock_threshold !== undefined && low_stock_threshold !== null) {
    if (!Number.isInteger(low_stock_threshold) || low_stock_threshold < 0) {
      return { valid: false, error: `Variant "${title}": low_stock_threshold must be a non-negative integer.` };
    }
    lowStock = low_stock_threshold;
  }

  let variantStatus = 'active';
  if (status !== undefined) {
    if (!VALID_VARIANT_STATUSES.includes(status)) {
      return { valid: false, error: `Variant "${title}": status must be "active" or "archived".` };
    }
    variantStatus = status;
  }

  let sort = 0;
  if (sort_order !== undefined && sort_order !== null) {
    if (!Number.isInteger(sort_order) || sort_order < 0) {
      return { valid: false, error: `Variant "${title}": sort_order must be a non-negative integer.` };
    }
    sort = sort_order;
  }

  let attrsJson = '{}';
  if (attributes !== undefined && attributes !== null) {
    if (typeof attributes === 'object') {
      attrsJson = JSON.stringify(attributes);
    } else if (typeof attributes === 'string') {
      attrsJson = attributes;
    }
  }

  return {
    valid: true,
    data: {
      id: id || null,
      sku: normalizedSku,
      title: title.trim(),
      title_hi: title_hi.trim(),
      attributes_json: attrsJson,
      price_paise: price_paise ?? null,
      compare_at_price_paise: compare_at_price_paise ?? null,
      stock_quantity: stock,
      low_stock_threshold: lowStock,
      status: variantStatus,
      sort_order: sort
    }
  };
}

/**
 * Validates product creation or update input.
 *
 * @param {Record<string, any>} body
 * @param {boolean} [isUpdate=false]
 * @returns {{ valid: boolean, error?: string, data?: any }}
 */
export function validateProductInput(body, isUpdate = false) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid JSON request body.' };
  }

  const {
    name,
    name_hi,
    slug,
    category_id,
    description,
    description_hi,
    material,
    brand,
    has_variants,
    base_price_paise,
    compare_at_price_paise,
    sku,
    stock_quantity,
    low_stock_threshold,
    specifications,
    variant_attributes_schema,
    status,
    is_featured,
    sort_order,
    notes,
    variants
  } = body;

  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { valid: false, error: 'Product name (English) is required.' };
    }
    if (name.trim().length > 200) {
      return { valid: false, error: 'Product name cannot exceed 200 characters.' };
    }
  }

  if (!isUpdate || name_hi !== undefined) {
    if (!name_hi || typeof name_hi !== 'string' || name_hi.trim().length === 0) {
      return { valid: false, error: 'Product Hindi name (name_hi) is required.' };
    }
    if (name_hi.trim().length > 200) {
      return { valid: false, error: 'Product Hindi name cannot exceed 200 characters.' };
    }
  }

  if (!isUpdate || slug !== undefined) {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.valid) {
      return { valid: false, error: slugCheck.error };
    }
  }

  if (!isUpdate || category_id !== undefined) {
    if (!category_id || typeof category_id !== 'string' || category_id.trim().length === 0) {
      return { valid: false, error: 'category_id is required.' };
    }
  }

  let prodStatus = 'active';
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return { valid: false, error: 'status must be "active", "draft", or "archived".' };
    }
    prodStatus = status;
  }

  const hasVars = Boolean(has_variants);

  // Simple Product Price & Stock Validation
  let normSku = null;
  if (!hasVars) {
    if (sku !== undefined && sku !== null) {
      normSku = normalizeSku(sku);
      const skuCheck = validateSku(normSku);
      if (!skuCheck.valid) {
        return { valid: false, error: skuCheck.error };
      }
    }

    if (base_price_paise !== undefined && base_price_paise !== null) {
      if (!Number.isInteger(base_price_paise) || base_price_paise < 0) {
        return { valid: false, error: 'base_price_paise must be a non-negative integer or null.' };
      }
    }

    if (compare_at_price_paise !== undefined && compare_at_price_paise !== null) {
      if (!Number.isInteger(compare_at_price_paise) || compare_at_price_paise < 0) {
        return { valid: false, error: 'compare_at_price_paise must be a non-negative integer or null.' };
      }
    }

    if (stock_quantity !== undefined && stock_quantity !== null) {
      if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
        return { valid: false, error: 'stock_quantity must be a non-negative integer.' };
      }
    }

    if (low_stock_threshold !== undefined && low_stock_threshold !== null) {
      if (!Number.isInteger(low_stock_threshold) || low_stock_threshold < 0) {
        return { valid: false, error: 'low_stock_threshold must be a non-negative integer.' };
      }
    }
  }

  // Variable Product Validation
  const validatedVariants = [];
  if (Array.isArray(variants)) {
    if (!isUpdate && hasVars && variants.length === 0) {
      return { valid: false, error: 'Variable products must have at least one variant.' };
    }

    // Check for duplicate SKUs within the incoming variants list
    const seenSkus = new Set();
    for (const v of variants) {
      const vCheck = validateVariantInput(v);
      if (!vCheck.valid) {
        return { valid: false, error: vCheck.error };
      }
      if (vCheck.data.sku) {
        if (seenSkus.has(vCheck.data.sku)) {
          return { valid: false, error: `Duplicate SKU "${vCheck.data.sku}" found across variants.` };
        }
        seenSkus.add(vCheck.data.sku);
      }
      validatedVariants.push(vCheck.data);
    }
  } else if (!isUpdate && hasVars) {
    return { valid: false, error: 'Variable products must have at least one variant.' };
  }

  // JSON fields handling
  let specsJson = '{}';
  if (specifications !== undefined && specifications !== null) {
    if (typeof specifications === 'object') {
      specsJson = JSON.stringify(specifications);
    } else if (typeof specifications === 'string') {
      try {
        JSON.parse(specifications);
        specsJson = specifications;
      } catch {
        return { valid: false, error: 'specifications must be a valid JSON object.' };
      }
    }
  }

  let schemaJson = '[]';
  if (variant_attributes_schema !== undefined && variant_attributes_schema !== null) {
    if (Array.isArray(variant_attributes_schema)) {
      schemaJson = JSON.stringify(variant_attributes_schema);
    } else if (typeof variant_attributes_schema === 'string') {
      try {
        JSON.parse(variant_attributes_schema);
        schemaJson = variant_attributes_schema;
      } catch {
        return { valid: false, error: 'variant_attributes_schema must be a valid JSON array.' };
      }
    }
  }

  return {
    valid: true,
    data: {
      name: name?.trim(),
      name_hi: name_hi?.trim(),
      slug: slug?.trim().toLowerCase(),
      category_id: category_id?.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      description_hi: typeof description_hi === 'string' ? description_hi.trim() : null,
      material: typeof material === 'string' ? material.trim() : null,
      brand: typeof brand === 'string' ? brand.trim() : 'YES ENTERPRISES',
      has_variants: hasVars ? 1 : 0,
      base_price_paise: hasVars ? null : (base_price_paise ?? null),
      compare_at_price_paise: hasVars ? null : (compare_at_price_paise ?? null),
      sku: hasVars ? null : normSku,
      stock_quantity: hasVars ? 0 : (stock_quantity ?? 0),
      low_stock_threshold: hasVars ? 5 : (low_stock_threshold ?? 5),
      specifications_json: specsJson,
      variant_attributes_schema_json: schemaJson,
      status: prodStatus,
      is_featured: is_featured ? 1 : 0,
      sort_order: Number.isInteger(sort_order) && sort_order >= 0 ? sort_order : 0,
      notes: typeof notes === 'string' ? notes.trim() : null,
      variants: validatedVariants
    }
  };
}
