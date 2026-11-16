-- =============================================================================
-- YES ENTERPRISES — Stage 3B Production Catalogue Import
-- Generated: 2026-11-16 08:26:44
-- Execution ID: exec-stage3b-prod-bdc201cc4b66c115
-- Batch ID: stage3b-import-20261116
-- =============================================================================

-- 1. Acquire Concurrency Lock in system_import_ledger
INSERT INTO system_import_ledger (operation_key, execution_id, status, initiated_by, started_at)
VALUES ('stage-3b-catalogue-import', 'exec-stage3b-prod-bdc201cc4b66c115', 'in_progress', 'authorized-production-rollout@yesenterprises.net.in', '2026-11-16 08:26:44');

-- 2. Snapshot 7 Standalone Products into catalogue_import_snapshots
INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-01', 'stage3b-import-20261116', id, 'standalone_update', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, '2026-11-16 08:26:44', 'active'
FROM products WHERE id = 'prod-01';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-02', 'stage3b-import-20261116', id, 'standalone_update', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, '2026-11-16 08:26:44', 'active'
FROM products WHERE id = 'prod-02';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-05', 'stage3b-import-20261116', id, 'standalone_update', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, '2026-11-16 08:26:44', 'active'
FROM products WHERE id = 'prod-05';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-07', 'stage3b-import-20261116', id, 'standalone_update', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, '2026-11-16 08:26:44', 'active'
FROM products WHERE id = 'prod-07';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-15', 'stage3b-import-20261116', id, 'standalone_update', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, '2026-11-16 08:26:44', 'active'
FROM products WHERE id = 'prod-15';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-17', 'stage3b-import-20261116', id, 'standalone_update', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, '2026-11-16 08:26:44', 'active'
FROM products WHERE id = 'prod-17';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-18', 'stage3b-import-20261116', id, 'standalone_update', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, '2026-11-16 08:26:44', 'active'
FROM products WHERE id = 'prod-18';

-- 3. Snapshot 7 Legacy Products into catalogue_import_snapshots
INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-03', 'stage3b-import-20261116', id, 'legacy_status', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, 'active'
FROM products WHERE id = 'prod-03';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-04', 'stage3b-import-20261116', id, 'legacy_status', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, 'active'
FROM products WHERE id = 'prod-04';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-06', 'stage3b-import-20261116', id, 'legacy_status', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, 'active'
FROM products WHERE id = 'prod-06';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-08', 'stage3b-import-20261116', id, 'legacy_status', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, 'active'
FROM products WHERE id = 'prod-08';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-09', 'stage3b-import-20261116', id, 'legacy_status', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, 'active'
FROM products WHERE id = 'prod-09';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-11', 'stage3b-import-20261116', id, 'legacy_status', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, 'active'
FROM products WHERE id = 'prod-11';

INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)
SELECT 'snap-stage3b-import-20261116-prod-13', 'stage3b-import-20261116', id, 'legacy_status', json_object(
  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,
  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,
  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,
  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,
  'min_order_quantity', min_order_quantity
), updated_at, 'active'
FROM products WHERE id = 'prod-13';

-- 4. Snapshot 3 Family Parents into product_conversion_snapshots
INSERT INTO product_conversion_snapshots (
  id, product_id, snapshot_timestamp, converted_by,
  baseline_base_price_paise, baseline_compare_at_price_paise,
  baseline_expected_price_per_100_paise, baseline_min_order_quantity,
  baseline_sku, baseline_has_variants, baseline_images_json, status
)
SELECT 'snap-prod-14-catalogue-import', id, CURRENT_TIMESTAMP, 'authorized-production-rollout@yesenterprises.net.in',
  base_price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
  sku, has_variants,
  (SELECT json_group_array(json_object('id', id, 'key', image_key, 'variant_id', variant_id, 'is_primary', is_primary, 'sort_order', sort_order)) FROM product_images WHERE product_id = 'prod-14'),
  'active'
FROM products WHERE id = 'prod-14';

INSERT INTO product_conversion_snapshots (
  id, product_id, snapshot_timestamp, converted_by,
  baseline_base_price_paise, baseline_compare_at_price_paise,
  baseline_expected_price_per_100_paise, baseline_min_order_quantity,
  baseline_sku, baseline_has_variants, baseline_images_json, status
)
SELECT 'snap-prod-16-catalogue-import', id, CURRENT_TIMESTAMP, 'authorized-production-rollout@yesenterprises.net.in',
  base_price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
  sku, has_variants,
  (SELECT json_group_array(json_object('id', id, 'key', image_key, 'variant_id', variant_id, 'is_primary', is_primary, 'sort_order', sort_order)) FROM product_images WHERE product_id = 'prod-16'),
  'active'
FROM products WHERE id = 'prod-16';

INSERT INTO product_conversion_snapshots (
  id, product_id, snapshot_timestamp, converted_by,
  baseline_base_price_paise, baseline_compare_at_price_paise,
  baseline_expected_price_per_100_paise, baseline_min_order_quantity,
  baseline_sku, baseline_has_variants, baseline_images_json, status
)
SELECT 'snap-prod-19-catalogue-import', id, CURRENT_TIMESTAMP, 'authorized-production-rollout@yesenterprises.net.in',
  base_price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
  sku, has_variants,
  (SELECT json_group_array(json_object('id', id, 'key', image_key, 'variant_id', variant_id, 'is_primary', is_primary, 'sort_order', sort_order)) FROM product_images WHERE product_id = 'prod-19'),
  'active'
FROM products WHERE id = 'prod-19';

-- 5. Transition 7 Legacy Products to draft status (updated_at unchanged)
UPDATE products SET status = 'draft' WHERE id = 'prod-03' AND status = 'active';
UPDATE products SET status = 'draft' WHERE id = 'prod-04' AND status = 'active';
UPDATE products SET status = 'draft' WHERE id = 'prod-06' AND status = 'active';
UPDATE products SET status = 'draft' WHERE id = 'prod-08' AND status = 'active';
UPDATE products SET status = 'draft' WHERE id = 'prod-09' AND status = 'active';
UPDATE products SET status = 'draft' WHERE id = 'prod-11' AND status = 'active';
UPDATE products SET status = 'draft' WHERE id = 'prod-13' AND status = 'active';

-- 6. Update 7 Standalone Products
UPDATE products SET
  name = 'Glass Feeding Bottle — 250 ml (Blue)',
  name_hi = 'कांच की फीडिंग बोतल — 250 ml (नीली)',
  slug = 'glass-feeding-bottle-250ml-blue',
  category_id = 'glass-bottles',
  description = '250 ml clear glass bottle with blue threaded collar ring, printed cartoon animals, embossed graduation scale, and clear dome cap.',
  description_hi = 'नीले थ्रेडेड कॉलर रिंग, प्रिंटेड कार्टून और उभरे हुए मापन चिह्नों के साथ 250 ml कांच की बोतल।',
  material = 'Clear Glass with screen print and etched scale',
  brand = 'Moon Baby / YE',
  has_variants = 0,
  base_price_paise = 24000,
  expected_price_per_100_paise = 850000,
  min_order_quantity = NULL,
  specifications_json = '{"capacity":"250 ml","material":"Clear glass body with blue collar ring","brand":"Moon Baby","colours":"Blue collar ring with blue cartoon graphics"}',
  status = 'active',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-01';

UPDATE products SET
  name = 'Glass Feeding Bottle — 60 ml (Pink)',
  name_hi = 'कांच की फीडिंग बोतल — 60 ml (गुलाबी)',
  slug = 'glass-feeding-bottle-60ml-pink',
  category_id = 'glass-bottles',
  description = 'Small 60 ml clear glass newborn bottle with durable cartoon print, pink threaded collar, silicone teat, and clear cap.',
  description_hi = 'टिकाऊ कार्टून प्रिंट, गुलाबी थ्रेडेड कॉलर, सिलिकॉन निप्पल और पारदर्शी कैप के साथ 60 ml कांच की बोतल।',
  material = 'Glass with durable screen print',
  brand = 'Moon Baby / YE',
  has_variants = 0,
  base_price_paise = 14900,
  expected_price_per_100_paise = 650000,
  min_order_quantity = NULL,
  specifications_json = '{"capacity":"60 ml","material":"Clear glass body with food-grade plastic collar and silicone teat","brand":"Moon Baby","colours":"Pink collar ring and matching cartoon print"}',
  status = 'active',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-02';

UPDATE products SET
  name = 'Silicone Sleeve Feeding Bottle — 250 ml',
  name_hi = 'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml',
  slug = 'silicone-sleeve-feeding-bottle-250ml',
  category_id = 'silicone-sleeve',
  description = 'Glass feeding bottle with protective star-cutout silicone sleeve, anti-slip grip, and durable hygiene dome cap.',
  description_hi = 'सुरक्षात्मक स्टार-कटआउट सिलिकॉन स्लीव और एंटी-स्लिप ग्रिप के साथ ग्लास फीडिंग बोतल।',
  material = 'Glass Bottle with Food-Grade Silicone Star Sleeve',
  brand = 'YE',
  has_variants = 0,
  base_price_paise = 27500,
  expected_price_per_100_paise = 990000,
  min_order_quantity = NULL,
  specifications_json = '{"capacity":"250 ml","material":"Glass bottle with food-grade silicone star sleeve (handle-less)","brand":"YE","colours":"Royal blue star-cutout sleeve with blue collar ring"}',
  status = 'active',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-05';

UPDATE products SET
  name = 'Silicone Sleeve Feeding Bottle — 120 ml',
  name_hi = 'सिलिकॉन स्लीव फीडिंग बोतल — 120 ml',
  slug = 'silicone-sleeve-feeding-bottle-120ml',
  category_id = 'silicone-sleeve',
  description = 'Compact 120 ml glass feeding bottle encased in shock-resistant star silicone sleeve, ideal for newborns and infant feeding.',
  description_hi = 'नवजात शिशुओं के लिए आदर्श, शॉक-रेसिस्टेंट स्टार सिलिकॉन स्लीव में 120 ml ग्लास फीडिंग बोतल।',
  material = 'Glass Bottle with Food-Grade Silicone Star Sleeve',
  brand = 'YE',
  has_variants = 0,
  base_price_paise = 24900,
  expected_price_per_100_paise = 950000,
  min_order_quantity = NULL,
  specifications_json = '{"capacity":"120 ml","material":"Glass bottle with protective silicone sleeve","brand":"YE","colours":"Royal blue star sleeve"}',
  status = 'active',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-07';

UPDATE products SET
  name = 'Stainless Steel Tiffin Box Set',
  name_hi = 'स्टेनलेस स्टील टिफिन बॉक्स सेट',
  slug = 'stainless-steel-tiffin-box-set',
  category_id = 'ss-tiffin',
  description = '2-piece stainless steel lunch box set featuring spill-resistant silicone-sealed clip lid, nested interior snack box, and stainless spoon.',
  description_hi = 'सिलिकॉन-सील्ड क्लिप ढक्कन, छोटे इनर स्नैक बॉक्स और चम्मच के साथ 2-पीस स्टेनलेस स्टील लंच बॉक्स सेट।',
  material = 'SS 304 Stainless Steel Body with Silicone Gasket Plastic Lid',
  brand = 'YE',
  has_variants = 0,
  base_price_paise = 45000,
  expected_price_per_100_paise = 2950000,
  min_order_quantity = NULL,
  specifications_json = '{"capacity":"2-piece lunch box set (Main lunch box + mini container with spoon)","material":"Stainless steel interior with airtight snap-clamp lid and silicone sealing ring","brand":"YE","colours":"Silver stainless body with turquoise clip lid"}',
  status = 'active',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-15';

UPDATE products SET
  name = 'YE Stainless Steel Feeding Bottle with Handles — 250 ml',
  name_hi = 'YE हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल — 250 ml',
  slug = 'ye-stainless-steel-feeding-bottle-handles-250ml',
  category_id = 'ss-bottles',
  description = 'Stainless steel feeding bottle with twin grip handles, embossed graduation markings up to 250 ml, and protective cap. Made from SS 304 grade stainless steel.',
  description_hi = 'ट्विन ग्रिप हैंडल, 250 ml तक उभरे हुए मापन चिह्नों और सुरक्षात्मक कैप के साथ स्टेनलेस स्टील फीडिंग बोतल।',
  material = 'SS 304 Stainless Steel',
  brand = 'YE',
  has_variants = 0,
  base_price_paise = 24900,
  expected_price_per_100_paise = 1500000,
  min_order_quantity = NULL,
  specifications_json = '{"capacity":"250 ml","material":"SS 304 Stainless Steel","brand":"YE","colours":"Silver body with pink collar and twin grip handles","features":"Twin grip handles, protective transparent cap, etched graduation scale (50-250 ml)"}',
  status = 'draft',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-17';

UPDATE products SET
  name = 'YE Glass Sipper with Handle — 250 ml',
  name_hi = 'YE हैंडल वाला ग्लास सिपर — 250 ml',
  slug = 'ye-glass-sipper-handle-250ml',
  category_id = 'silicone-sleeve',
  description = 'Glass sipper bottle encased in protective shock-absorbing star-cutout silicone sleeve with twin easy-grip training handles and hygiene dome cap.',
  description_hi = 'ग्लास सिपर बोतल, शॉक-एब्जॉर्बिंग स्टार-कटआउट सिलिकॉन स्लीव और ट्विन ट्रेनिंग हैंडल के साथ।',
  material = 'Glass with Protective Silicone Star Sleeve',
  brand = 'YE',
  has_variants = 0,
  base_price_paise = 27500,
  expected_price_per_100_paise = 1100000,
  min_order_quantity = NULL,
  specifications_json = '{"capacity":"250 ml","material":"Glass bottle with protective silicone star sleeve and twin training handles","brand":"YE","colours":"Turquoise sleeve with matching handles and collar ring"}',
  status = 'draft',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-18';

-- 7. Convert 3 Family Parents (has_variants = 1, base pricing cleared)
UPDATE products SET
  name = 'SS 304 Stainless Steel Feeding Bottle Family',
  name_hi = 'SS 304 स्टेनलेस स्टील फीडिंग बोतल फैमिली',
  slug = 'stainless-steel-feeding-bottle-ss304',
  category_id = 'ss-bottles',
  description = 'Premium SS 304 food-grade stainless steel feeding bottle with straight cylindrical body, laser-engraved YE branding, clear embossed capacity markings, and protective steel cap.',
  description_hi = 'सीधे बेलनाकार आकार, लेजर-एन्ग्रेव्ड YE ब्रांडिंग, स्पष्ट उभरे हुए मापन चिह्नों और सुरक्षात्मक स्टील कैप के साथ प्रीमियम SS 304 फूड-ग्रेड स्टेनलेस स्टील फीडिंग बोतल।',
  material = 'SS 304 Food Grade Stainless Steel',
  brand = 'YE',
  has_variants = 1,
  base_price_paise = NULL,
  compare_at_price_paise = NULL,
  expected_price_per_100_paise = NULL,
  min_order_quantity = NULL,
  status = 'active',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-14';

UPDATE products SET
  name = 'Stainless Steel Vacuum Cola Water Bottle Family',
  name_hi = 'स्टेनलेस स्टील वैक्यूम कोला पानी की बोतल फैमिली',
  slug = 'stainless-steel-vacuum-sipper',
  category_id = 'ss-sippers',
  description = 'Double-wall vacuum insulated stainless steel water bottle in classic cola contour. Jointless design with threaded stainless screw cap. Up to 24 hours thermal retention.',
  description_hi = 'क्लासिक कोला आकार में डबल-वॉल वैक्यूम इंसुलेटेड स्टेनलेस स्टील पानी की बोतल। 24 घंटे गर्म और ठंडा रखने की निर्माता द्वारा बताई गई क्षमता।',
  material = 'Double-Wall Vacuum Insulated Stainless Steel',
  brand = 'YE',
  has_variants = 1,
  base_price_paise = NULL,
  compare_at_price_paise = NULL,
  expected_price_per_100_paise = NULL,
  min_order_quantity = NULL,
  status = 'active',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-16';

UPDATE products SET
  name = 'YE Premium Stainless Steel Feeding Bottle Family',
  name_hi = 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल फैमिली',
  slug = 'ye-premium-stainless-steel-feeding-bottle-200ml',
  category_id = 'ss-bottles',
  description = 'Ergonomically contoured wide-neck premium SS 304 stainless steel feeding bottle with laser-engraved YE branding, anti-colic silicone teat, and crystal-clear dome cap.',
  description_hi = 'सुविधाजनक घुमावदार चौड़े मुंह वाली प्रीमियम SS 304 स्टेनलेस स्टील फीडिंग बोतल, लेजर-एन्ग्रेव्ड YE ब्रांडिंग और एंटी-कोलिक सिलिकॉन निप्पल के साथ।',
  material = 'SS 304 Food Grade Stainless Steel',
  brand = 'YE',
  has_variants = 1,
  base_price_paise = NULL,
  compare_at_price_paise = NULL,
  expected_price_per_100_paise = NULL,
  min_order_quantity = NULL,
  status = 'draft',
  updated_at = '2026-11-16 08:26:44'
WHERE id = 'prod-19';

-- 8. Insert 9 Active Capacity Variants
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-14-150', 'prod-14', 'YE-SS-STR-150', '150 ml', '150 ml', '{"capacity":"150 ml"}',
  35000, NULL, 0, 5, 'active', 0, 1350000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-14-200', 'prod-14', 'YE-SS-STR-200', '200 ml', '200 ml', '{"capacity":"200 ml"}',
  39900, NULL, 0, 5, 'active', 1, 1450000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-14-250', 'prod-14', 'YE-SS-STR-250', '250 ml', '250 ml', '{"capacity":"250 ml"}',
  44900, NULL, 0, 5, 'active', 2, 1550000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-14-300', 'prod-14', 'YE-SS-STR-300', '300 ml', '300 ml', '{"capacity":"300 ml"}',
  49900, NULL, 0, 5, 'active', 3, 1650000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-19-200', 'prod-19', 'YE-SS-PRM-200', '200 ml', '200 ml', '{"capacity":"200 ml"}',
  54900, NULL, 0, 5, 'active', 0, 1900000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-19-250', 'prod-19', 'YE-SS-PRM-250', '250 ml', '250 ml', '{"capacity":"250 ml"}',
  59900, NULL, 0, 5, 'active', 1, 1990000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-16-500', 'prod-16', 'YE-COLA-500', '500 ml', '500 ml', '{"capacity":"500 ml"}',
  59900, NULL, 0, 5, 'active', 0, 3490000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-16-750', 'prod-16', 'YE-COLA-750', '750 ml', '750 ml', '{"capacity":"750 ml"}',
  64900, NULL, 0, 5, 'active', 1, 3650000, NULL
);
INSERT INTO product_variants (
  id, product_id, sku, title, title_hi, attributes_json,
  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
  status, sort_order, expected_price_per_100_paise, min_order_quantity
) VALUES (
  'var-prod-16-1000', 'prod-16', 'YE-COLA-1000', '1 Litre', '1 लीटर', '{"capacity":"1 Litre"}',
  79900, NULL, 0, 5, 'active', 2, 3990000, NULL
);

-- 9. Complete Ledger Entry
UPDATE system_import_ledger SET
  status = 'completed',
  completed_at = CURRENT_TIMESTAMP,
  metadata_json = '{"batch_id":"stage3b-import-20261116","execution_id":"exec-stage3b-prod-bdc201cc4b66c115","initiated_by":"authorized-production-rollout@yesenterprises.net.in","standalone_updated":7,"legacy_drafted":7,"parents_converted":3,"variants_inserted":9,"standalone_snapshots":7,"legacy_snapshots":7,"conversion_snapshots":3,"total_catalogue_snapshots":14}'
WHERE operation_key = 'stage-3b-catalogue-import';
