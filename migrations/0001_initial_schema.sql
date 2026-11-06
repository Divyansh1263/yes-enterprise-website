-- =============================================================================
-- YES ENTERPRISES — D1 Relational Schema Migration 0001
-- =============================================================================

-- 1. CATEGORIES TABLE
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    description_hi TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description TEXT,
    description_hi TEXT,
    material TEXT,
    brand TEXT,
    has_variants BOOLEAN NOT NULL DEFAULT 0,
    -- Simple Product Fields (used when has_variants = 0; ignored/NULL when has_variants = 1)
    base_price_paise INTEGER CHECK(base_price_paise IS NULL OR base_price_paise >= 0),
    compare_at_price_paise INTEGER CHECK(compare_at_price_paise IS NULL OR compare_at_price_paise >= 0),
    sku TEXT CHECK(sku IS NULL OR (sku = UPPER(TRIM(sku)) AND LENGTH(sku) > 0)),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK(low_stock_threshold >= 0),
    -- Flexible Product Specifications & Variant Schema (JSON)
    specifications_json TEXT NOT NULL DEFAULT '{}',
    variant_attributes_schema_json TEXT NOT NULL DEFAULT '[]',
    -- Status & Ranking
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'draft', 'archived')),
    is_featured BOOLEAN NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCT VARIANTS TABLE
CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT CHECK(sku IS NULL OR (sku = UPPER(TRIM(sku)) AND LENGTH(sku) > 0)),
    title TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    attributes_json TEXT NOT NULL DEFAULT '{}',
    -- price_paise is NULLABLE for contact-for-pricing options
    price_paise INTEGER CHECK(price_paise IS NULL OR price_paise >= 0),
    compare_at_price_paise INTEGER CHECK(compare_at_price_paise IS NULL OR compare_at_price_paise >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK(low_stock_threshold >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRODUCT IMAGES TABLE
CREATE TABLE product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- ON DELETE CASCADE ensures variant-specific images are removed if variant is deleted
    variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
    image_key TEXT NOT NULL,
    alt_text TEXT,
    alt_text_hi TEXT,
    mime_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK(file_size_bytes > 0),
    width INTEGER CHECK(width IS NULL OR width > 0),
    height INTEGER CHECK(height IS NULL OR height > 0),
    is_primary BOOLEAN NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. PENDING UPLOADS TABLE (Race-Safe Image Upload Tracking)
CREATE TABLE pending_uploads (
    image_key TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. CLEANUP CLAIMS TABLE (Lease-Based Atomic Orphan Cleanup)
CREATE TABLE cleanup_claims (
    image_key TEXT PRIMARY KEY,
    claim_token TEXT NOT NULL,
    lease_expires_at DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'claimed' CHECK(status IN ('claimed', 'failed'))
);

-- 7. INVENTORY LOGS (Preserved on Variant Deletion / Archive)
CREATE TABLE inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
    previous_quantity INTEGER NOT NULL CHECK(previous_quantity >= 0),
    new_quantity INTEGER NOT NULL CHECK(new_quantity >= 0),
    change_amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. SITE SETTINGS TABLE
CREATE TABLE site_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── INDEXES & NORMALIZED CONSTRAINTS ─────────────────────────────────────────

-- Expression-based normalized unique indexes on UPPER(TRIM(sku))
CREATE UNIQUE INDEX idx_products_sku_normalized 
ON products(UPPER(TRIM(sku))) WHERE sku IS NOT NULL AND TRIM(sku) != '';

CREATE UNIQUE INDEX idx_variants_sku_normalized 
ON product_variants(UPPER(TRIM(sku))) WHERE sku IS NOT NULL AND TRIM(sku) != '';

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_images_product ON product_images(product_id);
CREATE INDEX idx_images_key ON product_images(image_key);

-- Enforce AT MOST ONE primary image per simple product and per variant
CREATE UNIQUE INDEX idx_single_primary_image_product 
ON product_images(product_id) WHERE is_primary = 1 AND variant_id IS NULL;

CREATE UNIQUE INDEX idx_single_primary_image_variant 
ON product_images(variant_id) WHERE is_primary = 1 AND variant_id IS NOT NULL;

-- ── DATABASE INTEGRITY TRIGGERS ──────────────────────────────────────────────

-- A. Cross-Table SKU Uniqueness Triggers (Normalized Comparison)
CREATE TRIGGER trg_products_sku_check_insert
BEFORE INSERT ON products WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) != ''
BEGIN
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM product_variants 
        WHERE sku IS NOT NULL AND UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))
    )
    THEN RAISE(ABORT, 'SKU collision: SKU already exists in product_variants') END;
END;

CREATE TRIGGER trg_products_sku_check_update
BEFORE UPDATE OF sku ON products WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) != ''
BEGIN
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM product_variants 
        WHERE sku IS NOT NULL AND UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))
    )
    THEN RAISE(ABORT, 'SKU collision: SKU already exists in product_variants') END;
END;

CREATE TRIGGER trg_variants_sku_check_insert
BEFORE INSERT ON product_variants WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) != ''
BEGIN
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM products 
        WHERE sku IS NOT NULL AND UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))
    )
    THEN RAISE(ABORT, 'SKU collision: SKU already exists in products') END;
END;

CREATE TRIGGER trg_variants_sku_check_update
BEFORE UPDATE OF sku ON product_variants WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) != ''
BEGIN
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM products 
        WHERE sku IS NOT NULL AND UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))
    )
    THEN RAISE(ABORT, 'SKU collision: SKU already exists in products') END;
END;

-- B. Image-Variant Integrity Triggers
-- Guarantees product_images.variant_id belongs to the same product_id
CREATE TRIGGER trg_image_variant_integrity_insert
BEFORE INSERT ON product_images WHEN NEW.variant_id IS NOT NULL
BEGIN
    SELECT CASE WHEN (SELECT product_id FROM product_variants WHERE id = NEW.variant_id) != NEW.product_id
    THEN RAISE(ABORT, 'Integrity error: variant_id does not belong to product_id') END;
END;

CREATE TRIGGER trg_image_variant_integrity_update
BEFORE UPDATE OF variant_id, product_id ON product_images WHEN NEW.variant_id IS NOT NULL
BEGIN
    SELECT CASE WHEN (SELECT product_id FROM product_variants WHERE id = NEW.variant_id) != NEW.product_id
    THEN RAISE(ABORT, 'Integrity error: variant_id does not belong to product_id') END;
END;

-- C. Variant Product Immutability Trigger
-- Forbids changing product_id on a variant once created
CREATE TRIGGER trg_variant_product_id_immutable
BEFORE UPDATE OF product_id ON product_variants
BEGIN
    SELECT CASE WHEN NEW.product_id != OLD.product_id
    THEN RAISE(ABORT, 'Integrity error: product_id on product_variants is immutable once created') END;
END;

