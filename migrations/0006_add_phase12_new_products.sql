-- =============================================================================
-- YES ENTERPRISES — D1 Migration 0006 (Revised Safe Form — Stage 2B Approved)
-- Phase 12 / Phase 11.4B: New Product Catalogue Expansion
-- Adds 3 new products in 'draft' status with zero premature public exposure:
--   1. prod-17: YE Stainless Steel Feeding Bottle with Handles — 250 ml (ss-bottles)
--   2. prod-18: YE Glass Sipper with Handle — 250 ml (silicone-sleeve) [Option A2 Final Identity]
--   3. prod-19: YE Premium Stainless Steel Feeding Bottle (ss-bottles)
-- Status is strictly 'draft' and is_featured = 0 to prevent edge cache poisoning.
-- No preliminary local image records are inserted; verified R2 images will be attached in Stage 4.
-- Safe and idempotent via ON CONFLICT(id) DO NOTHING.
-- =============================================================================

-- 1. Product A: YE Stainless Steel Feeding Bottle with Handles — 250 ml
INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes,
  expected_price_per_100_paise, min_order_quantity
) VALUES (
  'prod-17',
  'YE Stainless Steel Feeding Bottle with Handles — 250 ml',
  'YE हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल — 250 ml',
  'ye-stainless-steel-feeding-bottle-with-handles-250ml',
  'ss-bottles',
  'Stainless steel feeding bottle with protective transparent cap, pink collar, and twin grip handles for infants and toddlers. Features genuine YE branding and SS-304 engraving.',
  'शिशुओं और बच्चों के लिए पारदर्शी सुरक्षात्मक कैप, गुलाबी कॉलर और ग्रिप हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल। प्रामाणिक YE ब्रांडिंग और SS-304 उत्कीर्णन के साथ।',
  'SS 304 Stainless Steel',
  'YE',
  0,
  24900,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"250 ml","material":"SS 304 Stainless Steel","brand":"YE","features":"Side handles, protective cap, baby silicone teat","colour":"Silver with pink collar and handles"}',
  '[]',
  'draft',
  0,
  13,
  'YE logo and SS-304 grade clearly engraved on body. Pink collar and dual side handles.',
  1500000,
  NULL
) ON CONFLICT(id) DO NOTHING;

-- 2. Product B: YE Glass Sipper with Handle — 250 ml (Owner Approved Option A2)
INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes,
  expected_price_per_100_paise, min_order_quantity
) VALUES (
  'prod-18',
  'YE Glass Sipper with Handle — 250 ml',
  'YE हैंडल वाला ग्लास सिपर — 250 ml',
  'ye-glass-sipper-handle-250ml',
  'silicone-sleeve',
  'Glass sipper bottle encased in protective shock-absorbing star-cutout silicone sleeve with twin easy-grip training handles and hygiene dome cap.',
  'ग्लास सिपर बोतल, शॉक-एब्जॉर्बिंग स्टार-कटआउट सिलिकॉन स्लीव और ट्विन ट्रेनिंग हैंडल के साथ।',
  'Glass with Protective Silicone Star Sleeve',
  'YE',
  0,
  27500,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"250 ml","material":"Glass bottle with protective silicone star sleeve and twin training handles","brand":"YE","colours":"Turquoise sleeve with matching handles and collar ring"}',
  '[]',
  'draft',
  0,
  14,
  'Physical packaging confirms: MRP Rs 275 printed on box front panel. Turquoise silicone sleeve with star cutouts and twin handles.',
  1100000,
  NULL
) ON CONFLICT(id) DO NOTHING;

-- 3. Product C: YE Premium Stainless Steel Feeding Bottle (Base simple record prior to Stage 3 family conversion)
INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes,
  expected_price_per_100_paise, min_order_quantity
) VALUES (
  'prod-19',
  'YE Premium Stainless Steel Feeding Bottle',
  'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल',
  'ye-premium-stainless-steel-feeding-bottle',
  'ss-bottles',
  'Premium 304-grade stainless steel feeding bottle. Features polished ergonomic contour, embossed measurement graduations, silicone nipple, stainless protective cap, and official YE branding in branded retail box.',
  'प्रीमियम 304-ग्रेड स्टेनलेस स्टील फीडिंग बोतल। पॉलिश्ड आकर्षक डिजाइन, उभरी हुई मापक लाइनें, सिलिकॉन निप्पल, स्टेनलेस सुरक्षात्मक कैप और बॉक्स पैकेजिंग के साथ।',
  'SS 304 Stainless Steel',
  'YE',
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"material":"304-Grade Stainless Steel","brand":"YE","features":"Graduated measurement marks, stainless cap, silicone teat, boxed packaging"}',
  '[]',
  'draft',
  0,
  15,
  'Packaging confirms: Premium Stainless Steel Feeding Bottle, 304-Grade Stainless Steel, Made in India.',
  NULL,
  NULL
) ON CONFLICT(id) DO NOTHING;
