-- =============================================================================
-- YES ENTERPRISES — D1 Schema & Data Migration 0010
-- Strictly Enforce 10 Active Public Catalogue Cards and 7 Preserved Drafts
-- =============================================================================

-- 1. Correct prod-17 (Stainless Steel Feeding Bottle with Handles) to ss-bottles
UPDATE products
SET category_id = 'ss-bottles',
    name = 'YE Stainless Steel Feeding Bottle with Handles — 250 ml',
    name_hi = 'YE हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल — 250 ml',
    material = 'SS 304 Stainless Steel',
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-17';

-- 2. Correct prod-16 (Vacuum Cola Water Bottle Family) to ss-water-bottles
UPDATE products
SET category_id = 'ss-water-bottles',
    name = 'Stainless Steel Vacuum Cola Water Bottle Family',
    name_hi = 'स्टेनलेस स्टील वैक्यूम कोला पानी की बोतल फैमिली',
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-16';

-- 3. Restore Plastic Feeding Bottles to plastic-bottles category and draft status
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

-- 4. Set prod-08 and prod-11 to draft status
UPDATE products
SET name = 'Glass Feeding Bottle — 250 ml (Red)',
    name_hi = 'कांच की फीडिंग बोतल — 250 ml (लाल)',
    slug = 'glass-feeding-bottle-250ml-red',
    category_id = 'glass-bottles',
    material = 'Glass',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-08';

UPDATE products
SET name = 'Glass Feeding Bottle — 120 ml (Blue)',
    name_hi = 'कांच की फीडिंग बोतल — 120 ml (नीली)',
    slug = 'glass-feeding-bottle-120ml-blue',
    category_id = 'glass-bottles',
    material = 'Glass',
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-11';

-- 5. Confirm prod-01 and the remaining 9 active products
UPDATE products
SET name = 'Glass Feeding Bottle — 250 ml',
    name_hi = 'कांच की फीडिंग बोतल — 250 ml',
    category_id = 'glass-bottles',
    material = 'Clear Glass with screen print and etched scale',
    has_variants = 1,
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'prod-01';

UPDATE products SET status = 'active', category_id = 'glass-bottles' WHERE id = 'prod-02';
UPDATE products SET status = 'active', category_id = 'silicone-sleeve' WHERE id = 'prod-05';
UPDATE products SET status = 'active', category_id = 'silicone-sleeve' WHERE id = 'prod-07';
UPDATE products SET status = 'active', category_id = 'ss-bottles' WHERE id = 'prod-14';
UPDATE products SET status = 'active', category_id = 'ss-tiffin' WHERE id = 'prod-15';
UPDATE products SET status = 'active', category_id = 'silicone-sleeve' WHERE id = 'prod-18';
UPDATE products SET status = 'active', category_id = 'ss-bottles' WHERE id = 'prod-19';
