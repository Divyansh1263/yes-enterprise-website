/**
 * YES ENTERPRISES — Phase 11.3 Comprehensive Variant Engine Test Suite
 *
 * Verifies end-to-end functionality of the product variant engine:
 * 1. Backend validation (paise integrity, bounds, status, nullable MOQ)
 * 2. Public Catalogue List API (starting prices, capacities, excluding archived)
 * 3. Public Detail API (active variants, dual prices, variant photo matching)
 * 4. Simple product regression defense (zero regressions on simple products)
 * 5. Admin Variant CRUD & Duplication (wholesale rates, soft-archive, variant cloning)
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { validateProductInput, validateVariantInput } from '../functions/_shared/product-validation.js';
import { onRequestGet as handlePublicList } from '../functions/api/products/index.js';
import { onRequestGet as handlePublicDetail } from '../functions/api/products/[slug].js';
import { onRequestPost as handleAdminCreate } from '../functions/api/admin/products/index.js';
import { onRequestPut as handleAdminPut } from '../functions/api/admin/products/[id].js';
import { onRequestGet as handleAdminGet } from '../functions/api/admin/products/[id].js';
import { onRequestPost as handleAdminDuplicate } from '../functions/api/admin/products/[id]/duplicate.js';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 11.3 Variant Engine Test Suite');
console.log('Testing End-to-End Variant Implementation Against Local D1');
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

console.log(`Using active local D1 database:\n  ${activeDbPath} (migration ${maxMigration})\n`);
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

async function runTestSuite() {
  console.log('--- 1. Backend Validation Unit Tests ---');

  await assertTest('Variant validation rejects non-integer price_paise', () => {
    const res = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 299.5 });
    if (res.valid) throw new Error('Expected invalid for float price_paise');
  });

  await assertTest('Variant validation rejects negative price_paise', () => {
    const res = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: -100 });
    if (res.valid) throw new Error('Expected invalid for negative price_paise');
  });

  await assertTest('Variant validation rejects price_paise exceeding ₹10 Lakh (100,000,000 paise)', () => {
    const res = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 100000001 });
    if (res.valid) throw new Error('Expected invalid for exceeding ₹10L');
  });

  await assertTest('Variant validation rejects expected_price_per_100_paise exceeding ₹50 Lakh (500,000,000 paise)', () => {
    const res = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 30000, expected_price_per_100_paise: 500000001 });
    if (res.valid) throw new Error('Expected invalid for exceeding ₹50L wholesale');
  });

  await assertTest('Variant validation accepts nullable expected_price_per_100_paise and nullable min_order_quantity', () => {
    const res = validateVariantInput({
      title: '250 ml',
      title_hi: '250 मिली',
      price_paise: 35000,
      expected_price_per_100_paise: null,
      min_order_quantity: null
    });
    if (!res.valid) throw new Error(`Expected valid, got: ${res.error}`);
    if (res.data.expected_price_per_100_paise !== null || res.data.min_order_quantity !== null) {
      throw new Error('Fields should be null');
    }
  });

  await assertTest('Variant validation rejects invalid min_order_quantity (<= 0 or non-integer)', () => {
    const resZero = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 35000, min_order_quantity: 0 });
    if (resZero.valid) throw new Error('Expected invalid for MOQ 0');
    const resDec = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 35000, min_order_quantity: 12.5 });
    if (resDec.valid) throw new Error('Expected invalid for decimal MOQ');
  });

  await assertTest('Variant validation enforces strict status IN ("active", "archived") and rejects others', () => {
    const resDraft = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 35000, status: 'draft' });
    if (resDraft.valid) throw new Error('Expected invalid for status "draft"');
    const resActive = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 35000, status: 'active' });
    if (!resActive.valid) throw new Error('Expected valid for status "active"');
    const resArchived = validateVariantInput({ title: '250 ml', title_hi: '250 मिली', price_paise: 35000, status: 'archived' });
    if (!resArchived.valid) throw new Error('Expected valid for status "archived"');
  });

  await assertTest('Product validation requires at least one variant when has_variants is true on creation', () => {
    const res = validateProductInput({
      name: 'Test Variable Product',
      name_hi: 'टेस्ट उत्पाद',
      slug: 'test-var-no-variants',
      category_id: 'ss-bottles',
      has_variants: true,
      variants: []
    }, false);
    if (res.valid) throw new Error('Expected rejection when variants array is empty');
  });

  console.log('\n--- 2. Public Catalogue List API Tests (GET /api/products) ---');

  await assertTest('Variable product "test-var-straight" reports lowest active variant price (From ₹350) and 4 capacities', async () => {
    const ctx = {
      request: new Request('http://localhost/api/products?limit=50'),
      params: {},
      env: { DB: d1Binding }
    };
    const res = await handlePublicList(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    const prod = json.data.find(p => p.id === 'test-var-straight');
    if (!prod) throw new Error('test-var-straight not found in public products');

    if (prod.has_variants !== true) throw new Error('Expected has_variants = true');
    if (prod.min_variant_price_paise !== 35000) {
      throw new Error(`Expected min_variant_price_paise = 35000 (₹350), got ${prod.min_variant_price_paise}`);
    }
    if (prod.max_variant_price_paise !== 49900) {
      throw new Error(`Expected max_variant_price_paise = 49900 (₹499), got ${prod.max_variant_price_paise}`);
    }
    if (prod.min_variant_expected_price_100_paise !== 1350000) {
      throw new Error(`Expected min_variant_expected_price_100_paise = 1350000, got ${prod.min_variant_expected_price_100_paise}`);
    }
    if (prod.variants_count !== 4) {
      throw new Error(`Expected variants_count = 4, got ${prod.variants_count}`);
    }
    if (prod.available_capacities.length !== 4) {
      throw new Error(`Expected 4 capacities, got ${prod.available_capacities.length}`);
    }
    if (prod.available_capacities[0] !== '150 ml' || prod.available_capacities[3] !== '300 ml') {
      throw new Error(`Unexpected capacities array: ${JSON.stringify(prod.available_capacities)}`);
    }
  });

  await assertTest('Archived variants in "test-var-cola" are strictly excluded from starting price and capacities', async () => {
    const ctx = {
      request: new Request('http://localhost/api/products?limit=50'),
      params: {},
      env: { DB: d1Binding }
    };
    const res = await handlePublicList(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    const prod = json.data.find(p => p.id === 'test-var-cola');
    if (!prod) throw new Error('test-var-cola not found in public products');

    // Archived variant was 250ml @ ₹499 (49900 paise).
    // Active variants are 500ml @ ₹599 (59900 paise), 750ml @ ₹649, 1000ml @ ₹799.
    if (prod.min_variant_price_paise !== 59900) {
      throw new Error(`Expected starting price 59900 paise (₹599) excluding archived 250ml variant, got ${prod.min_variant_price_paise}`);
    }
    if (prod.variants_count !== 3) {
      throw new Error(`Expected variants_count = 3 (excluding 1 archived), got ${prod.variants_count}`);
    }
    if (prod.available_capacities.includes('250 ml')) {
      throw new Error('Archived capacity "250 ml" was leaked in available_capacities!');
    }
    if (!prod.available_capacities.includes('500 ml') || !prod.available_capacities.includes('1 Litre')) {
      throw new Error(`Active capacities missing in: ${JSON.stringify(prod.available_capacities)}`);
    }
  });

  await assertTest('Simple product "test-simple-fixture" returns baseline single price and null variant fields', async () => {
    const ctx = {
      request: new Request('http://localhost/api/products?limit=50'),
      params: {},
      env: { DB: d1Binding }
    };
    const res = await handlePublicList(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    const prod = json.data.find(p => p.id === 'test-simple-fixture');
    if (!prod) throw new Error('test-simple-fixture not found');

    if (prod.has_variants !== false) throw new Error('Expected has_variants = false');
    if (prod.base_price_paise !== 27500) {
      throw new Error(`Expected base_price_paise = 27500, got ${prod.base_price_paise}`);
    }
    if (prod.min_variant_price_paise !== null) {
      throw new Error(`Expected min_variant_price_paise = null, got ${prod.min_variant_price_paise}`);
    }
    if (prod.available_capacities.length !== 0) {
      throw new Error(`Expected empty available_capacities, got ${prod.available_capacities.length}`);
    }
  });

  console.log('\n--- 3. Public Detail API Tests (GET /api/products/:slug) ---');

  await assertTest('Detail API returns active variants with dual prices and omits archived variants', async () => {
    const ctx = {
      request: new Request('http://localhost/api/products/synthetic-vacuum-cola-bottle'),
      params: { slug: 'synthetic-vacuum-cola-bottle' },
      env: { DB: d1Binding }
    };
    const res = await handlePublicDetail(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();

    if (json.data.variants.length !== 3) {
      throw new Error(`Expected 3 active variants, got ${json.data.variants.length}`);
    }

    // Assert archived variant is absent
    const archivedVar = json.data.variants.find(v => v.title.includes('250 ml'));
    if (archivedVar) {
      throw new Error('Archived variant "250 ml" was returned in public detail API!');
    }

    // Verify dual prices on active variants
    const v500 = json.data.variants.find(v => v.title === '500 ml');
    if (!v500) throw new Error('500 ml variant missing');
    if (v500.price_paise !== 59900) throw new Error(`Expected price_paise 59900, got ${v500.price_paise}`);
    if (v500.expected_price_per_100_paise !== 3490000) {
      throw new Error(`Expected expected_price_per_100_paise 3490000, got ${v500.expected_price_per_100_paise}`);
    }
  });

  await assertTest('Detail API matches dedicated variant photo for test-var-straight', async () => {
    const ctx = {
      request: new Request('http://localhost/api/products/synthetic-ss-straight-bottle'),
      params: { slug: 'synthetic-ss-straight-bottle' },
      env: { DB: d1Binding }
    };
    const res = await handlePublicDetail(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();

    if (json.data.variants.length !== 4) {
      throw new Error(`Expected 4 active variants, got ${json.data.variants.length}`);
    }

    const v150 = json.data.variants.find(v => v.title === '150 ml');
    if (!v150) throw new Error('150 ml variant missing');

    const dedicatedPhoto = json.data.images.find(img => img.variant_id === v150.id);
    if (!dedicatedPhoto) {
      throw new Error('Dedicated variant photo for 150 ml variant not returned in images list');
    }
  });

  console.log('\n--- 4. Admin CRUD, Dual Pricing & Duplication ---');

  let createdVarProdId = null;
  const adminTestSlug = `test-admin-var-${Date.now()}`;

  await assertTest('Admin creates variable product with wholesale pricing and MOQ', async () => {
    const ctx = createAdminContext({
      url: 'http://localhost/api/admin/products',
      method: 'POST',
      body: {
        name: 'Admin Test Variable Sipper',
        name_hi: 'एडमिन टेस्ट सिपर',
        slug: adminTestSlug,
        category_id: 'ss-sippers',
        has_variants: true,
        variants: [
          {
            title: '400 ml',
            title_hi: '400 मिली',
            sku: `TEST-ADM-${Date.now()}-400`,
            price_paise: 42000,
            expected_price_per_100_paise: 2500000,
            min_order_quantity: 12,
            stock_quantity: 50,
            status: 'active'
          },
          {
            title: '600 ml',
            title_hi: '600 मिली',
            sku: `TEST-ADM-${Date.now()}-600`,
            price_paise: 48000,
            expected_price_per_100_paise: 2900000,
            min_order_quantity: 18,
            stock_quantity: 40,
            status: 'active'
          }
        ]
      }
    });

    const res = await handleAdminCreate(ctx);
    if (res.status !== 201) {
      const err = await res.json();
      throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(err)}`);
    }
    const body = await res.json();
    createdVarProdId = body.data?.id;
    if (!createdVarProdId || body.data?.variants?.length !== 2) {
      throw new Error('Variable product creation failed to return 2 variants');
    }

    const v1 = body.data.variants[0];
    if (v1.expected_price_per_100_paise !== 2500000 || v1.min_order_quantity !== 12) {
      throw new Error(`Wholesale pricing or MOQ mismatch on created variant: ${JSON.stringify(v1)}`);
    }
  });

  await assertTest('Admin updates variable product: modifies prices and soft-archives omitted variant', async () => {
    const currentVars = sqliteDb.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(createdVarProdId);
    const keepVar = currentVars[0];
    // We omit the second variant from the payload to test soft-archival

    const ctx = createAdminContext({
      url: `http://localhost/api/admin/products/${createdVarProdId}`,
      method: 'PUT',
      params: { id: createdVarProdId },
      body: {
        variants: [
          {
            id: keepVar.id,
            title: keepVar.title,
            title_hi: keepVar.title_hi,
            sku: keepVar.sku,
            price_paise: 45000, // Updated from 42000
            expected_price_per_100_paise: 2700000, // Updated from 2500000
            min_order_quantity: 15,
            stock_quantity: 60,
            status: 'active'
          }
        ]
      }
    });

    const res = await handleAdminPut(ctx);
    if (res.status !== 200) {
      const err = await res.json();
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(err)}`);
    }

    // Verify kept variant updated
    const updatedVar = sqliteDb.prepare('SELECT * FROM product_variants WHERE id = ?').get(keepVar.id);
    if (updatedVar.price_paise !== 45000 || updatedVar.expected_price_per_100_paise !== 2700000) {
      throw new Error(`Variant price did not update! price: ${updatedVar.price_paise}, p100: ${updatedVar.expected_price_per_100_paise}`);
    }

    // Verify omitted variant was soft-archived
    const archivedVar = sqliteDb.prepare('SELECT * FROM product_variants WHERE product_id = ? AND id != ?').get(createdVarProdId, keepVar.id);
    if (archivedVar.status !== 'archived') {
      throw new Error(`Expected omitted variant status to be 'archived', got '${archivedVar.status}'`);
    }
  });

  await assertTest('Admin product duplication clones variants with wholesale pricing and MOQ', async () => {
    const ctx = createAdminContext({
      url: `http://localhost/api/admin/products/${createdVarProdId}/duplicate`,
      method: 'POST',
      params: { id: createdVarProdId }
    });

    const res = await handleAdminDuplicate(ctx);
    if (res.status !== 201) {
      const err = await res.json();
      throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(err)}`);
    }
    const body = await res.json();
    const dupId = body.data?.id;

    const dupVariants = sqliteDb.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(dupId);
    if (dupVariants.length !== 2) {
      throw new Error(`Expected 2 cloned variants on duplicated product, found ${dupVariants.length}`);
    }

    const clonedV1 = dupVariants.find(v => v.title.includes('400 ml'));
    if (!clonedV1) throw new Error('Cloned 400 ml variant not found');
    if (clonedV1.price_paise !== 45000 || clonedV1.expected_price_per_100_paise !== 2700000 || clonedV1.min_order_quantity !== 15) {
      throw new Error(`Cloned variant pricing mismatch: ${JSON.stringify(clonedV1)}`);
    }

    // Cleanup duplicated test product
    sqliteDb.prepare('DELETE FROM product_variants WHERE product_id = ?').run(dupId);
    sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(dupId);
  });

  // Cleanup created test product
  if (createdVarProdId) {
    sqliteDb.prepare('DELETE FROM inventory_logs WHERE product_id = ?').run(createdVarProdId);
    sqliteDb.prepare('DELETE FROM product_variants WHERE product_id = ?').run(createdVarProdId);
    sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(createdVarProdId);
  }

  console.log('\n=================================================================');
  console.log(`Variant Engine Test Suite Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error in variant test suite:', err);
  process.exit(1);
});
