import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import { validateProductInput } from '../functions/_shared/product-validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6a1b3b744fa3757d88c3c37a6e58dbe029fc1f0fedf109567181075521f4e00c.sqlite');

console.log('=================================================================');
console.log('YES ENTERPRISES — MOQ, Availability & Mobile Refinement Suite');
console.log('=================================================================');

const db = new DatabaseSync(dbPath);
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

try {
  // 1. Validation tests for min_order_quantity
  console.log('\n--- 1. Validation Logic for MOQ ---');
  const validNull = validateProductInput({ name: 'Test Bottle', category_id: 'glass-bottles', min_order_quantity: null });
  assert(validNull.valid, 'Allow null min_order_quantity');
  assert(validNull.data.min_order_quantity === null, 'Sets min_order_quantity to null');

  const validEmpty = validateProductInput({ name: 'Test Bottle', category_id: 'glass-bottles', min_order_quantity: '' });
  assert(validEmpty.valid, 'Allow empty string min_order_quantity');
  assert(validEmpty.data.min_order_quantity === null, 'Converts empty string min_order_quantity to null');

  const validNum = validateProductInput({ name: 'Test Bottle', category_id: 'glass-bottles', min_order_quantity: 100 });
  assert(validNum.valid, 'Allow positive integer min_order_quantity');
  assert(validNum.data.min_order_quantity === 100, 'Preserves integer min_order_quantity 100');

  const validStrNum = validateProductInput({ name: 'Test Bottle', category_id: 'glass-bottles', min_order_quantity: '50' });
  assert(validStrNum.valid, 'Allow string integer min_order_quantity');
  assert(validStrNum.data.min_order_quantity === 50, 'Converts string integer to number 50');

  const invalidZero = validateProductInput({ name: 'Test Bottle', category_id: 'glass-bottles', min_order_quantity: 0 });
  assert(!invalidZero.valid, 'Reject 0 as min_order_quantity');

  const invalidNegative = validateProductInput({ name: 'Test Bottle', category_id: 'glass-bottles', min_order_quantity: -10 });
  assert(!invalidNegative.valid, 'Reject negative min_order_quantity');

  const invalidFloat = validateProductInput({ name: 'Test Bottle', category_id: 'glass-bottles', min_order_quantity: 12.5 });
  assert(!invalidFloat.valid, 'Reject decimal/float min_order_quantity');

  // 2. Database column check
  console.log('\n--- 2. Database Schema Check ---');
  const tableInfo = db.prepare('PRAGMA table_info(products)').all();
  const hasMoqCol = tableInfo.some(c => c.name === 'min_order_quantity');
  assert(hasMoqCol, 'Column min_order_quantity exists on products table');

  const hasExpectedPrice100Col = tableInfo.some(c => c.name === 'expected_price_per_100_paise');
  assert(hasExpectedPrice100Col, 'Column expected_price_per_100_paise exists on products table');

  // 3. Baseline Data Check
  console.log('\n--- 3. Baseline Catalogue Integrity Check ---');
  const catCount = db.prepare('SELECT count(*) as count FROM categories').get().count;
  assert(catCount === 6, `Exact baseline categories preserved (expected 6, got ${catCount})`);

  const prodCount = db.prepare('SELECT count(*) as count FROM products').get().count;
  assert(prodCount >= 14, `Exact baseline products preserved (expected >= 14, got ${prodCount})`);

  const imgCount = db.prepare('SELECT count(*) as count FROM product_images').get().count;
  assert(imgCount >= 28, `Exact baseline product images preserved (expected >= 28, got ${imgCount})`);

  const baselineActive = db.prepare("SELECT count(*) as count FROM products WHERE status = 'active'").get().count;
  assert(baselineActive >= 14, `All baseline products are active (expected >= 14, got ${baselineActive})`);

  const baselineStock = db.prepare('SELECT count(*) as count FROM products WHERE stock_quantity = 0').get().count;
  assert(baselineStock >= 14, `All baseline products have stock 0 (expected >= 14, got ${baselineStock})`);

  // 4. Test Insert & Update with MOQ
  console.log('\n--- 4. Test Product Insert & Update with MOQ ---');
  const testId = `test_moq_${Date.now()}`;
  db.prepare(`
    INSERT INTO products (
      id, name, name_hi, slug, category_id, status, is_featured, stock_quantity, low_stock_threshold,
      min_order_quantity, expected_price_per_100_paise
    ) VALUES (
      ?, 'Test MOQ Product', 'परीक्षण उत्पाद', ?, 'glass-bottles', 'active', 0, 0, 5, 200, 2500000
    )
  `).run(testId, `${testId}-slug`);

  const inserted = db.prepare('SELECT * FROM products WHERE id = ?').get(testId);
  assert(inserted.min_order_quantity === 200, 'Inserted product has min_order_quantity = 200');
  assert(inserted.expected_price_per_100_paise === 2500000, 'Inserted product has expected_price_per_100_paise = 2500000');

  // Update MOQ
  db.prepare('UPDATE products SET min_order_quantity = ? WHERE id = ?').run(500, testId);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(testId);
  assert(updated.min_order_quantity === 500, 'Updated product has min_order_quantity = 500');

  // Clean up test product
  db.prepare('DELETE FROM products WHERE id = ?').run(testId);
  const cleaned = db.prepare('SELECT count(*) as count FROM products WHERE id = ?').get(testId).count;
  assert(cleaned === 0, 'Test product cleaned up successfully');

  console.log('\n=================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=================================================================');
  if (failed > 0) process.exit(1);
} finally {
  db.close();
}
