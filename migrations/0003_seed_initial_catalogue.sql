-- =============================================================================
-- YES ENTERPRISES — D1 Initial Catalogue Seed Migration 0003
-- Restores original 6 categories, 14 products, and 28 image asset mappings.
-- Safe against accidental re-execution via ON CONFLICT DO NOTHING.
-- =============================================================================

-- 1. CATEGORIES (6 original product lines)
INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order)
VALUES (
  'glass-bottles',
  'Glass Feeding Bottles',
  'कांच की फीडिंग बोतलें',
  'glass-bottles',
  'Glass feeding bottles in multiple sizes',
  'विभिन्न साइज़ में कांच की फीडिंग बोतलें',
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order)
VALUES (
  'plastic-bottles',
  'Plastic Feeding Bottles',
  'प्लास्टिक की फीडिंग बोतलें',
  'plastic-bottles',
  'BPA-free plastic feeding bottles in various sizes and colours',
  'BPA-फ्री प्लास्टिक की फीडिंग बोतलें, अलग-अलग साइज़ और रंगों में',
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order)
VALUES (
  'silicone-sleeve',
  'Silicone Sleeve Feeding Bottles',
  'सिलिकॉन स्लीव फीडिंग बोतलें',
  'silicone-sleeve',
  'Feeding bottles with protective silicone sleeves in multiple sizes',
  'सिलिकॉन स्लीव के साथ फीडिंग बोतलें, अलग-अलग साइज़ में',
  3
) ON CONFLICT(id) DO NOTHING;

INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order)
VALUES (
  'ss-bottles',
  'Stainless Steel Feeding Bottles',
  'स्टेनलेस स्टील फीडिंग बोतलें',
  'ss-bottles',
  'SS 304 grade stainless steel feeding bottles in multiple capacities',
  'SS 304 ग्रेड स्टेनलेस स्टील फीडिंग बोतलें, अलग-अलग क्षमता में',
  4
) ON CONFLICT(id) DO NOTHING;

INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order)
VALUES (
  'ss-sippers',
  'Stainless Steel Sippers and Water Bottles',
  'स्टेनलेस स्टील सिपर और पानी की बोतलें',
  'ss-sippers',
  'Stainless steel sippers and water bottles for retail and wholesale supply',
  'रिटेल और थोक सप्लाई के लिए स्टेनलेस स्टील सिपर और पानी की बोतलें',
  5
) ON CONFLICT(id) DO NOTHING;

INSERT INTO categories (id, name, name_hi, slug, description, description_hi, sort_order)
VALUES (
  'ss-tiffin',
  'Stainless Steel Tiffin Boxes',
  'स्टेनलेस स्टील टिफिन बॉक्स',
  'ss-tiffin',
  'Durable stainless steel tiffin and lunch box sets in multiple sizes',
  'अलग-अलग साइज़ में टिकाऊ स्टेनलेस स्टील टिफिन और लंच बॉक्स सेट',
  6
) ON CONFLICT(id) DO NOTHING;

-- 2. PRODUCTS (14 original catalogued products)
INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-01',
  'Glass Feeding Bottle — 250 ml (Blue)',
  'कांच की फीडिंग बोतल — 250 ml (नीली)',
  'glass-feeding-bottle-250ml-blue',
  'glass-bottles',
  'Glass feeding bottle with blue cap and cartoon print. Available for wholesale enquiries.',
  'नीली कैप और प्रिंट वाली कांच की फीडिंग बोतल (250 ml)। थोक ऑर्डर के लिए संपर्क करें।',
  'Glass',
  'Moon Baby',
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"250 ml","colours":["Blue cap, clear body"],"material":"Glass","brand":"Moon Baby","notes":"Moon Baby branding visible on label. BPA Free marked."}',
  '[]',
  'active',
  1,
  1,
  'Moon Baby branding visible on label. BPA Free marked.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-02',
  'Glass Feeding Bottle — 60 ml (Pink)',
  'कांच की फीडिंग बोतल — 60 ml (गुलाबी)',
  'glass-feeding-bottle-60ml-pink',
  'glass-bottles',
  'Small glass feeding bottle for newborns, with pink cap. Available for wholesale enquiries.',
  'नवजात शिशुओं के लिए छोटी कांच की फीडिंग बोतल, गुलाबी कैप (60 ml)। थोक ऑर्डर के लिए संपर्क करें।',
  'Glass',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"60 ml","colours":["Pink cap, clear body"],"material":"Glass","brand":null,"notes":"BPA Free marked. Approx 60 ml capacity visible on bottle."}',
  '[]',
  'active',
  0,
  2,
  'BPA Free marked. Approx 60 ml capacity visible on bottle.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-08',
  'Glass Feeding Bottle — 250 ml (Red)',
  'कांच की फीडिंग बोतल — 250 ml (लाल)',
  'glass-feeding-bottle-250ml-red',
  'glass-bottles',
  'Clear glass feeding bottle with red cap and printed cartoon design. Contact us for wholesale pricing.',
  'लाल कैप और प्रिंट वाली कांच की फीडिंग बोतल (250 ml)। थोक रेट के लिए संपर्क करें।',
  'Glass',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"250 ml","colours":["Red cap, clear body"],"material":"Glass","brand":null,"notes":null}',
  '[]',
  'active',
  0,
  3,
  NULL
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-11',
  'Glass Feeding Bottle — 120 ml (Blue)',
  'कांच की फीडिंग बोतल — 120 ml (नीली)',
  'glass-feeding-bottle-120ml-blue',
  'glass-bottles',
  'Short glass feeding bottle with blue cap and cloud print. Available for wholesale orders.',
  'नीली कैप और क्लाउड प्रिंट वाली कांच की छोटी फीडिंग बोतल (120 ml)। थोक ऑर्डर के लिए संपर्क करें।',
  'Glass',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"120 ml","colours":["Blue cap, clear body"],"material":"Glass","brand":null,"notes":null}',
  '[]',
  'active',
  0,
  4,
  NULL
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-03',
  'Plastic Feeding Bottle — 125 ml (Teal)',
  'प्लास्टिक फीडिंग बोतल — 125 ml (हरी)',
  'plastic-feeding-bottle-125ml-teal',
  'plastic-bottles',
  'BPA-free frosted plastic feeding bottle with teal/green cap and measurement markings. Contact us for wholesale pricing.',
  'BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल, हरी कैप के साथ (125 ml)। थोक रेट के लिए संपर्क करें।',
  'BPA-Free Plastic',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"125 ml","colours":["Teal/green cap, frosted body"],"material":"BPA-Free Plastic","brand":null,"notes":"BPA Free marked. Made in India label visible."}',
  '[]',
  'active',
  0,
  5,
  'BPA Free marked. Made in India label visible.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-04',
  'Plastic Feeding Bottle — 120 ml with Handles (Blue)',
  'प्लास्टिक फीडिंग बोतल — 120 ml हैंडल के साथ (नीली)',
  'plastic-feeding-bottle-120ml-handles-blue',
  'plastic-bottles',
  'BPA-free frosted plastic feeding bottle with two side handles and blue cap. Ideal for toddlers. Contact for wholesale orders.',
  'दोनों तरफ हैंडल वाली BPA-फ्री प्लास्टिक फीडिंग बोतल, नीली कैप (120 ml)। थोक ऑर्डर के लिए संपर्क करें।',
  'BPA-Free Plastic',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"120 ml","colours":["Blue cap, frosted body"],"material":"BPA-Free Plastic","brand":null,"notes":"BPA Free marked. Two integrated side handles visible."}',
  '[]',
  'active',
  0,
  6,
  'BPA Free marked. Two integrated side handles visible.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-06',
  'Plastic Feeding Bottle — 120 ml (Red)',
  'प्लास्टिक फीडिंग बोतल — 120 ml (लाल)',
  'plastic-feeding-bottle-120ml-red',
  'plastic-bottles',
  'BPA-free frosted plastic feeding bottle with red cap and weather print design. Available for wholesale orders.',
  'लाल कैप वाली BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल (120 ml)। थोक ऑर्डर के लिए संपर्क करें।',
  'BPA-Free Plastic',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"120 ml","colours":["Red cap, frosted body"],"material":"BPA-Free Plastic","brand":null,"notes":"BPA Free marked."}',
  '[]',
  'active',
  0,
  7,
  'BPA Free marked.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-09',
  'Plastic Feeding Bottle — 250 ml (Red)',
  'प्लास्टिक फीडिंग बोतल — 250 ml (लाल)',
  'plastic-feeding-bottle-250ml-red',
  'plastic-bottles',
  'Large BPA-free frosted plastic feeding bottle with red cap. Contact for wholesale pricing and availability.',
  'बड़ी BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल, लाल कैप (250 ml)। थोक रेट के लिए संपर्क करें।',
  'BPA-Free Plastic',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"250 ml","colours":["Red cap, frosted body"],"material":"BPA-Free Plastic","brand":null,"notes":"Dust cap shown separately in primary image."}',
  '[]',
  'active',
  0,
  8,
  'Dust cap shown separately in primary image.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-13',
  'Plastic Feeding Bottle — 250 ml with Handles (Blue)',
  'प्लास्टिक फीडिंग बोतल — 250 ml हैंडल के साथ (नीली)',
  'plastic-feeding-bottle-250ml-handles-blue',
  'plastic-bottles',
  'Large BPA-free frosted plastic feeding bottle with handles and blue cap. Designed for older infants. Contact for wholesale orders.',
  'हैंडल और नीली कैप के साथ बड़ी BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल (250 ml)। थोक ऑर्डर के लिए संपर्क करें।',
  'BPA-Free Plastic',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"250 ml","colours":["Blue cap, frosted body"],"material":"BPA-Free Plastic","brand":null,"notes":"Dust cap shown separately. Handles visible on both sides."}',
  '[]',
  'active',
  1,
  9,
  'Dust cap shown separately. Handles visible on both sides.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-05',
  'Silicone Sleeve Feeding Bottle — 250 ml',
  'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml',
  'silicone-sleeve-feeding-bottle-250ml',
  'silicone-sleeve',
  'Feeding bottle with star-pattern silicone sleeve and easy-grip design, available in 250 ml. Contact for wholesale pricing and colour variants.',
  'स्टार पैटर्न सिलिकॉन स्लीव वाली फीडिंग बोतल (250 ml)। नीले और हरे रंग में उपलब्ध। थोक रेट के लिए संपर्क करें।',
  'Silicone sleeve; inner body material unconfirmed',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"250 ml","colours":["Blue sleeve","Green sleeve","Sky blue sleeve"],"material":"Silicone sleeve; inner body material unconfirmed","brand":null,"notes":"Inner body material (glass or plastic) cannot be confirmed from images alone. Described neutrally."}',
  '[]',
  'active',
  1,
  10,
  'Inner body material (glass or plastic) cannot be confirmed from images alone. Described neutrally.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-07',
  'Silicone Sleeve Feeding Bottle — 120 ml',
  'सिलिकॉन स्लीव फीडिंग बोतल — 120 ml',
  'silicone-sleeve-feeding-bottle-120ml',
  'silicone-sleeve',
  'Compact feeding bottle with star-pattern silicone sleeve, available in 120 ml with and without handles. Contact for wholesale pricing.',
  'स्टार पैटर्न सिलिकॉन स्लीव वाली छोटी फीडिंग बोतल (120 ml)। हैंडल के साथ और बिना हैंडल दोनों विकल्प उपलब्ध। थोक रेट के लिए संपर्क करें।',
  'Silicone sleeve; inner body material unconfirmed',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"120 ml","colours":["Green/mint sleeve","Red sleeve"],"material":"Silicone sleeve; inner body material unconfirmed","brand":null,"notes":"Inner body material (glass or plastic) cannot be confirmed from images alone. Described neutrally."}',
  '[]',
  'active',
  0,
  11,
  'Inner body material (glass or plastic) cannot be confirmed from images alone. Described neutrally.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-14',
  'SS 304 Stainless Steel Feeding Bottle',
  'SS 304 स्टेनलेस स्टील फीडिंग बोतल',
  'stainless-steel-feeding-bottle-ss304',
  'ss-bottles',
  'SS 304 stainless steel feeding bottle with YE branding, available in 150 ml, 200 ml, 250 ml and 300 ml. Contact for wholesale pricing.',
  'YE ब्रांड की SS 304 स्टेनलेस स्टील फीडिंग बोतल — 150 ml, 200 ml, 250 ml और 300 ml में उपलब्ध। थोक रेट के लिए संपर्क करें।',
  'SS 304 Stainless Steel',
  'YE',
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"150 ml, 200 ml, 250 ml, 300 ml","colours":["Silver"],"material":"SS 304 Stainless Steel","brand":"YE","notes":"YE logo and SS 304 grade clearly engraved on bottle. Studio-quality render images."}',
  '[]',
  'active',
  1,
  12,
  'YE logo and SS 304 grade clearly engraved on bottle. Studio-quality render images.'
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-15',
  'Stainless Steel Tiffin Box Set',
  'स्टेनलेस स्टील टिफिन बॉक्स सेट',
  'stainless-steel-tiffin-box-set',
  'ss-tiffin',
  'Stainless steel tiffin / lunch box set with teal silicone clip-lock lid, available in two sizes. Contact for wholesale enquiries.',
  'टील सिलिकॉन क्लिप-लॉक ढक्कन के साथ स्टेनलेस स्टील टिफिन बॉक्स सेट, दो साइज़ में। थोक ऑर्डर के लिए संपर्क करें।',
  'Stainless Steel',
  NULL,
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":"Two sizes (small + large)","colours":["Silver body with teal clips"],"material":"Stainless Steel","brand":null,"notes":null}',
  '[]',
  'active',
  1,
  13,
  NULL
) ON CONFLICT(id) DO NOTHING;

INSERT INTO products (
  id, name, name_hi, slug, category_id, description, description_hi,
  material, brand, has_variants, base_price_paise, compare_at_price_paise,
  sku, stock_quantity, low_stock_threshold, specifications_json,
  variant_attributes_schema_json, status, is_featured, sort_order, notes
) VALUES (
  'prod-16',
  'Stainless Steel Vacuum Sipper',
  'स्टेनलेस स्टील वैक्यूम सिपर',
  'stainless-steel-vacuum-sipper',
  'ss-sippers',
  'Cola-shaped stainless steel sipper / water bottle with YE branding engraved. Contact for wholesale pricing.',
  'YE ब्रांड एनग्रेव किया हुआ स्टेनलेस स्टील सिपर / वाटर बोतल। थोक रेट के लिए संपर्क करें।',
  'Stainless Steel',
  'YE',
  0,
  NULL,
  NULL,
  NULL,
  0,
  5,
  '{"capacity":null,"colours":["Silver"],"material":"Stainless Steel","brand":"YE","notes":"YE logo engraved — visible in close-up image. Vacuum insulation unconfirmed by manufacturer — update site.config.js when confirmed."}',
  '[]',
  'active',
  0,
  14,
  'YE logo engraved — visible in close-up image. Vacuum insulation unconfirmed by manufacturer — update site.config.js when confirmed.'
) ON CONFLICT(id) DO NOTHING;

-- 3. PRODUCT IMAGES (28 static image mappings)
INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-01-1',
  'prod-01',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.51 PM.jpeg',
  'Glass feeding bottle 250ml blue cap',
  'कांच की फीडिंग बोतल — 250 ml (नीली)',
  'image/jpeg',
  51359,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-02-1',
  'prod-02',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.51 PM (1).jpeg',
  'Glass feeding bottle 60ml pink cap',
  'कांच की फीडिंग बोतल — 60 ml (गुलाबी)',
  'image/jpeg',
  30592,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-08-1',
  'prod-08',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg',
  'Glass feeding bottle 250ml red cap',
  'कांच की फीडिंग बोतल — 250 ml (लाल)',
  'image/jpeg',
  85576,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-08-2',
  'prod-08',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (2).jpeg',
  'Glass feeding bottle 250ml red cap alternate angle',
  'कांच की फीडिंग बोतल — 250 ml (लाल) (दृश्य 2)',
  'image/jpeg',
  96771,
  960,
  1280,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-11-1',
  'prod-11',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (2).jpeg',
  'Glass feeding bottle 120ml blue cap',
  'कांच की फीडिंग बोतल — 120 ml (नीली)',
  'image/jpeg',
  59330,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-11-2',
  'prod-11',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (3).jpeg',
  'Glass feeding bottle 120ml blue cap butterfly print',
  'कांच की फीडिंग बोतल — 120 ml (नीली) (दृश्य 2)',
  'image/jpeg',
  63507,
  960,
  1280,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-03-1',
  'prod-03',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM.jpeg',
  'Plastic feeding bottle 125ml teal cap',
  'प्लास्टिक फीडिंग बोतल — 125 ml (हरी)',
  'image/jpeg',
  45798,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-04-1',
  'prod-04',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (1).jpeg',
  'Plastic feeding bottle 120ml with handles blue cap',
  'प्लास्टिक फीडिंग बोतल — 120 ml हैंडल के साथ (नीली)',
  'image/jpeg',
  76384,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-06-1',
  'prod-06',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (3).jpeg',
  'Plastic feeding bottle 120ml red cap',
  'प्लास्टिक फीडिंग बोतल — 120 ml (लाल)',
  'image/jpeg',
  55231,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-09-1',
  'prod-09',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (1).jpeg',
  'Plastic feeding bottle 250ml red cap',
  'प्लास्टिक फीडिंग बोतल — 250 ml (लाल)',
  'image/jpeg',
  58357,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-09-2',
  'prod-09',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (3).jpeg',
  'Plastic feeding bottle 250ml alternate angle',
  'प्लास्टिक फीडिंग बोतल — 250 ml (लाल) (दृश्य 2)',
  'image/jpeg',
  60527,
  960,
  1280,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-13-1',
  'prod-13',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM.jpeg',
  'Plastic feeding bottle 250ml with handles blue cap',
  'प्लास्टिक फीडिंग बोतल — 250 ml हैंडल के साथ (नीली)',
  'image/jpeg',
  81556,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-05-1',
  'prod-05',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg',
  'Silicone sleeve feeding bottles 250ml pair blue and green',
  'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml',
  'image/jpeg',
  97366,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-05-2',
  'prod-05',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM.jpeg',
  'Silicone sleeve feeding bottle 250ml blue single',
  'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml (दृश्य 2)',
  'image/jpeg',
  67089,
  960,
  1280,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-05-3',
  'prod-05',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (2).jpeg',
  'Silicone sleeve feeding bottle 250ml sky blue',
  'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml (दृश्य 3)',
  'image/jpeg',
  67954,
  960,
  1280,
  0,
  3
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-05-4',
  'prod-05',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (3).jpeg',
  'Silicone sleeve feeding bottle 250ml with spare cap',
  'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml (दृश्य 4)',
  'image/jpeg',
  76607,
  960,
  1280,
  0,
  4
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-07-1',
  'prod-07',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (1).jpeg',
  'Silicone sleeve feeding bottle 120ml mint green',
  'सिलिकॉन स्लीव फीडिंग बोतल — 120 ml',
  'image/jpeg',
  48186,
  960,
  1280,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-07-2',
  'prod-07',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM.jpeg',
  'Silicone sleeve feeding bottle 120ml red with handles',
  'सिलिकॉन स्लीव फीडिंग बोतल — 120 ml (दृश्य 2)',
  'image/jpeg',
  70105,
  960,
  1280,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-07-3',
  'prod-07',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (1).jpeg',
  'Silicone sleeve feeding bottle 120ml red handles alternate',
  'सिलिकॉन स्लीव फीडिंग बोतल — 120 ml (दृश्य 3)',
  'image/jpeg',
  66774,
  960,
  1280,
  0,
  3
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-14-1',
  'prod-14',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg',
  'SS 304 stainless steel feeding bottle YE logo',
  'SS 304 स्टेनलेस स्टील फीडिंग बोतल',
  'image/jpeg',
  53809,
  864,
  1024,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-14-2',
  'prod-14',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (1).jpeg',
  'SS 304 stainless steel feeding bottle 300ml',
  'SS 304 स्टेनलेस स्टील फीडिंग बोतल (दृश्य 2)',
  'image/jpeg',
  42170,
  876,
  1024,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-14-3',
  'prod-14',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (2).jpeg',
  'SS 304 stainless steel feeding bottle 250ml',
  'SS 304 स्टेनलेस स्टील फीडिंग बोतल (दृश्य 3)',
  'image/jpeg',
  40487,
  880,
  1024,
  0,
  3
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-14-4',
  'prod-14',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (3).jpeg',
  'SS 304 stainless steel feeding bottle 200ml',
  'SS 304 स्टेनलेस स्टील फीडिंग बोतल (दृश्य 4)',
  'image/jpeg',
  41133,
  868,
  1024,
  0,
  4
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-14-5',
  'prod-14',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM.jpeg',
  'SS 304 stainless steel feeding bottle 150ml',
  'SS 304 स्टेनलेस स्टील फीडिंग बोतल (दृश्य 5)',
  'image/jpeg',
  49436,
  876,
  1024,
  0,
  5
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-15-1',
  'prod-15',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg',
  'Stainless steel tiffin box set studio',
  'स्टेनलेस स्टील टिफिन बॉक्स सेट',
  'image/jpeg',
  104086,
  1080,
  735,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-15-2',
  'prod-15',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (3).jpeg',
  'Stainless steel tiffin box set open with food',
  'स्टेनलेस स्टील टिफिन बॉक्स सेट (दृश्य 2)',
  'image/jpeg',
  155885,
  1080,
  729,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-16-1',
  'prod-16',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM.jpeg',
  'Stainless steel vacuum sipper YE',
  'स्टेनलेस स्टील वैक्यूम सिपर',
  'image/jpeg',
  145260,
  1080,
  1451,
  1,
  1
) ON CONFLICT(id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, variant_id, image_key, alt_text, alt_text_hi,
  mime_type, file_size_bytes, width, height, is_primary, sort_order
) VALUES (
  'img-prod-16-2',
  'prod-16',
  NULL,
  '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM (1).jpeg',
  'Stainless steel sipper YE logo engraved closeup',
  'स्टेनलेस स्टील वैक्यूम सिपर (दृश्य 2)',
  'image/jpeg',
  89345,
  978,
  785,
  0,
  2
) ON CONFLICT(id) DO NOTHING;

