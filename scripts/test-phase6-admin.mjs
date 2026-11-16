import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

// Import Pages Functions handlers
import { onRequestGet as handleAdminProductsList, onRequestPost as handleAdminProductCreate } from '../functions/api/admin/products/index.js';
import { onRequestGet as handleAdminProductGet, onRequestPut as handleAdminProductPut, onRequestDelete as handleAdminProductDelete } from '../functions/api/admin/products/[id].js';
import { onRequestPost as handleAdminCategoryCreate } from '../functions/api/admin/categories/index.js';
import { onRequestPut as handleAdminCategoryPut, onRequestDelete as handleAdminCategoryDelete } from '../functions/api/admin/categories/[id].js';
import { onRequestPut as handleAdminCategoryReorder } from '../functions/api/admin/categories/reorder.js';
import { onRequestPut as handleAdminInventoryUpdate } from '../functions/api/admin/inventory/index.js';
import { onRequestGet as handleAdminInventoryLogs } from '../functions/api/admin/inventory/logs.js';
import { onRequestGet as handleAdminSession } from '../functions/api/admin/session.js';
import { validateAdminSession } from '../functions/_shared/auth.js';
import { onRequestGet as handlePublicCategories } from '../functions/api/categories/index.js';
import { onRequestGet as handlePublicProductDetail } from '../functions/api/products/[slug].js';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 6 Admin Dashboard Integration Test Suite');
console.log('Testing Multi-Admin Auth, NULL Prices, Hindi Validation,');
console.log('Category Reordering, Inventory Logs, & Database Integrity');
console.log('=================================================================\n');

// Mapping of known Cloudflare D1 database IDs to their Miniflare Durable Object storage hashes
const KNOWN_D1_HASHES = {
  // Production / active development binding: 54c9ce5b-377e-4788-9899-43f71addf8a9
  '54c9ce5b-377e-4788-9899-43f71addf8a9': '6a1b3b744fa3757d88c3c37a6e58dbe029fc1f0fedf109567181075521f4e00c'
};

// ── 1. DETERMINISTIC D1 DATABASE LOCATOR ─────────────────────────────────────
function locateIntendedD1Database() {
  if (process.env.D1_TEST_DB_PATH && fs.existsSync(process.env.D1_TEST_DB_PATH)) {
    return process.env.D1_TEST_DB_PATH;
  }

  const d1Dir = path.resolve('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(d1Dir)) {
    throw new Error(`Local D1 state directory not found at: ${d1Dir}\nRun "npm run d1:migrate:local" first.`);
  }

  // 1. Check wrangler.jsonc to identify active database_id
  let activeDatabaseId = null;
  const wranglerConfigPath = path.resolve('wrangler.jsonc');
  if (fs.existsSync(wranglerConfigPath)) {
    try {
      const configRaw = fs.readFileSync(wranglerConfigPath, 'utf8');
      const cleanJson = configRaw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const config = JSON.parse(cleanJson);
      if (config.d1_databases && config.d1_databases[0] && config.d1_databases[0].database_id) {
        activeDatabaseId = config.d1_databases[0].database_id;
      }
    } catch {}
  }

  // 2. If active database_id has a known hash, prefer that specific SQLite file
  if (activeDatabaseId && KNOWN_D1_HASHES[activeDatabaseId]) {
    const activeFileName = `${KNOWN_D1_HASHES[activeDatabaseId]}.sqlite`;
    const activePath = path.join(d1Dir, activeFileName);
    if (fs.existsSync(activePath)) {
      return activePath;
    }
  }

  // 3. Fallback: filter candidates, prioritizing active database over legacy database
  const candidateFiles = fs.readdirSync(d1Dir).filter(
    f => f.endsWith('.sqlite') && !f.includes('metadata') && !f.includes('-wal') && !f.includes('-shm')
  );

  if (candidateFiles.length === 0) {
    throw new Error(`No SQLite database files found in ${d1Dir}. Run migrations first.`);
  }

  candidateFiles.sort((a, b) => {
    const aIsActive = a.includes('6a1b3b744fa3757d');
    const bIsActive = b.includes('6a1b3b744fa3757d');
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    const aStat = fs.statSync(path.join(d1Dir, a));
    const bStat = fs.statSync(path.join(d1Dir, b));
    return bStat.mtimeMs - aStat.mtimeMs;
  });

  for (const file of candidateFiles) {
    const candidatePath = path.join(d1Dir, file);
    try {
      const inspectDb = new DatabaseSync(candidatePath);
      const mig = inspectDb.prepare(
        "SELECT id FROM d1_migrations WHERE name = '0001_initial_schema.sql'"
      ).get();
      if (mig) {
        inspectDb.close();
        return candidatePath;
      }
      inspectDb.close();
    } catch {}
  }

  throw new Error('Could not locate intended D1 database with applied migrations.');
}

const dbPath = locateIntendedD1Database();
console.log(`Connecting to local D1 emulator database:\n  ${dbPath}\n`);

const sqliteDb = new DatabaseSync(dbPath);
sqliteDb.exec('PRAGMA foreign_keys = ON;');

// ── D1 DATABASE ADAPTER ─────────────────────────────────────────────────────
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
      rawDb.exec('SAVEPOINT d1_p6_batch;');
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.all());
        }
        rawDb.exec('RELEASE SAVEPOINT d1_p6_batch;');
        return results;
      } catch (err) {
        rawDb.exec('ROLLBACK TO SAVEPOINT d1_p6_batch; RELEASE SAVEPOINT d1_p6_batch;');
        throw err;
      }
    }
  };
}

const d1Binding = createD1Adapter(sqliteDb);

// ── TEST RUN IDENTIFIERS & BASELINE STATE ────────────────────────────────────
const RUN_ID = `p6_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const TEST_PREFIX = `test_${RUN_ID}_`;
const CLEAN_RUN_ID = RUN_ID.replace(/_/g, '-');
const SLUG_PREFIX = `test-${CLEAN_RUN_ID}-`;

const baselineCounts = {
  categories: sqliteDb.prepare('SELECT COUNT(*) as count FROM categories').get().count,
  products: sqliteDb.prepare('SELECT COUNT(*) as count FROM products').get().count,
  variants: sqliteDb.prepare('SELECT COUNT(*) as count FROM product_variants').get().count,
  images: sqliteDb.prepare('SELECT COUNT(*) as count FROM product_images').get().count,
  inventoryLogs: sqliteDb.prepare('SELECT COUNT(*) as count FROM inventory_logs').get().count
};

console.log(`Pre-test baseline record counts: products=${baselineCounts.products}, categories=${baselineCounts.categories}, images=${baselineCounts.images}`);

// ── TEST HARNESS HELPERS ────────────────────────────────────────────────────
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  }
}

async function assertTest(name, fn) {
  try {
    await fn();
    assert(true, name);
  } catch (err) {
    console.error(`  Error detail: ${err.message}`);
    assert(false, name);
  }
}

function createMockContext({
  url = 'http://localhost:8788/api/admin',
  method = 'GET',
  body = null,
  headers = {},
  params = {},
  adminEmail = 'divyanshtyagi1263@gmail.com',
  envOverrides = {}
} = {}) {
  const reqHeaders = new Headers(headers);
  if (adminEmail) {
    reqHeaders.set('x-dev-admin-bypass', 'true');
  }

  const request = new Request(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const env = {
    DB: d1Binding,
    ENVIRONMENT: 'development',
    ENABLE_DEV_ADMIN_BYPASS: 'true',
    DEV_BYPASS_EMAIL: adminEmail,
    ADMIN_EMAILS: 'divyanshtyagi1263@gmail.com,uvaisalikhan0143@gmail.com,admin@yesenterprises.net.in',
    CF_ACCESS_TEAM_NAME: 'yes-enterprises',
    CF_ACCESS_AUD: 'local-dev-audience-tag',
    ...envOverrides
  };

  return { request, env, params, data: {} };
}

// ── TEST EXECUTION ──────────────────────────────────────────────────────────
async function runPhase6Tests() {
  const cleanupIds = {
    categories: [],
    products: []
  };

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. MULTI-ADMIN AUTHENTICATION & ALLOWLIST TESTS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n--- 1. Multi-Admin Authentication Tests ---');

    await assertTest('Primary admin (divyanshtyagi1263@gmail.com) gets 200 admin session', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/session',
        method: 'GET',
        adminEmail: 'divyanshtyagi1263@gmail.com'
      });
      const res = await handleAdminSession(ctx);
      const data = await res.json();
      if (res.status !== 200 || !data.success || data.data.email !== 'divyanshtyagi1263@gmail.com') {
        throw new Error(`Expected 200 with divyanshtyagi1263@gmail.com, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    await assertTest('Secondary admin (uvaisalikhan0143@gmail.com) gets 200 admin session', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/session',
        method: 'GET',
        adminEmail: 'uvaisalikhan0143@gmail.com'
      });
      const res = await handleAdminSession(ctx);
      const data = await res.json();
      if (res.status !== 200 || !data.success || data.data.email !== 'uvaisalikhan0143@gmail.com') {
        throw new Error(`Expected 200 with uvaisalikhan0143@gmail.com, got ${res.status}: ${JSON.stringify(data)}`);
      }
    });

    await assertTest('Allowlist handles case-insensitivity: DIVYANSHtyagi1263@GMAIL.COM is permitted', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/session',
        method: 'GET',
        adminEmail: 'DIVYANSHtyagi1263@GMAIL.COM'
      });
      const res = await handleAdminSession(ctx);
      if (res.status !== 200) {
        throw new Error(`Expected 200 for uppercase admin email, got ${res.status}`);
      }
    });

    await assertTest('Unlisted unauthorized email is rejected with 403 FORBIDDEN', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/session',
        method: 'GET',
        adminEmail: 'unauthorized_hacker@example.com'
      });
      const res = await handleAdminSession(ctx);
      if (res.status !== 403) {
        throw new Error(`Expected 403 for unauthorized email, got ${res.status}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 2. CATEGORY CREATION & HINDI VALIDATION TESTS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n--- 2. Category Creation & Hindi Validation Tests ---');

    await assertTest('Category creation rejects missing name_hi with 400', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/categories',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}NoHindiCat`,
          slug: `${SLUG_PREFIX}nohindi`,
          sort_order: 10
        }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 400) {
        throw new Error(`Expected 400 for category missing Hindi name, got ${res.status}`);
      }
    });

    let testCategoryA = null;
    let testCategoryB = null;

    await assertTest('Create Category A and Category B with valid English + Hindi names', async () => {
      const ctxA = createMockContext({
        url: 'http://localhost:8788/api/admin/categories',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}Category A`,
          name_hi: `${TEST_PREFIX}श्रेणी ए`,
          slug: `${SLUG_PREFIX}cat-a`,
          sort_order: 1
        }
      });
      const resA = await handleAdminCategoryCreate(ctxA);
      const dataA = await resA.json();
      if (resA.status !== 201) throw new Error(`Category A failed: ${resA.status} ${JSON.stringify(dataA)}`);
      testCategoryA = dataA.data;
      cleanupIds.categories.push(testCategoryA.id);

      const ctxB = createMockContext({
        url: 'http://localhost:8788/api/admin/categories',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}Category B`,
          name_hi: `${TEST_PREFIX}श्रेणी बी`,
          slug: `${SLUG_PREFIX}cat-b`,
          sort_order: 2
        }
      });
      const resB = await handleAdminCategoryCreate(ctxB);
      const dataB = await resB.json();
      if (resB.status !== 201) throw new Error(`Category B failed: ${resB.status} ${JSON.stringify(dataB)}`);
      testCategoryB = dataB.data;
      cleanupIds.categories.push(testCategoryB.id);
    });

    await assertTest('Reorder categories updates sort_order in database', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/categories/reorder',
        method: 'PUT',
        body: {
          orders: [
            { id: testCategoryA.id, sort_order: 20 },
            { id: testCategoryB.id, sort_order: 10 }
          ]
        }
      });
      const res = await handleAdminCategoryReorder(ctx);
      if (res.status !== 200) throw new Error(`Category reorder failed with status ${res.status}`);

      const catA = sqliteDb.prepare('SELECT sort_order FROM categories WHERE id = ?').get(testCategoryA.id);
      const catB = sqliteDb.prepare('SELECT sort_order FROM categories WHERE id = ?').get(testCategoryB.id);
      if (catA.sort_order !== 20 || catB.sort_order !== 10) {
        throw new Error(`Expected sort_orders 20 and 10, got ${catA.sort_order} and ${catB.sort_order}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 3. PRODUCT CREATION: NULL PRICE & STOCK 0 PRESERVATION
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n--- 3. Product NULL Price & Stock 0 Preservation Tests ---');

    await assertTest('Product creation succeeds with only 2 mandatory fields (Name and Category, optional name_hi defaults to \'\')', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/products',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}QuickProd`,
          category_id: testCategoryA.id
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 201) {
        const err = await res.json();
        throw new Error(`Expected 201 for product with only mandatory fields, got ${res.status}: ${JSON.stringify(err)}`);
      }
      const data = await res.json();
      cleanupIds.products.push(data.data.id);
      if (data.data.name_hi !== '') {
        throw new Error(`Expected name_hi to default to '', got ${JSON.stringify(data.data.name_hi)}`);
      }
      if (!data.data.slug) {
        throw new Error('Expected auto-generated slug to be present');
      }
      if (data.data.base_price_paise !== null) {
        throw new Error('Expected base_price_paise to default to null');
      }
      if (data.data.stock_quantity !== 0) {
        throw new Error('Expected stock_quantity to default to 0');
      }

      // Clean up quick product
      await handleAdminProductDelete(createMockContext({
        url: `http://localhost:8788/api/admin/products/${data.data.id}`,
        method: 'DELETE',
        params: { id: data.data.id }
      }));
      cleanupIds.products = cleanupIds.products.filter(id => id !== data.data.id);
    });

    await assertTest('Product creation rejects missing English name with 400', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/products',
        method: 'POST',
        body: {
          category_id: testCategoryA.id
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 400) {
        throw new Error(`Expected 400 for product missing English name, got ${res.status}`);
      }
    });

    await assertTest('Product creation rejects missing category_id with 400', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/products',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}NoCategoryProd`
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 400) {
        throw new Error(`Expected 400 for product missing category_id, got ${res.status}`);
      }
    });

    await assertTest('Product creation auto-resolves slug collisions safely (-2, -3)', async () => {
      const collisionSlug = `${SLUG_PREFIX}collision-test`;
      const ctx1 = createMockContext({
        url: 'http://localhost:8788/api/admin/products',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}Collision 1`,
          slug: collisionSlug,
          category_id: testCategoryA.id
        }
      });
      const res1 = await handleAdminProductCreate(ctx1);
      if (res1.status !== 201) throw new Error(`First product create failed: ${res1.status}`);
      const data1 = await res1.json();
      cleanupIds.products.push(data1.data.id);
      if (data1.data.slug !== collisionSlug) throw new Error(`Expected slug ${collisionSlug}, got ${data1.data.slug}`);

      const ctx2 = createMockContext({
        url: 'http://localhost:8788/api/admin/products',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}Collision 2`,
          slug: collisionSlug,
          category_id: testCategoryA.id
        }
      });
      const res2 = await handleAdminProductCreate(ctx2);
      if (res2.status !== 201) throw new Error(`Second product create failed: ${res2.status}`);
      const data2 = await res2.json();
      cleanupIds.products.push(data2.data.id);
      if (data2.data.slug !== `${collisionSlug}-2`) {
        throw new Error(`Expected resolved slug ${collisionSlug}-2, got ${data2.data.slug}`);
      }

      // Clean up collision test products
      await handleAdminProductDelete(createMockContext({
        url: `http://localhost:8788/api/admin/products/${data1.data.id}`,
        method: 'DELETE',
        params: { id: data1.data.id }
      }));
      await handleAdminProductDelete(createMockContext({
        url: `http://localhost:8788/api/admin/products/${data2.data.id}`,
        method: 'DELETE',
        params: { id: data2.data.id }
      }));
      cleanupIds.products = cleanupIds.products.filter(id => id !== data1.data.id && id !== data2.data.id);
    });

    let testProduct = null;

    await assertTest('Create product with NULL base_price_paise, NULL compare_at_price, and stock_quantity = 0', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/products',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}Glass Feeding Bottle 250ml`,
          name_hi: `${TEST_PREFIX}कांच की फीडिंग बोतल 250ml`,
          slug: `${SLUG_PREFIX}glass-bottle-250`,
          category_id: testCategoryA.id,
          sku: `${CLEAN_RUN_ID.toUpperCase()}-BOT-01`,
          base_price_paise: null,
          compare_at_price_paise: null,
          stock_quantity: 0,
          low_stock_threshold: 5,
          material: 'Borosilicate Glass',
          brand: 'YES ENTERPRISES',
          status: 'active'
        }
      });
      const res = await handleAdminProductCreate(ctx);
      const data = await res.json();
      if (res.status !== 201) throw new Error(`Product creation failed: ${res.status} ${JSON.stringify(data)}`);
      testProduct = data.data;
      cleanupIds.products.push(testProduct.id);

      if (testProduct.base_price_paise !== null) {
        throw new Error(`Expected base_price_paise === null, got ${testProduct.base_price_paise}`);
      }
      if (testProduct.stock_quantity !== 0) {
        throw new Error(`Expected stock_quantity === 0, got ${testProduct.stock_quantity}`);
      }
    });

    await assertTest('Verify GET /api/admin/products/:id preserves NULL price and stock 0', async () => {
      const ctx = createMockContext({
        url: `http://localhost:8788/api/admin/products/${testProduct.id}`,
        method: 'GET',
        params: { id: testProduct.id }
      });
      const res = await handleAdminProductGet(ctx);
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Get product failed: ${res.status}`);
      const prod = data.data;

      if (prod.base_price_paise !== null) {
        throw new Error(`Expected base_price_paise to be null, got ${prod.base_price_paise}`);
      }
      if (prod.compare_at_price_paise !== null) {
        throw new Error(`Expected compare_at_price_paise to be null, got ${prod.compare_at_price_paise}`);
      }
      if (prod.stock_quantity !== 0) {
        throw new Error(`Expected stock_quantity to be 0, got ${prod.stock_quantity}`);
      }
    });

    await assertTest('Update product with description preserves NULL price without converting to 0', async () => {
      const ctx = createMockContext({
        url: `http://localhost:8788/api/admin/products/${testProduct.id}`,
        method: 'PUT',
        params: { id: testProduct.id },
        body: {
          name: `${TEST_PREFIX}Glass Feeding Bottle 250ml Updated`,
          name_hi: `${TEST_PREFIX}कांच की फीडिंग बोतल 250ml अद्यतित`,
          description: 'Updated premium heat resistant feeding bottle.',
          base_price_paise: null,
          compare_at_price_paise: null
        }
      });
      const res = await handleAdminProductPut(ctx);
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Update product failed: ${res.status} ${JSON.stringify(data)}`);

      // Verify in raw SQLite database
      const row = sqliteDb.prepare('SELECT base_price_paise, compare_at_price_paise, stock_quantity FROM products WHERE id = ?').get(testProduct.id);
      if (row.base_price_paise !== null) {
        throw new Error(`Database corrupted: base_price_paise changed to ${row.base_price_paise} instead of remaining NULL`);
      }
      if (row.compare_at_price_paise !== null) {
        throw new Error(`Database corrupted: compare_at_price_paise changed to ${row.compare_at_price_paise} instead of remaining NULL`);
      }
      if (row.stock_quantity !== 0) {
        throw new Error(`Database corrupted: stock_quantity changed to ${row.stock_quantity} instead of remaining 0`);
      }
    });

    await assertTest('GET /api/admin/products list returns base_price_paise as null and image_count', async () => {
      const ctx = createMockContext({
        url: `http://localhost:8788/api/admin/products?search=${encodeURIComponent(testProduct.slug)}`,
        method: 'GET'
      });
      const res = await handleAdminProductsList(ctx);
      const data = await res.json();
      if (res.status !== 200) throw new Error(`List products failed: ${res.status}`);
      const found = data.data.find(p => p.id === testProduct.id);
      if (!found) throw new Error(`Product ${testProduct.id} not found in search results`);
      if (found.base_price_paise !== null) throw new Error(`Expected found.base_price_paise === null, got ${found.base_price_paise}`);
      if (typeof found.image_count !== 'number') throw new Error(`Expected found.image_count to be number, got ${typeof found.image_count}`);
    });

    await assertTest('Product creation, retrieval, and update with expected_price_per_100_paise', async () => {
      // 1. Create product with expected_price_per_100_paise = 250000 (₹2,500)
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/products',
        method: 'POST',
        body: {
          name: `${TEST_PREFIX}Wholesale Test Bottle`,
          slug: `${SLUG_PREFIX}wholesale-test-bottle`,
          category_id: testCategoryA.id,
          expected_price_per_100_paise: 250000,
          status: 'active'
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 201) throw new Error(`Product creation failed: ${res.status}`);
      const data = await res.json();
      const pId = data.data.id;
      const pSlug = data.data.slug;
      cleanupIds.products.push(pId);

      if (data.data.expected_price_per_100_paise !== 250000) {
        throw new Error(`Expected expected_price_per_100_paise === 250000, got ${data.data.expected_price_per_100_paise}`);
      }

      // 2. Verify via GET /api/admin/products/:id
      const adminGetCtx = createMockContext({
        url: `http://localhost:8788/api/admin/products/${pId}`,
        method: 'GET',
        params: { id: pId }
      });
      const adminGetRes = await handleAdminProductGet(adminGetCtx);
      const adminGetData = await adminGetRes.json();
      if (adminGetData.data.expected_price_per_100_paise !== 250000) {
        throw new Error(`Admin GET expected_price_per_100_paise mismatch: ${adminGetData.data.expected_price_per_100_paise}`);
      }

      // 3. Verify via public GET /api/products/:slug
      const pubCtx = createMockContext({
        url: `http://localhost:8788/api/products/${pSlug}`,
        method: 'GET',
        params: { slug: pSlug }
      });
      const pubRes = await handlePublicProductDetail(pubCtx);
      const pubData = await pubRes.json();
      if (pubData.data.expected_price_per_100_paise !== 250000) {
        throw new Error(`Public GET expected_price_per_100_paise mismatch: ${pubData.data.expected_price_per_100_paise}`);
      }

      // 4. Update via PUT /api/admin/products/:id to 320000 (₹3,200)
      const putCtx = createMockContext({
        url: `http://localhost:8788/api/admin/products/${pId}`,
        method: 'PUT',
        params: { id: pId },
        body: {
          expected_price_per_100_paise: 320000
        }
      });
      const putRes = await handleAdminProductPut(putCtx);
      if (putRes.status !== 200) throw new Error(`PUT product failed: ${putRes.status}`);

      // Verify in SQLite
      const row = sqliteDb.prepare('SELECT expected_price_per_100_paise FROM products WHERE id = ?').get(pId);
      if (row.expected_price_per_100_paise !== 320000) {
        throw new Error(`Database expected_price_per_100_paise mismatch: ${row.expected_price_per_100_paise}`);
      }

      // Clean up test product
      await handleAdminProductDelete(createMockContext({
        url: `http://localhost:8788/api/admin/products/${pId}`,
        method: 'DELETE',
        params: { id: pId }
      }));
      cleanupIds.products = cleanupIds.products.filter(id => id !== pId);
    });

    await assertTest('GET /api/categories returns primary_image_key for baseline categories with products', async () => {
      const catCtx = createMockContext({
        url: 'http://localhost:8788/api/categories',
        method: 'GET'
      });
      const catRes = await handlePublicCategories(catCtx);
      if (catRes.status !== 200) throw new Error(`GET /api/categories failed: ${catRes.status}`);
      const catData = await catRes.json();
      const baselineCategories = catData.data.filter(c => !c.slug.startsWith('test-') && c.product_count > 0);
      if (baselineCategories.length !== 6) throw new Error(`Expected 6 baseline categories with products, got ${baselineCategories.length}`);
      for (const c of baselineCategories) {
        if (!c.primary_image_key) {
          throw new Error(`Expected baseline category ${c.slug} to have primary_image_key, got ${c.primary_image_key}`);
        }
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 4. INVENTORY ADJUSTMENT & AUDIT LOGGING TESTS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n--- 4. Inventory Adjustment & Audit Logging Tests ---');

    await assertTest('Stock adjustment without reason is rejected with 400', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/inventory',
        method: 'PUT',
        body: {
          product_id: testProduct.id,
          new_quantity: 50,
          reason: '   ' // whitespace only
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 400) {
        throw new Error(`Expected 400 for stock update with empty reason, got ${res.status}`);
      }
    });

    await assertTest('Stock adjustment with reason updates stock and records audit log with admin email', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/inventory',
        method: 'PUT',
        adminEmail: 'uvaisalikhan0143@gmail.com',
        body: {
          product_id: testProduct.id,
          new_quantity: 45,
          reason: 'Initial production shipment received at warehouse'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      const data = await res.json();
      if (res.status !== 200 || !data.success) {
        throw new Error(`Stock update failed: ${res.status} ${JSON.stringify(data)}`);
      }

      if (data.data.new_quantity !== 45 || data.data.previous_quantity !== 0 || data.data.change_amount !== 45) {
        throw new Error(`Unexpected stock adjustment values: ${JSON.stringify(data.data)}`);
      }
      if (data.data.updated_by !== 'uvaisalikhan0143@gmail.com') {
        throw new Error(`Expected updated_by === uvaisalikhan0143@gmail.com, got ${data.data.updated_by}`);
      }

      // Verify product stock in DB
      const prodRow = sqliteDb.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(testProduct.id);
      if (prodRow.stock_quantity !== 45) {
        throw new Error(`Expected product stock_quantity === 45, got ${prodRow.stock_quantity}`);
      }

      // Verify log in inventory_logs
      const log = sqliteDb.prepare('SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY id DESC LIMIT 1').get(testProduct.id);
      if (!log) throw new Error('Inventory log record was not created in inventory_logs table');
      if (log.updated_by !== 'uvaisalikhan0143@gmail.com') throw new Error(`Log updated_by mismatch: ${log.updated_by}`);
      if (log.reason !== 'Initial production shipment received at warehouse') throw new Error(`Log reason mismatch: ${log.reason}`);
    });

    await assertTest('Second stock adjustment (decrement) correctly records negative change', async () => {
      const ctx = createMockContext({
        url: 'http://localhost:8788/api/admin/inventory',
        method: 'PUT',
        adminEmail: 'divyanshtyagi1263@gmail.com',
        body: {
          product_id: testProduct.id,
          new_quantity: 40,
          reason: 'Sample dispatched to retail partner'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Decrement stock update failed: ${res.status}`);
      if (data.data.change_amount !== -5) throw new Error(`Expected change_amount === -5, got ${data.data.change_amount}`);
    });

    await assertTest('GET /api/admin/inventory/logs returns audit history with product metadata', async () => {
      const ctx = createMockContext({
        url: `http://localhost:8788/api/admin/inventory/logs?limit=10`,
        method: 'GET'
      });
      const res = await handleAdminInventoryLogs(ctx);
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Failed to fetch inventory logs: ${res.status}`);
      const logsForProd = data.data.filter(l => l.product_id === testProduct.id);
      if (logsForProd.length < 2) {
        throw new Error(`Expected at least 2 logs for test product, found ${logsForProd.length}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 5. CATEGORY DELETION PROTECTION
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n--- 5. Category Deletion Protection Tests ---');

    await assertTest('Category with active products cannot be deleted (409 CATEGORY_HAS_PRODUCTS)', async () => {
      const ctx = createMockContext({
        url: `http://localhost:8788/api/admin/categories/${testCategoryA.id}`,
        method: 'DELETE',
        params: { id: testCategoryA.id }
      });
      const res = await handleAdminCategoryDelete(ctx);
      const data = await res.json();
      if (res.status !== 409) {
        throw new Error(`Expected 409 Conflict when deleting category with products, got ${res.status}`);
      }
    });

    await assertTest('Delete product cascades successfully', async () => {
      const ctx = createMockContext({
        url: `http://localhost:8788/api/admin/products/${testProduct.id}`,
        method: 'DELETE',
        params: { id: testProduct.id }
      });
      const res = await handleAdminProductDelete(ctx);
      if (res.status !== 200) throw new Error(`Product deletion failed: ${res.status}`);
      cleanupIds.products = cleanupIds.products.filter(id => id !== testProduct.id);

      const exists = sqliteDb.prepare('SELECT id FROM products WHERE id = ?').get(testProduct.id);
      if (exists) throw new Error(`Product ${testProduct.id} still exists in products table`);
    });

    await assertTest('Empty category can now be safely deleted', async () => {
      const ctx = createMockContext({
        url: `http://localhost:8788/api/admin/categories/${testCategoryA.id}`,
        method: 'DELETE',
        params: { id: testCategoryA.id }
      });
      const res = await handleAdminCategoryDelete(ctx);
      if (res.status !== 200) throw new Error(`Category deletion failed: ${res.status}`);
      cleanupIds.categories = cleanupIds.categories.filter(id => id !== testCategoryA.id);

      const exists = sqliteDb.prepare('SELECT id FROM categories WHERE id = ?').get(testCategoryA.id);
      if (exists) throw new Error(`Category ${testCategoryA.id} still exists in categories table`);
    });

  } finally {
    // ═══════════════════════════════════════════════════════════════════════
    // GUARANTEED CLEANUP OF SCOPED FIXTURES
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n--- Executing Guaranteed Teardown ---');
    for (const prodId of cleanupIds.products) {
      sqliteDb.prepare('DELETE FROM inventory_logs WHERE product_id = ?').run(prodId);
      sqliteDb.prepare('DELETE FROM product_images WHERE product_id = ?').run(prodId);
      sqliteDb.prepare('DELETE FROM product_variants WHERE product_id = ?').run(prodId);
      sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(prodId);
    }
    for (const catId of cleanupIds.categories) {
      sqliteDb.prepare('DELETE FROM categories WHERE id = ?').run(catId);
    }

    const currentCounts = {
      categories: sqliteDb.prepare('SELECT COUNT(*) as count FROM categories').get().count,
      products: sqliteDb.prepare('SELECT COUNT(*) as count FROM products').get().count
    };

    console.log(`Pre-test baseline:  categories=${baselineCounts.categories}, products=${baselineCounts.products}`);
    console.log(`Post-test current:  categories=${currentCounts.categories}, products=${currentCounts.products}`);

    assert(
      currentCounts.categories === baselineCounts.categories &&
      currentCounts.products === baselineCounts.products,
      'Final Verification: Pre-existing database baseline counts completely preserved'
    );
  }
}

runPhase6Tests()
  .then(() => {
    console.log('\n=================================================================');
    console.log(`Phase 6 Test Suite Summary: ${passedTests} Passed, ${failedTests} Failed`);
    console.log('=================================================================');
    if (failedTests > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('\nFatal test execution error:', err);
    process.exit(1);
  });
