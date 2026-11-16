/**
 * YES ENTERPRISES — Synthetic Test Fixtures Seeder
 * Seeds isolated synthetic fixtures (test-var-*, test-simple-*) into local D1 SQLite.
 * Does NOT touch real catalogue products.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const d1Dir = path.resolve('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbFiles = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
if (dbFiles.length === 0) {
  throw new Error(`No SQLite database found in ${d1Dir}`);
}

// Find the database with the most recent migrations
let targetDbPath = null;
let maxMigId = 0;
for (const f of dbFiles) {
  const p = path.join(d1Dir, f);
  try {
    const testDb = new DatabaseSync(p);
    const hasTable = testDb.prepare("SELECT count(*) as count FROM sqlite_master WHERE name='d1_migrations'").get();
    if (hasTable.count > 0) {
      const maxRow = testDb.prepare("SELECT MAX(id) as max_id FROM d1_migrations").get();
      if (maxRow && maxRow.max_id > maxMigId) {
        maxMigId = maxRow.max_id;
        targetDbPath = p;
      }
    }
    testDb.close();
  } catch {}
}

if (!targetDbPath) {
  throw new Error('Could not identify target local D1 database.');
}

console.log(`Using local D1 SQLite database: ${path.basename(targetDbPath)}`);
const db = new DatabaseSync(targetDbPath);

export function cleanSyntheticFixtures() {
  console.log('Cleaning existing synthetic test fixtures...');
  const delSnapshots = db.prepare("DELETE FROM product_conversion_snapshots WHERE product_id LIKE 'test-%'").run();
  const delImages = db.prepare("DELETE FROM product_images WHERE product_id LIKE 'test-%'").run();
  const delVariants = db.prepare("DELETE FROM product_variants WHERE product_id LIKE 'test-%'").run();
  const delProducts = db.prepare("DELETE FROM products WHERE id LIKE 'test-%'").run();
  console.log(`Cleaned: ${delProducts.changes} products, ${delVariants.changes} variants, ${delImages.changes} images, ${delSnapshots.changes} snapshots.`);
}

export function seedSyntheticFixtures() {
  cleanSyntheticFixtures();

  console.log('Seeding synthetic test fixtures for Phase 11.3...');

  // 1. test-var-straight (4 active variants, 1 dedicated image, 1 shared fallback, nullable MOQ)
  db.prepare(`
    INSERT INTO products (
      id, name, name_hi, slug, category_id, description, description_hi,
      material, brand, has_variants, base_price_paise, compare_at_price_paise,
      expected_price_per_100_paise, min_order_quantity, sku, stock_quantity,
      low_stock_threshold, status, is_featured, sort_order
    ) VALUES (
      'test-var-straight',
      'Synthetic SS Straight Bottle Family',
      'सिंथेटिक एसएस स्ट्रेट बोतल फैमिली',
      'synthetic-ss-straight-bottle',
      'ss-bottles',
      'Synthetic 4-variant family testing lowest-capacity preselection and dual pricing.',
      'सिंथेटिक 4-वेरिएंट उत्पाद विवरण।',
      'SS 304 Food Grade',
      'YES ENTERPRISES',
      1, NULL, NULL, NULL, NULL, NULL, 0, 5, 'active', 1, 101
    )
  `).run();

  const strVariants = [
    { id: 'var-synth-str-150', title: '150 ml', title_hi: '150 ml', sku: 'TEST-STR-150', price: 35000, p100: 1350000, moq: 10, sort: 0 },
    { id: 'var-synth-str-200', title: '200 ml', title_hi: '200 ml', sku: 'TEST-STR-200', price: 39900, p100: 1450000, moq: null, sort: 1 },
    { id: 'var-synth-str-250', title: '250 ml', title_hi: '250 ml', sku: 'TEST-STR-250', price: 44900, p100: 1550000, moq: 25, sort: 2 },
    { id: 'var-synth-str-300', title: '300 ml', title_hi: '300 ml', sku: 'TEST-STR-300', price: 49900, p100: 1650000, moq: 50, sort: 3 },
  ];

  for (const v of strVariants) {
    db.prepare(`
      INSERT INTO product_variants (
        id, product_id, sku, title, title_hi, attributes_json,
        price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
        stock_quantity, low_stock_threshold, status, sort_order
      ) VALUES (
        ?, 'test-var-straight', ?, ?, ?, '{"capacity":"' || ? || '"}',
        ?, NULL, ?, ?,
        100, 5, 'active', ?
      )
    `).run(v.id, v.sku, v.title, v.title_hi, v.title, v.price, v.p100, v.moq, v.sort);
  }

  // Images for test-var-straight: 1 shared family, 1 dedicated for 150ml
  db.prepare(`
    INSERT INTO product_images (
      id, product_id, variant_id, image_key, alt_text, alt_text_hi,
      mime_type, file_size_bytes, is_primary, sort_order
    ) VALUES (
      'img-synth-str-shared', 'test-var-straight', NULL,
      'assets/WhatsApp Image 2026-11-16 at 9.28.42 AM.jpeg',
      'Shared Family Hero Photo', 'साझा परिवार मुख्य फोटो',
      'image/jpeg', 102400, 1, 0
    )
  `).run();

  db.prepare(`
    INSERT INTO product_images (
      id, product_id, variant_id, image_key, alt_text, alt_text_hi,
      mime_type, file_size_bytes, is_primary, sort_order
    ) VALUES (
      'img-synth-str-150', 'test-var-straight', 'var-synth-str-150',
      'assets/WhatsApp Image 2026-11-16 at 9.28.42 AM (1).jpeg',
      'Dedicated 150ml Capacity Photo', 'समर्पित 150 मिलीलीटर फोटो',
      'image/jpeg', 102400, 1, 1
    )
  `).run();

  // 2. test-var-contoured (2 active variants)
  db.prepare(`
    INSERT INTO products (
      id, name, name_hi, slug, category_id, description, description_hi,
      material, brand, has_variants, base_price_paise, compare_at_price_paise,
      expected_price_per_100_paise, min_order_quantity, sku, stock_quantity,
      low_stock_threshold, status, is_featured, sort_order
    ) VALUES (
      'test-var-contoured',
      'Synthetic Premium Contoured Bottle Family',
      'सिंथेटिक प्रीमियम कंटूरेड बोतल फैमिली',
      'synthetic-premium-contoured-bottle',
      'ss-bottles',
      'Synthetic 2-variant ergonomic contoured bottle family.',
      'सिंथेटिक 2-वेरिएंट विवरण।',
      'SS 304 Food Grade',
      'YES ENTERPRISES',
      1, NULL, NULL, NULL, NULL, NULL, 0, 5, 'active', 0, 102
    )
  `).run();

  const cntVariants = [
    { id: 'var-synth-cnt-200', title: '200 ml', title_hi: '200 ml', sku: 'TEST-CNT-200', price: 54900, p100: 1900000, moq: null, sort: 0 },
    { id: 'var-synth-cnt-250', title: '250 ml', title_hi: '250 ml', sku: 'TEST-CNT-250', price: 59900, p100: 1990000, moq: 20, sort: 1 },
  ];

  for (const v of cntVariants) {
    db.prepare(`
      INSERT INTO product_variants (
        id, product_id, sku, title, title_hi, attributes_json,
        price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
        stock_quantity, low_stock_threshold, status, sort_order
      ) VALUES (
        ?, 'test-var-contoured', ?, ?, ?, '{"capacity":"' || ? || '"}',
        ?, NULL, ?, ?,
        50, 5, 'active', ?
      )
    `).run(v.id, v.sku, v.title, v.title_hi, v.title, v.price, v.p100, v.moq, v.sort);
  }

  db.prepare(`
    INSERT INTO product_images (
      id, product_id, variant_id, image_key, alt_text, alt_text_hi,
      mime_type, file_size_bytes, is_primary, sort_order
    ) VALUES (
      'img-synth-cnt-shared', 'test-var-contoured', NULL,
      'assets/WhatsApp Image 2026-11-16 at 9.28.38 AM.jpeg',
      'Contoured Family Photo', 'कंटूरेड फैमिली फोटो',
      'image/jpeg', 102400, 1, 0
    )
  `).run();

  // 3. test-var-cola (3 active variants + 1 archived variant)
  db.prepare(`
    INSERT INTO products (
      id, name, name_hi, slug, category_id, description, description_hi,
      material, brand, has_variants, base_price_paise, compare_at_price_paise,
      expected_price_per_100_paise, min_order_quantity, sku, stock_quantity,
      low_stock_threshold, status, is_featured, sort_order
    ) VALUES (
      'test-var-cola',
      'Synthetic Vacuum Cola Bottle Family',
      'सिंथेटिक वैक्यूम कोला बोतल फैमिली',
      'synthetic-vacuum-cola-bottle',
      'ss-sippers',
      'Synthetic 3-active + 1-archived variant testing exclusion of archived variants.',
      'सिंथेटिक वैक्यूम कोला विवरण।',
      'Double Wall Insulated SS 304',
      'YES ENTERPRISES',
      1, NULL, NULL, NULL, NULL, NULL, 0, 5, 'active', 1, 103
    )
  `).run();

  const colaVariants = [
    { id: 'var-synth-cola-500', title: '500 ml', title_hi: '500 ml', sku: 'TEST-COLA-500', price: 59900, p100: 3490000, moq: 12, status: 'active', sort: 0 },
    { id: 'var-synth-cola-750', title: '750 ml', title_hi: '750 ml', sku: 'TEST-COLA-750', price: 64900, p100: 3650000, moq: 12, status: 'active', sort: 1 },
    { id: 'var-synth-cola-1000', title: '1 Litre', title_hi: '1 लीटर', sku: 'TEST-COLA-1000', price: 79900, p100: 3990000, moq: 12, status: 'active', sort: 2 },
    { id: 'var-synth-cola-archived', title: '250 ml (Archived)', title_hi: '250 ml (संग्रहीत)', sku: 'TEST-COLA-250-ARCH', price: 49900, p100: 2800000, moq: null, status: 'archived', sort: 99 },
  ];

  for (const v of colaVariants) {
    db.prepare(`
      INSERT INTO product_variants (
        id, product_id, sku, title, title_hi, attributes_json,
        price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,
        stock_quantity, low_stock_threshold, status, sort_order
      ) VALUES (
        ?, 'test-var-cola', ?, ?, ?, '{"capacity":"' || ? || '"}',
        ?, NULL, ?, ?,
        40, 5, ?, ?
      )
    `).run(v.id, v.sku, v.title, v.title_hi, v.title, v.price, v.p100, v.moq, v.status, v.sort);
  }

  db.prepare(`
    INSERT INTO product_images (
      id, product_id, variant_id, image_key, alt_text, alt_text_hi,
      mime_type, file_size_bytes, is_primary, sort_order
    ) VALUES (
      'img-synth-cola-shared', 'test-var-cola', NULL,
      'assets/WhatsApp Image 2026-11-16 at 9.28.30 AM.jpeg',
      'Cola Family Photo', 'कोला फैमिली फोटो',
      'image/jpeg', 102400, 1, 0
    )
  `).run();

  // 4. test-simple-fixture (Simple product without variants)
  db.prepare(`
    INSERT INTO products (
      id, name, name_hi, slug, category_id, description, description_hi,
      material, brand, has_variants, base_price_paise, compare_at_price_paise,
      expected_price_per_100_paise, min_order_quantity, sku, stock_quantity,
      low_stock_threshold, status, is_featured, sort_order
    ) VALUES (
      'test-simple-fixture',
      'Synthetic Standard Glass Bottle (Simple)',
      'सिंथेटिक स्टैंडर्ड ग्लास बोतल',
      'synthetic-standard-glass-bottle-simple',
      'glass-bottles',
      'Synthetic simple product testing baseline single-price and MOQ behaviour.',
      'सिंथेटिक साधारण उत्पाद विवरण।',
      'Borosilicate Glass',
      'YES ENTERPRISES',
      0, 27500, NULL, 1100000, 24, 'TEST-SMPL-01', 100, 5, 'active', 0, 104
    )
  `).run();

  db.prepare(`
    INSERT INTO product_images (
      id, product_id, variant_id, image_key, alt_text, alt_text_hi,
      mime_type, file_size_bytes, is_primary, sort_order
    ) VALUES (
      'img-synth-smpl-shared', 'test-simple-fixture', NULL,
      'assets/WhatsApp Image 2026-11-16 at 9.28.32 AM.jpeg',
      'Simple Glass Bottle Photo', 'सिंपल ग्लास बोतल फोटो',
      'image/jpeg', 102400, 1, 0
    )
  `).run();

  // 5. test-var-rollback (Baseline simple product ready for rollback testing)
  db.prepare(`
    INSERT INTO products (
      id, name, name_hi, slug, category_id, description, description_hi,
      material, brand, has_variants, base_price_paise, compare_at_price_paise,
      expected_price_per_100_paise, min_order_quantity, sku, stock_quantity,
      low_stock_threshold, status, is_featured, sort_order
    ) VALUES (
      'test-var-rollback',
      'Synthetic Rollback Baseline Product',
      'सिंथेटिक रोलबैक बेसलाइन उत्पाद',
      'synthetic-rollback-baseline-product',
      'ss-bottles',
      'Synthetic simple product testing non-destructive snapshot creation and rollback restoration.',
      'सिंथेटिक रोलबैक उत्पाद।',
      'SS 304 Food Grade',
      'YES ENTERPRISES',
      0, 25000, NULL, 2000000, 15, 'TEST-RLBK-01', 80, 5, 'active', 0, 105
    )
  `).run();

  db.prepare(`
    INSERT INTO product_images (
      id, product_id, variant_id, image_key, alt_text, alt_text_hi,
      mime_type, file_size_bytes, is_primary, sort_order
    ) VALUES (
      'img-synth-rlbk-shared', 'test-var-rollback', NULL,
      'assets/WhatsApp Image 2026-11-16 at 9.28.33 AM.jpeg',
      'Rollback Baseline Photo', 'रोलबैक बेसलाइन फोटो',
      'image/jpeg', 102400, 1, 0
    )
  `).run();

  console.log('Successfully seeded 5 synthetic fixtures (test-var-* & test-simple-*) with 0 modifications to real catalogue records.');
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('seed-synthetic-fixtures.mjs')) {
  if (process.argv.includes('--clean')) {
    cleanSyntheticFixtures();
  } else {
    seedSyntheticFixtures();
  }
}
