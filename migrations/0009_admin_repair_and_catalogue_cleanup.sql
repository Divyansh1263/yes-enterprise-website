-- =============================================================================
-- YES ENTERPRISES — D1 Schema & Data Migration 0009
-- Admin Panel Repair, Product Catalogue Cleanup & Colour Grouping
-- =============================================================================

-- 1. ADD NEW CATEGORY: Stainless Steel Water Bottles
INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order)
VALUES (
  'ss-water-bottles',
  'Stainless Steel Water Bottles',
  'स्टेनलेस स्टील पानी की बोतलें',
  'ss-water-bottles',
  'Durable, premium food-grade stainless steel water bottles and flasks for daily use',
  'दैनिक उपयोग के लिए टिकाऊ, प्रीमियम फूड-ग्रेड स्टेनलेस स्टील पानी की बोतलें और फ्लास्क',
  5
) ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  name_hi = excluded.name_hi,
  slug = excluded.slug,
  description = excluded.description,
  description_hi = excluded.description_hi,
  sort_order = excluded.sort_order;

UPDATE categories SET name = 'Stainless Steel Sippers', name_hi = 'स्टेनलेस स्टील सिपर', sort_order = 6 WHERE id = 'ss-sippers';
UPDATE categories SET sort_order = 7 WHERE id = 'ss-tiffin';

-- 2. ASSIGN prod-16 TO Stainless Steel Water Bottles CATEGORY
UPDATE products
SET category_id = 'ss-water-bottles',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-16';

-- 3. RESTORE & CORRECT PLASTIC FEEDING BOTTLES (Categorization, Material, Names)
UPDATE products
SET name = 'Plastic Feeding Bottle — 125 ml (Teal)',
    name_hi = 'प्लास्टिक फीडिंग बोतल — 125 ml (हरी)',
    slug = 'plastic-feeding-bottle-125ml-teal',
    category_id = 'plastic-bottles',
    material = 'BPA-Free Plastic',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-03';

UPDATE products
SET name = 'Plastic Feeding Bottle — 120 ml with Handles (Blue)',
    name_hi = 'प्लास्टिक फीडिंग बोतल — 120 ml हैंडल के साथ (नीली)',
    slug = 'plastic-feeding-bottle-120ml-handles-blue',
    category_id = 'plastic-bottles',
    material = 'BPA-Free Plastic',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-04';

UPDATE products
SET name = 'Plastic Feeding Bottle — 120 ml (Red)',
    name_hi = 'प्लास्टिक फीडिंग बोतल — 120 ml (लाल)',
    slug = 'plastic-feeding-bottle-120ml-red',
    category_id = 'plastic-bottles',
    material = 'BPA-Free Plastic',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-06';

UPDATE products
SET name = 'Plastic Feeding Bottle — 250 ml (Red)',
    name_hi = 'प्लास्टिक फीडिंग बोतल — 250 ml (लाल)',
    slug = 'plastic-feeding-bottle-250ml-red',
    category_id = 'plastic-bottles',
    material = 'BPA-Free Plastic',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-09';

UPDATE products
SET name = 'Plastic Feeding Bottle — 250 ml with Handles (Blue)',
    name_hi = 'प्लास्टिक फीडिंग बोतल — 250 ml हैंडल के साथ (नीली)',
    slug = 'plastic-feeding-bottle-250ml-handles-blue',
    category_id = 'plastic-bottles',
    material = 'BPA-Free Plastic',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-13';

-- 4. CORRECT GLASS FEEDING BOTTLE — 120 ml (Blue)
UPDATE products
SET name = 'Glass Feeding Bottle — 120 ml (Blue)',
    name_hi = 'कांच की फीडिंग बोतल — 120 ml (नीली)',
    slug = 'glass-feeding-bottle-120ml-blue',
    category_id = 'glass-bottles',
    material = 'Glass',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-11';

-- 5. GROUP COLOUR VARIANTS FOR GLASS FEEDING BOTTLE — 250 ml (prod-01 + prod-08)
UPDATE products
SET name = 'Glass Feeding Bottle — 250 ml',
    name_hi = 'कांच की फीडिंग बोतल — 250 ml',
    has_variants = 1,
    base_price_paise = NULL,
    compare_at_price_paise = NULL,
    expected_price_per_100_paise = NULL,
    material = 'Clear Glass with screen print and etched scale',
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-01';

-- Insert/Update Blue variant for prod-01
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
  stock_quantity, low_stock_threshold, status, sort_order, created_at, updated_at
) VALUES (
  'var-prod-01-blue', 'prod-01', 'YE-GLS-250-BLU', 'Blue', 'नीला', '{"colour":"Blue"}',
  24000, NULL, 850000, NULL,
  100, 5, 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  price_paise = 24000,
  expected_price_per_100_paise = 850000,
  status = 'active';

-- Insert/Update Red variant for prod-01
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
  stock_quantity, low_stock_threshold, status, sort_order, created_at, updated_at
) VALUES (
  'var-prod-01-red', 'prod-01', 'YE-GLS-250-RED', 'Red', 'लाल', '{"colour":"Red"}',
  24000, NULL, 850000, NULL,
  100, 5, 'active', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  price_paise = 24000,
  expected_price_per_100_paise = 850000,
  status = 'active';

-- Map primary image of prod-01 to Blue variant
UPDATE product_images
SET variant_id = 'var-prod-01-blue'
WHERE product_id = 'prod-01' AND is_primary = 1;

-- Add Red variant image to prod-01 (from prod-08)
INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order, created_at
) VALUES (
  'img-prod-01-red', 'prod-01', 'var-prod-01-red',
  '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg',
  'Glass Feeding Bottle 250ml (Red)', 'कांच की फीडिंग बोतल 250 ml (लाल)',
  'image/jpeg', 85576, 800, 800, 0, 2, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
  image_key = excluded.image_key,
  variant_id = excluded.variant_id;

-- Set prod-08 to draft since its colour is now an active variant of prod-01
UPDATE products
SET name = 'Glass Feeding Bottle — 250 ml (Red)',
    name_hi = 'कांच की फीडिंग बोतल — 250 ml (लाल)',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-08';

-- 6. REMOVE USER TEST PRODUCT ba0e4ef4...
DELETE FROM cleanup_claims WHERE image_key IN (SELECT image_key FROM pending_uploads WHERE product_id = 'ba0e4ef4-88d0-41b6-853b-0af62d2b5644');
DELETE FROM pending_uploads WHERE product_id = 'ba0e4ef4-88d0-41b6-853b-0af62d2b5644';
DELETE FROM product_images WHERE product_id = 'ba0e4ef4-88d0-41b6-853b-0af62d2b5644';
DELETE FROM inventory_logs WHERE product_id = 'ba0e4ef4-88d0-41b6-853b-0af62d2b5644';
DELETE FROM product_conversion_snapshots WHERE product_id = 'ba0e4ef4-88d0-41b6-853b-0af62d2b5644';
DELETE FROM product_variants WHERE product_id = 'ba0e4ef4-88d0-41b6-853b-0af62d2b5644';
DELETE FROM products WHERE id = 'ba0e4ef4-88d0-41b6-853b-0af62d2b5644';
