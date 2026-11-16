# YES ENTERPRISES — PHASE 11.2
# PRODUCT VARIANT SYSTEM: DATA MODEL & SCHEMA SPECIFICATION

**Project:** YES ENTERPRISES Wholesale Catalogue Website  
**Project Directory:** `D:\webpage`  
**Phase:** 11.2 — Variant System Technical Design  
**Document:** Database Schema, Pricing Models, Image Associations & Rollback Safety  
**Status:** Updated with Actual Variant Status Schema (`status IN ('active', 'archived')`), Reversible Image Rollback & Verified Snapshot Storage  

---

## 1. ARCHITECTURAL OVERVIEW & BACKWARD COMPATIBILITY

YES ENTERPRISES operates a hybrid wholesale catalogue supporting both simple products (single capacity/price) and variable products (multiple capacities under a single product family).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        products (Parent Table)                         │
│  id, name, name_hi, slug, category_id, has_variants, base_price_paise,  │
│  expected_price_per_100_paise, min_order_quantity, status...           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1:N
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐           ┌───────────────────────────────┐
│       product_variants        │           │        product_images         │
│ id, product_id, sku, title,   │           │ id, product_id, variant_id,   │
│ title_hi, price_paise,        │◄──────────┤ image_key, is_primary,        │
│ expected_price_per_100_paise, │    0..1:N │ sort_order, alt_text...       │
│ min_order_quantity, status... │           └───────────────────────────────┘
└───────────────────────────────┘
```

### Core Invariants
1. **Backward Compatibility:**
   - 100% of existing simple products (`has_variants = 0`, such as `prod-01`, `prod-02`, `prod-05`, `prod-15`, `prod-17`) continue operating without any changes.
   - For simple products, `/api/products` and `/api/products/[slug]` rely on parent `base_price_paise`, parent `expected_price_per_100_paise`, and parent `min_order_quantity`.
2. **Variable Product Pricing:**
   - For variable products (`has_variants = 1`), parent `base_price_paise` and `expected_price_per_100_paise` are nullable; live prices are derived dynamically from active child variants (`status = 'active'`).
3. **Owner-Approved Public Card Display:**
   - The catalogue card displays `From ₹X`, where X is the lowest single-piece price among active variants (`min_variant_price_paise`).
   - The card displays available capacity labels (e.g. `150 ml`, `200 ml`, `250 ml`, `300 ml`).
   - The full price range (e.g. `₹350 – ₹450`) is strictly excluded as the primary price on public cards.
4. **Owner-Approved Detail Page Switching:**
   - On load, the lowest-capacity active variant (`status = 'active'`, lowest `sort_order`) is automatically pre-selected.
   - The single-piece price (`price_paise`) and expected wholesale price per 100 pieces (`expected_price_per_100_paise`) are displayed together.
   - Selecting a capacity chip updates both prices and gallery focus synchronously.
   - Inactive / archived variants (`status = 'archived'`) are never selected by default and are excluded from public view.

---

## 2. DATABASE SCHEMA SPECIFICATION

### Migration Verification & Sequence
A rigorous audit of the migration history confirms:
- **Committed Migration Files:**
  1. `0001_initial_schema.sql` (Applied locally 2026-11-14, applied remote 2026-11-14)
  2. `0002_r2_deletion_safety.sql` (Applied locally 2026-11-14, applied remote 2026-11-14)
  3. `0003_seed_initial_catalogue.sql` (Applied locally 2026-11-14, applied remote 2026-11-15)
  4. `0004_add_expected_price_per_100.sql` (Applied locally 2026-11-15, applied remote 2026-11-15)
  5. `0005_add_min_order_quantity.sql` (Applied locally 2026-11-15, applied remote 2026-11-15)
  6. `0006_add_phase12_new_products.sql` (Applied locally 2026-11-15 14:14 UTC; pending in production)
- **Next Sequential Migration Number:**
  Because `0006` is already physically committed in `migrations/` and recorded in local `d1_migrations`, the variant system migration **must be `0007_add_variant_wholesale_pricing.sql`**.

### Proposed DDL: `migrations/0007_add_variant_wholesale_pricing.sql`

```sql
-- =============================================================================
-- YES ENTERPRISES — D1 Schema Migration 0007
-- Phase 11.3: Add Wholesale Quotation & MOQ Columns to Product Variants
-- and Dedicated Pre-Conversion Snapshot Table
-- =============================================================================

-- 1. Add expected wholesale price per 100 pieces in paise to product_variants
ALTER TABLE product_variants ADD COLUMN expected_price_per_100_paise INTEGER DEFAULT NULL;

-- 2. Add optional minimum order quantity to product_variants
ALTER TABLE product_variants ADD COLUMN min_order_quantity INTEGER DEFAULT NULL;

-- 3. Create index for fast price range aggregations across active variants
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
```

### Complete Resulting Schema: `product_variants` Table

| Column Name | SQL Type | Nullable | Constraints / Defaults | Description |
|---|---|---|---|---|
| `id` | `TEXT` | NO | `PRIMARY KEY` | Unique Variant UUID or slug ID (e.g. `var-prod-14-150`) |
| `product_id` | `TEXT` | NO | `REFERENCES products(id) ON DELETE CASCADE` | Parent product ID (immutable via D1 trigger) |
| `sku` | `TEXT` | YES | `CHECK(sku IS NULL OR (sku = UPPER(TRIM(sku)) AND LENGTH(sku) > 0))` | Unique uppercase SKU across products & variants |
| `title` | `TEXT` | NO | None | Capacity label in English (e.g. `150 ml`, `1 Litre`) |
| `title_hi` | `TEXT` | NO | None | Capacity label in Hindi (e.g. `150 ml`, `1 लीटर`) |
| `attributes_json` | `TEXT` | NO | `DEFAULT '{}'` | JSON attributes map (e.g. `{"capacity":"150 ml"}`) |
| `price_paise` | `INTEGER` | YES | `CHECK(price_paise IS NULL OR price_paise >= 0)` | Single-piece website price in paise (₹350 = `35000`) |
| `compare_at_price_paise` | `INTEGER` | YES | `CHECK(compare_at_price_paise IS NULL OR compare_at_price_paise >= 0)` | Optional retail crossed-out price in paise |
| **`expected_price_per_100_paise`** | `INTEGER` | YES | `CHECK(expected_price_per_100_paise IS NULL OR expected_price_per_100_paise >= 0)` | **Expected wholesale price for 100 pieces in paise** |
| **`min_order_quantity`** | `INTEGER` | YES | `CHECK(min_order_quantity IS NULL OR min_order_quantity >= 1)` | Optional variant-specific minimum order quantity (strictly nullable) |
| `stock_quantity` | `INTEGER` | NO | `DEFAULT 0 CHECK(stock_quantity >= 0)` | Stock inventory count |
| `low_stock_threshold` | `INTEGER` | NO | `DEFAULT 5 CHECK(low_stock_threshold >= 0)` | Alert threshold for low inventory |
| **`status`** | `TEXT` | NO | **`DEFAULT 'active' CHECK(status IN ('active', 'archived'))`** | **Operational status. Active: `'active'`. Inactive: `'archived'`. (Note: `is_active` does NOT exist)** |
| `sort_order` | `INTEGER` | NO | `DEFAULT 0` | Display sorting order (lowest capacity first) |
| `created_at` | `DATETIME` | NO | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `DATETIME` | NO | `DEFAULT CURRENT_TIMESTAMP` | Last updated timestamp |

---

## 3. PRICING & MOQ VALIDATION RULES

All validation is enforced at the backend layer in `functions/_shared/product-validation.js`:

1. **Integer Paise Standard:**
   - All monetary values must be non-negative integers representing paise (`1 INR = 100 paise`).
   - Floats, decimals, negative values, and non-numeric strings are strictly rejected with 400 Bad Request.
2. **Single-Piece Price (`price_paise`):**
   - Optional / Nullable (allows "Contact for Pricing").
   - If provided: `0 <= price_paise <= 100,000,000` (max ceiling ₹10,00,000 to prevent malformed or exponential inputs).
3. **Wholesale Price per 100 Pieces (`expected_price_per_100_paise`):**
   - Optional / Nullable.
   - If provided: `0 <= expected_price_per_100_paise <= 500,000,000` (max ceiling ₹50,00,000).
   - Stored as total quotation for 100 pieces (e.g. ₹13,500 = `1350000` paise).
4. **Minimum Order Quantity (`min_order_quantity`):**
   - Strictly Nullable (`NULL` by default).
   - If provided: Must be an integer `1 <= min_order_quantity <= 1,000,000`.
   - Never auto-set to 100 when a per-100 price is configured.

---

## 4. IMAGE RELATIONSHIP & REVERSIBLE ROLLBACK ARCHITECTURE

```
                               ┌───────────────┐
                               │   products    │
                               │ (id: 'prod-14')
                               └───────┬───────┘
                                       │ 1:N
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
          ┌──────────────────────┐            ┌───────────────────────────────────┐
          │   product_variants   │            │          product_images           │
          │ id: 'var-14-150'     │            │ id: 'img-14-shared'               │
          │ title: '150 ml'      │            │ product_id: 'prod-14'             │
          │ status: 'active'     │            │ variant_id: NULL ◄── (Shared)     │
          └──────────┬───────────┘            │ is_primary: 1                     │
                     │ 1:N                    │                                   │
                     └───────────────────────►│ id: 'img-14-150'                  │
                                              │ product_id: 'prod-14'             │
                                              │ variant_id: 'var-14-150' ◄──────┐ │
                                              │ is_primary: 1                   │ │
                                              └─────────────────────────────────┼─┘
                                                                                │
                                                   Specific variant photograph ─┘
```

### Image Management Invariants

1. **Shared Family Images (`variant_id IS NULL`):**
   - Represent general product line photography, branding, or packaging.
   - Every variable product must have at least one shared primary image (`variant_id IS NULL AND is_primary = 1`).
   - Retrieved by `/api/products` for public catalogue cards and used as default hero image on detail pages.
2. **Variant-Specific Images (`variant_id = <variant_id>`):**
   - Photography representing a specific capacity (e.g. 300ml bottle etched scale or boxed package).
   - Has its own isolated primary status within the variant (`is_primary = 1 WHERE variant_id = <variant_id>`).
3. **Sort Order & Gallery Rendering:**
   - Database ordering: `ORDER BY is_primary DESC, sort_order ASC, created_at ASC`.
4. **Default Image Selection & Fallback Behavior:**
   - On initial page load, the lowest-capacity active variant is pre-selected.
   - If that variant has dedicated images (`variant_id = selectedVariant.id`), those dedicated photos are placed first in the gallery, and the variant's primary image is shown in the hero frame.
   - **Fallback:** If a variant has no dedicated images (e.g. 500ml, 750ml, 1L vacuum bottles sharing one photo), the gallery smoothly falls back to the parent product's shared family images (`variant_id IS NULL`). The customer never sees a placeholder or missing image.
5. **Reversible Image Rollback Invariant (ZERO Image Modification):**
   - Setting `product_images.variant_id = NULL` during rollback is **prohibited** because it permanently destroys the variant-to-image association and risks violating `idx_single_primary_image_product`.
   - Instead, during rollback, **`product_images` records are NOT modified at all**:
     - Image `id`, `variant_id`, `is_primary`, `sort_order`, and metadata remain 100% intact.
     - When `has_variants = 0`, public catalogue queries only display images where `variant_id IS NULL`.
     - If the variable product is re-enabled in the future (`has_variants = 1` and variant status restored to `'active'`), all variant-to-image associations are immediately and automatically restored without re-linking or manual work.

---

## 5. REVERSIBLE ROLLBACK ARCHITECTURE & BOUNDARIES

Setting `has_variants = 0` alone does NOT restore a simple product because parent baseline fields (`base_price_paise`, `expected_price_per_100_paise`, `sku`) may have been cleared or modified during conversion.

### The Three Rollback Boundaries

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ BOUNDARY 1: IN-FLIGHT / FAILED CONVERSION (ATOMIC DATABASE BATCH)                │
│ • Execution Scope: During conversion execution in db.batch([stmt1, stmt2...]).   │
│ • Behavior: If any single statement fails, D1 automatically aborts and rolls     │
│   back the entire transaction. Zero partial data commits.                        │
│ • Recovery: Automatic native engine rollback. Zero manual intervention needed.  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ BOUNDARY 2: COMMITTED PRODUCT CONVERSION REVERSAL (PRODUCT-LEVEL SCOPE)          │
│ • Execution Scope: A previously committed variable product is reverted to simple.│
│ • Snapshot Source: product_conversion_snapshots table in D1.                     │
│ • Execution: Atomic db.batch() restoring parent fields from snapshot, setting   │
│   status = 'archived' on child variants, and leaving product_images untouched.   │
│ • Reversibility: Full. Re-activating variants immediately restores complete state│
└──────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ BOUNDARY 3: SCHEMA MIGRATION ROLLBACK (DATABASE-LEVEL SCOPE)                     │
│ • Execution Scope: Reverting schema migration 0007 on Cloudflare D1.             │
│ • Tool: External verified SQL backup dump (wrangler d1 export).                  │
│ • Reality: D1 does not support automatic down-migrations. Rollback requires      │
│   restoring from the pre-migration dump file taken prior to migration.           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Snapshot Storage & Verification Protocol
1. **Creation Timing:** The conversion snapshot is created in `product_conversion_snapshots` within the **exact same atomic `db.batch()` transaction** as the product conversion itself.
2. **Recorded State:** Captures `baseline_base_price_paise`, `baseline_compare_at_price_paise`, `baseline_expected_price_per_100_paise`, `baseline_min_order_quantity`, `baseline_sku`, and full JSON array of image mappings (`baseline_images_json`).
3. **Pre-Conversion Verification:** The conversion transaction asserts that snapshot data is valid and non-null for baseline pricing before toggling `has_variants = 1`.
4. **Product-Level Restoration Procedure:**
   ```sql
   -- 1. Restore parent product fields from verified snapshot
   UPDATE products SET
     base_price_paise = snapshot.baseline_base_price_paise,
     compare_at_price_paise = snapshot.baseline_compare_at_price_paise,
     expected_price_per_100_paise = snapshot.baseline_expected_price_per_100_paise,
     min_order_quantity = snapshot.baseline_min_order_quantity,
     sku = snapshot.baseline_sku,
     has_variants = 0,
     updated_at = CURRENT_TIMESTAMP
   WHERE id = ?;

   -- 2. Soft-archive child variants (never hard DELETE)
   UPDATE product_variants SET 
     status = 'archived', 
     updated_at = CURRENT_TIMESTAMP 
   WHERE product_id = ?;

   -- 3. Mark snapshot as restored
   UPDATE product_conversion_snapshots SET 
     status = 'restored' 
   WHERE id = ?;

   -- 4. DO NOT TOUCH product_images! 
   -- All variant_id links remain intact in the database.
   -- Public simple product views filter out variant images via WHERE variant_id IS NULL.
   ```

---

## 6. API RESPONSE CONTRACTS

### A. Public Product Detail: `GET /api/products/:slug`

```json
{
  "id": "prod-14",
  "name": "SS 304 Stainless Steel Feeding Bottle",
  "name_hi": "SS 304 स्टेनलेस स्टील फीडिंग बोतल",
  "slug": "stainless-steel-feeding-bottle-ss304",
  "category": {
    "id": "ss-bottles",
    "name": "Stainless Steel Feeding Bottles",
    "name_hi": "स्टेनलेस स्टील फीडिंग बोतलें",
    "slug": "ss-bottles"
  },
  "has_variants": true,
  "base_price_paise": null,
  "expected_price_per_100_paise": null,
  "min_order_quantity": null,
  "variants": [
    {
      "id": "var-prod-14-150",
      "sku": "YE-SS-STR-150",
      "title": "150 ml",
      "title_hi": "150 ml",
      "price_paise": 35000,
      "expected_price_per_100_paise": 1350000,
      "min_order_quantity": null,
      "status": "active",
      "sort_order": 0
    },
    {
      "id": "var-prod-14-200",
      "sku": "YE-SS-STR-200",
      "title": "200 ml",
      "title_hi": "200 ml",
      "price_paise": 39900,
      "expected_price_per_100_paise": 1450000,
      "min_order_quantity": null,
      "status": "active",
      "sort_order": 1
    }
  ],
  "images": [
    {
      "id": "img-shared-01",
      "image_key": "/assets/WhatsApp Image 2026-11-16 at 9.28.42 AM.jpeg",
      "variant_id": null,
      "is_primary": true,
      "sort_order": 0
    },
    {
      "id": "img-var-150",
      "image_key": "/assets/WhatsApp Image 2026-11-16 at 9.28.42 AM (1).jpeg",
      "variant_id": "var-prod-14-150",
      "is_primary": true,
      "sort_order": 1
    }
  ]
}
```

### B. Public Product List: `GET /api/products` (Aggregated Variable Card)

```json
{
  "id": "prod-14",
  "name": "SS 304 Stainless Steel Feeding Bottle",
  "name_hi": "SS 304 स्टेनलेस स्टील फीडिंग बोतल",
  "slug": "stainless-steel-feeding-bottle-ss304",
  "category_id": "ss-bottles",
  "has_variants": true,
  "base_price_paise": null,
  "expected_price_per_100_paise": null,
  "min_variant_price_paise": 35000,
  "max_variant_price_paise": 49900,
  "min_variant_expected_price_100_paise": 1350000,
  "max_variant_expected_price_100_paise": 1650000,
  "variant_capacities_summary": "150 ml, 200 ml, 250 ml, 300 ml",
  "variants_count": 4,
  "primary_image_key": "/assets/WhatsApp Image 2026-11-16 at 9.28.42 AM.jpeg"
}
```

---

## 7. VERIFIED BENCHMARK FAMILIES (PLANNING EXAMPLES ONLY)

These three product groups serve as technical benchmarks and validation test fixtures during Phase 11.3 development. **They will not be seeded or modified in the database until Phase 11.4.**

### Group 1: Straight Profile SS 304 Feeding Bottle Family (`prod-14`)
- **Parent Product ID:** `prod-14` (Target Category: `ss-bottles`)
- **Capacity Variants:**
  1. **150 ml:** SKU `YE-SS-STR-150` | Single: ₹350 (`35000` paise) | Per 100: ₹13,500 (`1350000` paise) | Status: `'active'`
  2. **200 ml:** SKU `YE-SS-STR-200` | Single: ₹399 (`39900` paise) | Per 100: ₹14,500 (`1450000` paise) | Status: `'active'`
  3. **250 ml:** SKU `YE-SS-STR-250` | Single: ₹449 (`44900` paise) | Per 100: ₹15,500 (`1550000` paise) | Status: `'active'`
  4. **300 ml:** SKU `YE-SS-STR-300` | Single: ₹499 (`49900` paise) | Per 100: ₹16,500 (`1650000` paise) | Status: `'active'`

### Group 2: Premium Contoured Ergonomic SS Feeding Bottle Family (`prod-19`)
- **Parent Product ID:** `prod-19` (Target Category: `ss-bottles`)
- **Capacity Variants:**
  1. **200 ml:** SKU `YE-SS-PRM-200` | Single: ₹549 (`54900` paise) | Per 100: ₹19,000 (`1900000` paise) | Status: `'active'`
  2. **250 ml:** SKU `YE-SS-PRM-250` | Single: ₹599 (`59900` paise) | Per 100: ₹19,900 (`1990000` paise) | Status: `'active'`

### Group 3: Stainless Steel Vacuum Cola Water Bottle Family (`prod-16`)
- **Parent Product ID:** `prod-16`
- **Category Status Verification:**
  - **Local finding only:** In the local development emulator database, `prod-16` is currently assigned to `glass-bottles` due to earlier test script mutations.
  - **Production verified status:** In the verified production database dump (taken 2026-11-15 19:08 IST) and `0003_seed_initial_catalogue.sql`, `prod-16` is correctly assigned to **`ss-sippers`**.
  - No changes will be made to either environment during this planning phase.
- **Capacity Variants:**
  1. **500 ml:** SKU `YE-COLA-500` | Single: ₹599 (`59900` paise) | Per 100: ₹34,900 (`3490000` paise) | Status: `'active'`
  2. **750 ml:** SKU `YE-COLA-750` | Single: ₹649 (`64900` paise) | Per 100: ₹36,500 (`3650000` paise) | Status: `'active'`
  3. **1 Litre:** SKU `YE-COLA-1000` | Title (HI): `'1 लीटर'` | Single: ₹799 (`79900` paise) | Per 100: ₹39,900 (`3990000` paise) | Status: `'active'`
