/**
 * YES ENTERPRISES — Phase 11.3 Snapshot & Rollback Verification Test Suite
 *
 * Verifies:
 * 1. Boundary 1: In-flight / failed conversion atomic transaction rollback (zero partial commit).
 * 2. Boundary 2: Pre-conversion snapshot creation in product_conversion_snapshots.
 * 3. Atomic rollback: Restoration of parent baseline prices, MOQ, and simple status.
 * 4. Variant soft-archival (status = 'archived', zero deletes).
 * 5. Reversible image preservation: product_images variant_id associations remain 100% intact.
 * 6. Public API presentation in rolled-back state (simple product with parent images only).
 * 7. Reversibility proof: Re-activation restores full variable state and variant photos without re-linking.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPut } from '../functions/api/admin/products/[id].js';
import { onRequestPost as handleRollback } from '../functions/api/admin/products/[id]/rollback.js';
import { onRequestGet as handlePublicDetail } from '../functions/api/products/[slug].js';
import { onRequestGet as handlePublicList } from '../functions/api/products/index.js';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 11.3 Rollback & Snapshot Verification');
console.log('Testing Boundaries 1 & 2 on Local D1 Emulator');
console.log('=================================================================\n');

// 1. Locate active D1 emulator SQLite database
const d1Dir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidateFiles = fs.readdirSync(d1Dir).filter(
  f => f.endsWith('.sqlite') && !f.includes('metadata') && !f.includes('-wal') && !f.includes('-shm')
);

let activeDbPath = null;
let maxMigration = -1;

for (const f of candidateFiles) {
  const p = path.join(d1Dir, f);
  try {
    const db = new DatabaseSync(p);
    const row = db.prepare('SELECT MAX(id) as max_id FROM d1_migrations').get();
    if (row && row.max_id > maxMigration) {
      maxMigration = row.max_id;
      activeDbPath = p;
    }
  } catch {
    // skip non-matching
  }
}

if (!activeDbPath) {
  throw new Error('Could not locate active local D1 database.');
}

console.log(`Connecting to active local D1 database:\n  ${activeDbPath} (max migration: ${maxMigration})\n`);
const sqliteDb = new DatabaseSync(activeDbPath);
sqliteDb.exec('PRAGMA foreign_keys = ON;');

// 2. Wrap local SQLite in Cloudflare D1 adapter
function createD1Adapter(rawDb) {
  return {
    prepare(sql) {
      let boundParams = [];
      return {
        bind(...params) {
          boundParams = params;
          return this;
        },
        async first(col) {
          const stmt = rawDb.prepare(sql);
          const row = stmt.get(...boundParams);
          if (!row) return null;
          if (col) return row[col];
          return row;
        },
        async all() {
          const stmt = rawDb.prepare(sql);
          const results = stmt.all(...boundParams);
          return { results, success: true };
        },
        async run() {
          const stmt = rawDb.prepare(sql);
          const info = stmt.run(...boundParams);
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        }
      };
    },
    async batch(statements) {
      rawDb.exec('SAVEPOINT d1_batch;');
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        rawDb.exec('RELEASE SAVEPOINT d1_batch;');
        return results;
      } catch (err) {
        rawDb.exec('ROLLBACK TO SAVEPOINT d1_batch; RELEASE SAVEPOINT d1_batch;');
        throw err;
      }
    }
  };
}

const d1Binding = createD1Adapter(sqliteDb);

function createAdminContext({ url, method = 'POST', params = {}, body = null } = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'x-dev-admin-bypass': 'true'
  });
  const req = new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  return {
    request: req,
    params,
    env: {
      DB: d1Binding,
      ENVIRONMENT: 'development',
      ENABLE_DEV_ADMIN_BYPASS: 'true',
      DEV_BYPASS_EMAIL: 'admin@yesenterprises.in',
      ADMIN_EMAILS: 'admin@yesenterprises.in,divyanshtyagi1263@gmail.com'
    }
  };
}

let passed = 0;
let failed = 0;

async function assertTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

async function runRollbackSuite() {
  const TEST_PROD_ID = 'test-var-rollback';
  const TEST_SLUG = 'synthetic-rollback-baseline-product';
  const BASELINE_SKU = 'TEST-RLBK-01';

  // Ensure clean baseline state before test
  sqliteDb.prepare(`
    UPDATE product_variants SET status = 'archived' WHERE product_id = ?
  `).run(TEST_PROD_ID);
  sqliteDb.prepare(`
    UPDATE products SET
      base_price_paise = 25000,
      expected_price_per_100_paise = 2000000,
      min_order_quantity = 15,
      sku = 'TEST-RLBK-01',
      has_variants = 0
    WHERE id = ?
  `).run(TEST_PROD_ID);
  sqliteDb.prepare(`DELETE FROM product_images WHERE id = 'img-rb-v1'`).run();
  sqliteDb.prepare(`DELETE FROM product_conversion_snapshots WHERE product_id = ?`).run(TEST_PROD_ID);

  // Verify baseline product exists
  const baselineProduct = sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(TEST_PROD_ID);
  if (!baselineProduct) {
    throw new Error(`Synthetic product ${TEST_PROD_ID} not found. Run seed script first.`);
  }

  console.log('--- 1. Boundary 1: In-Flight Failed Conversion Transaction Rollback ---');
  await assertTest('Simulate failed mid-batch conversion: entire transaction rolls back with 0 partial data', async () => {
    // Record current state of products and variants
    const preCount = sqliteDb.prepare('SELECT COUNT(*) as c FROM product_variants WHERE product_id = ?').get(TEST_PROD_ID).c;
    const preProduct = sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(TEST_PROD_ID);

    try {
      await d1Binding.batch([
        d1Binding.prepare('UPDATE products SET has_variants = 1 WHERE id = ?').bind(TEST_PROD_ID),
        d1Binding.prepare('INSERT INTO product_variants (id, product_id, sku, title, title_hi, price_paise, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind('fail-v1', TEST_PROD_ID, 'SKU-FAIL-01', 'Fail Variant', 'असफल', 20000, 'active'),
        // Intentionally failing statement (violates FOREIGN KEY or invalid column)
        d1Binding.prepare('INSERT INTO product_variants (id, product_id, non_existent_col) VALUES (1, 2, 3)').bind()
      ]);
      throw new Error('Batch should have thrown an error');
    } catch {
      // Expected to fail
    }

    // Assert that products table and product_variants table rolled back 100%
    const postCount = sqliteDb.prepare('SELECT COUNT(*) as c FROM product_variants WHERE product_id = ?').get(TEST_PROD_ID).c;
    const postProduct = sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(TEST_PROD_ID);

    if (postCount !== preCount) {
      throw new Error(`Variant count changed! Pre: ${preCount}, Post: ${postCount}`);
    }
    if (postProduct.has_variants !== preProduct.has_variants) {
      throw new Error(`Product has_variants was partially updated!`);
    }
  });

  console.log('\n--- 2. Boundary 2: Product Conversion & Snapshot Capture ---');
  await assertTest('Admin PUT converts simple product to variable and captures snapshot', async () => {
    const ctx = createAdminContext({
      url: `http://localhost/api/admin/products/${TEST_PROD_ID}`,
      method: 'PUT',
      params: { id: TEST_PROD_ID },
      body: {
        has_variants: true,
        variants: [
          {
            id: 'test-var-rollback-v1',
            sku: 'SKU-TEST-RB-150',
            title: '150 ml',
            title_hi: '150 मिली',
            price_paise: 20000,
            expected_price_per_100_paise: 1600000,
            min_order_quantity: 10,
            status: 'active',
            sort_order: 1
          },
          {
            id: 'test-var-rollback-v2',
            sku: 'SKU-TEST-RB-200',
            title: '200 ml',
            title_hi: '200 मिली',
            price_paise: 25000,
            expected_price_per_100_paise: 2000000,
            min_order_quantity: 15,
            status: 'active',
            sort_order: 2
          },
          {
            id: 'test-var-rollback-v3',
            sku: 'SKU-TEST-RB-250',
            title: '250 ml',
            title_hi: '250 मिली',
            price_paise: 30000,
            expected_price_per_100_paise: 2400000,
            min_order_quantity: 20,
            status: 'active',
            sort_order: 3
          }
        ]
      }
    });

    const res = await onRequestPut(ctx);
    if (res.status !== 200) {
      const err = await res.json();
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(err)}`);
    }

    // Verify snapshot was captured in product_conversion_snapshots
    const snapshot = sqliteDb.prepare(`
      SELECT * FROM product_conversion_snapshots
      WHERE product_id = ? AND status = 'active'
    `).get(TEST_PROD_ID);

    if (!snapshot) {
      throw new Error('Pre-conversion snapshot was not created in product_conversion_snapshots table.');
    }
    if (snapshot.baseline_base_price_paise !== 25000) {
      throw new Error(`Expected baseline_base_price_paise 25000, got ${snapshot.baseline_base_price_paise}`);
    }
    if (snapshot.baseline_expected_price_per_100_paise !== 2000000) {
      throw new Error(`Expected baseline_expected_price_per_100_paise 2000000, got ${snapshot.baseline_expected_price_per_100_paise}`);
    }
    if (snapshot.baseline_min_order_quantity !== 15) {
      throw new Error(`Expected baseline_min_order_quantity 15, got ${snapshot.baseline_min_order_quantity}`);
    }
    if (snapshot.baseline_sku !== BASELINE_SKU) {
      throw new Error(`Expected baseline_sku '${BASELINE_SKU}', got ${snapshot.baseline_sku}`);
    }

    // Assign a dedicated photo to variant v1
    sqliteDb.prepare(`
      INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary, sort_order)
      VALUES ('img-rb-v1', ?, 'test-var-rollback-v1', 'products/test-rollback-v1.webp', 'image/webp', 14000, 0, 2)
    `).run(TEST_PROD_ID);
  });

  console.log('\n--- 3. Boundary 2: Reversible Rollback Execution ---');
  await assertTest('Execute rollback endpoint: restores baseline parent fields & soft-archives variants', async () => {
    const ctx = createAdminContext({
      url: `http://localhost/api/admin/products/${TEST_PROD_ID}/rollback`,
      method: 'POST',
      params: { id: TEST_PROD_ID }
    });

    const res = await handleRollback(ctx);
    if (res.status !== 200) {
      const err = await res.json();
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(err)}`);
    }

    const body = await res.json();
    if (!body.success) {
      throw new Error('Rollback response indicated failure.');
    }

    // Verify parent product fields
    const restoredProd = sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(TEST_PROD_ID);
    if (restoredProd.has_variants !== 0) {
      throw new Error(`Expected has_variants = 0, got ${restoredProd.has_variants}`);
    }
    if (restoredProd.base_price_paise !== 25000) {
      throw new Error(`Expected base_price_paise = 25000, got ${restoredProd.base_price_paise}`);
    }
    if (restoredProd.expected_price_per_100_paise !== 2000000) {
      throw new Error(`Expected expected_price_per_100_paise = 2000000, got ${restoredProd.expected_price_per_100_paise}`);
    }
    if (restoredProd.min_order_quantity !== 15) {
      throw new Error(`Expected min_order_quantity = 15, got ${restoredProd.min_order_quantity}`);
    }
    if (restoredProd.sku !== BASELINE_SKU) {
      throw new Error(`Expected sku = '${BASELINE_SKU}', got ${restoredProd.sku}`);
    }

    // Verify variants soft-archived
    const activeVariants = sqliteDb.prepare(`
      SELECT COUNT(*) as c FROM product_variants WHERE product_id = ? AND status = 'active'
    `).get(TEST_PROD_ID).c;
    if (activeVariants !== 0) {
      throw new Error(`Expected 0 active variants after rollback, found ${activeVariants}`);
    }

    const archivedVariants = sqliteDb.prepare(`
      SELECT COUNT(*) as c FROM product_variants WHERE product_id = ? AND status = 'archived'
    `).get(TEST_PROD_ID).c;
    if (archivedVariants !== 3) {
      throw new Error(`Expected 3 soft-archived variants, found ${archivedVariants}`);
    }

    // Verify snapshot status updated to 'restored'
    const snapshot = sqliteDb.prepare('SELECT status FROM product_conversion_snapshots WHERE product_id = ?').get(TEST_PROD_ID);
    if (snapshot.status !== 'restored') {
      throw new Error(`Expected snapshot status = 'restored', got '${snapshot.status}'`);
    }
  });

  console.log('\n--- 4. Image Relationship Integrity Verification ---');
  await assertTest('Images records and variant_id associations remain 100% intact (zero loss, zero nulling)', async () => {
    const images = sqliteDb.prepare(`
      SELECT id, variant_id, image_key, is_primary FROM product_images WHERE product_id = ? ORDER BY sort_order ASC
    `).all(TEST_PROD_ID);

    if (images.length !== 2) {
      throw new Error(`Expected 2 images, got ${images.length}`);
    }

    const parentImg = images.find(img => img.id === 'img-synth-rlbk-shared');
    if (!parentImg || parentImg.variant_id !== null) {
      throw new Error('Parent image was corrupted or modified.');
    }

    const variantImg = images.find(img => img.id === 'img-rb-v1');
    if (!variantImg) {
      throw new Error('Variant image was deleted during rollback!');
    }
    if (variantImg.variant_id !== 'test-var-rollback-v1') {
      throw new Error(`Variant image relationship was broken! Expected 'test-var-rollback-v1', got ${variantImg.variant_id}`);
    }
  });

  console.log('\n--- 5. Public API Verification in Rolled-Back State ---');
  await assertTest('Public Detail API returns simple product with parent images only (omits variant images)', async () => {
    const ctx = {
      request: new Request(`http://localhost/api/products/${TEST_SLUG}`),
      params: { slug: TEST_SLUG },
      env: { DB: d1Binding }
    };

    const res = await handlePublicDetail(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();

    if (json.data.has_variants !== false) {
      throw new Error('Public detail should report has_variants = false');
    }
    if (json.data.variants.length !== 0) {
      throw new Error(`Public detail should return 0 active variants, got ${json.data.variants.length}`);
    }
    if (json.data.base_price_paise !== 25000) {
      throw new Error(`Expected base_price_paise 25000, got ${json.data.base_price_paise}`);
    }
    if (json.data.expected_price_per_100_paise !== 2000000) {
      throw new Error(`Expected expected_price_per_100_paise 2000000, got ${json.data.expected_price_per_100_paise}`);
    }
    // Only parent image should be exposed in rolled-back state
    if (json.data.images.length !== 1) {
      throw new Error(`Expected 1 parent image exposed, got ${json.data.images.length}`);
    }
    if (json.data.images[0].variant_id !== null) {
      throw new Error(`Exposed image should have null variant_id, got ${json.data.images[0].variant_id}`);
    }
  });

  await assertTest('Public List API returns simple product with exact price (no "From" prefix)', async () => {
    const ctx = {
      request: new Request('http://localhost/api/products'),
      params: {},
      env: { DB: d1Binding }
    };

    const res = await handlePublicList(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();

    const prod = json.data.find(p => p.id === TEST_PROD_ID);
    if (!prod) throw new Error('Product not found in public catalogue list.');

    if (prod.has_variants !== false) {
      throw new Error('Product should have has_variants = false');
    }
    if (prod.min_variant_price_paise !== null) {
      throw new Error(`Expected min_variant_price_paise = null, got ${prod.min_variant_price_paise}`);
    }
    if (prod.base_price_paise !== 25000) {
      throw new Error(`Expected base_price_paise = 25000, got ${prod.base_price_paise}`);
    }
    if (prod.variant_capacities_summary !== '' && prod.variant_capacities_summary !== null) {
      throw new Error(`Expected empty variant_capacities_summary, got ${prod.variant_capacities_summary}`);
    }
    if (prod.available_capacities.length !== 0) {
      throw new Error(`Expected 0 available_capacities, got ${prod.available_capacities.length}`);
    }
  });

  console.log('\n--- 6. Reversibility Verification ---');
  await assertTest('Re-activating variants restores variable product & variant images immediately without re-linking', async () => {
    // Re-activate variants and toggle has_variants
    sqliteDb.prepare(`
      UPDATE product_variants SET status = 'active' WHERE product_id = ?
    `).run(TEST_PROD_ID);
    sqliteDb.prepare(`
      UPDATE products SET has_variants = 1 WHERE id = ?
    `).run(TEST_PROD_ID);

    const ctx = {
      request: new Request(`http://localhost/api/products/${TEST_SLUG}`),
      params: { slug: TEST_SLUG },
      env: { DB: d1Binding }
    };

    const res = await handlePublicDetail(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();

    if (json.data.variants.length !== 3) {
      throw new Error(`Expected 3 variants restored, got ${json.data.variants.length}`);
    }
    if (json.data.images.length !== 2) {
      throw new Error(`Expected 2 images restored (including variant image), got ${json.data.images.length}`);
    }

    const restoredVarImg = json.data.images.find(img => img.id === 'img-rb-v1');
    if (!restoredVarImg || restoredVarImg.variant_id !== 'test-var-rollback-v1') {
      throw new Error('Restored variant image link was lost!');
    }
  });

  // Final cleanup of the test rollback product back to baseline clean state
  sqliteDb.prepare(`
    UPDATE product_variants SET status = 'archived' WHERE product_id = ?
  `).run(TEST_PROD_ID);
  sqliteDb.prepare(`
    UPDATE products SET
      base_price_paise = 25000,
      expected_price_per_100_paise = 2000000,
      min_order_quantity = 15,
      sku = 'TEST-RLBK-01',
      has_variants = 0
    WHERE id = ?
  `).run(TEST_PROD_ID);
  sqliteDb.prepare(`DELETE FROM product_images WHERE id = 'img-rb-v1'`).run();
  sqliteDb.prepare(`DELETE FROM product_conversion_snapshots WHERE product_id = ?`).run(TEST_PROD_ID);

  console.log('\n=================================================================');
  console.log(`Rollback Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRollbackSuite().catch(err => {
  console.error('Fatal error in rollback test suite:', err);
  process.exit(1);
});
