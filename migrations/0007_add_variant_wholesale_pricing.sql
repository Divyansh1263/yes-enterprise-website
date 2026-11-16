-- =============================================================================
-- YES ENTERPRISES — D1 Schema Migration 0007
-- Phase 11.3: Add Wholesale Quotation & MOQ Columns to Product Variants
-- and Dedicated Pre-Conversion Snapshot Table
-- =============================================================================

-- 1. Add expected wholesale price per 100 pieces in paise to product_variants
ALTER TABLE product_variants ADD COLUMN expected_price_per_100_paise INTEGER DEFAULT NULL;

-- 2. Add optional minimum order quantity to product_variants
ALTER TABLE product_variants ADD COLUMN min_order_quantity INTEGER DEFAULT NULL;

-- 3. Composite index for fast active variant price range aggregation
CREATE INDEX IF NOT EXISTS idx_product_variants_pricing
  ON product_variants(product_id, status, price_paise, expected_price_per_100_paise);

-- 4. Dedicated pre-conversion snapshot table for safe, non-destructive rollbacks
CREATE TABLE IF NOT EXISTS product_conversion_snapshots (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    snapshot_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    converted_by TEXT NOT NULL,
    baseline_base_price_paise INTEGER,
    baseline_compare_at_price_paise INTEGER,
    baseline_expected_price_per_100_paise INTEGER,
    baseline_min_order_quantity INTEGER,
    baseline_sku TEXT,
    baseline_has_variants BOOLEAN NOT NULL DEFAULT 0,
    baseline_images_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'restored', 'superseded'))
);

CREATE INDEX IF NOT EXISTS idx_snapshots_product 
  ON product_conversion_snapshots(product_id);
