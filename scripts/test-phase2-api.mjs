import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

// Import Pages Functions handlers
import { onRequestGet as handleHealth } from '../functions/api/health.js';
import { onRequestGet as handleCategories } from '../functions/api/categories/index.js';
import { onRequestGet as handleProducts } from '../functions/api/products/index.js';
import { onRequestGet as handleProductDetail } from '../functions/api/products/[slug].js';
import { onRequestGet as handleAdminSession } from '../functions/api/admin/session.js';
import { handleDbError } from '../functions/_shared/db.js';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 2 Handler-Level Integration Test Suite');
console.log('Testing Pages Functions handlers with local D1 adapter & WebCrypto');
console.log('NOTE: Handler-level tests (for real HTTP runtime tests, run npm run test:phase2:http)');
console.log('=================================================================\n');

// ── 1. DETERMINISTIC INTENDED D1 DATABASE LOCATOR ────────────────────────────
function locateIntendedD1Database() {
  if (process.env.D1_TEST_DB_PATH && fs.existsSync(process.env.D1_TEST_DB_PATH)) {
    return process.env.D1_TEST_DB_PATH;
  }

  const d1Dir = path.resolve('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(d1Dir)) {
    throw new Error(`Local D1 state directory not found at: ${d1Dir}\nRun "npm run d1:migrate:local" first.`);
  }

  const candidateFiles = fs.readdirSync(d1Dir).filter(
    f => f.endsWith('.sqlite') && !f.includes('metadata') && !f.includes('-wal') && !f.includes('-shm')
  );

  if (candidateFiles.length === 0) {
    throw new Error(`No SQLite database files found in ${d1Dir}. Run migrations first.`);
  }

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
    } catch {
      // Continue inspecting
    }
  }

  throw new Error('Could not locate intended D1 database with applied migrations.');
}

const dbPath = locateIntendedD1Database();
console.log(`Connecting to local D1 emulator database:\n  ${dbPath}\n`);

const sqliteDb = new DatabaseSync(dbPath);
sqliteDb.exec('PRAGMA foreign_keys = ON;');

// ── D1 DATABASE ADAPTER ─────────────────────────────────────────────────────
// Wraps local SQLite to implement Cloudflare's exact runtime D1 interface
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
          results.push(await s.all());
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

// ── TEST RUN IDENTIFIERS & BASELINE STATE ────────────────────────────────────
const RUN_ID = `p2_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const TEST_PREFIX = `test_${RUN_ID}_`;

const baselineCounts = {
  categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
  products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
  variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
  images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
  inventoryLogs: sqliteDb.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
  siteSettings: sqliteDb.prepare("SELECT COUNT(*) as c FROM site_settings").get().c
};

console.log(`Pre-test baseline database record count: ${baselineCounts.products} products, ${baselineCounts.categories} categories.`);

// Exact parameterized cleanup helper
function cleanupTestFixturesByPrefix(rawDb, prefix) {
  rawDb.prepare(`
    DELETE FROM product_images 
    WHERE substr(id, 1, length(?)) = ? 
       OR substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix, prefix, prefix);

  rawDb.prepare(`
    DELETE FROM inventory_logs 
    WHERE substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix);

  rawDb.prepare(`
    DELETE FROM cleanup_claims 
    WHERE substr(image_key, 1, length(?)) = ?;
  `).run(prefix, prefix);

  rawDb.prepare(`
    DELETE FROM pending_uploads 
    WHERE substr(image_key, 1, length(?)) = ? 
       OR substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix, prefix, prefix);

  rawDb.prepare(`
    DELETE FROM product_variants 
    WHERE substr(id, 1, length(?)) = ? 
       OR substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix, prefix, prefix);

  rawDb.prepare(`
    DELETE FROM products 
    WHERE substr(id, 1, length(?)) = ?;
  `).run(prefix, prefix);

  rawDb.prepare(`
    DELETE FROM categories 
    WHERE substr(id, 1, length(?)) = ?;
  `).run(prefix, prefix);
}

// ── TEST HARNESS ────────────────────────────────────────────────────────────
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

// Helper to create simulated Cloudflare Pages Functions context
function createFunctionContext({
  url = 'http://localhost/api/test',
  method = 'GET',
  headers = {},
  params = {},
  env = {}
} = {}) {
  const req = new Request(url, {
    method,
    headers: new Headers(headers)
  });

  return {
    request: req,
    params,
    data: {},
    env: {
      DB: d1Binding,
      ENVIRONMENT: 'development',
      CF_ACCESS_TEAM_NAME: 'yes-enterprises',
      CF_ACCESS_AUD: 'test-access-aud-tag',
      ADMIN_EMAILS: 'admin@yesenterprises.in,owner@yesenterprises.in',
      ENABLE_DEV_ADMIN_BYPASS: 'true',
      DEV_BYPASS_EMAIL: 'admin@yesenterprises.in',
      ...env
    }
  };
}

// ── CRYPTOGRAPHIC TEST KEYPAIR & JWT GENERATION (RS256) ─────────────────────
// Generates a real RSA-2048 keypair to test authentic WebCrypto RS256 verification
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const testJwk = publicKey.export({ format: 'jwk' });
testJwk.kid = 'phase2-test-key-id';
testJwk.alg = 'RS256';
testJwk.use = 'sig';

function base64UrlEncode(data) {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createSignedJwt(payloadOverrides = {}, headerOverrides = {}, key = privateKey) {
  const header = {
    alg: 'RS256',
    kid: testJwk.kid,
    typ: 'JWT',
    ...headerOverrides
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'https://yes-enterprises.cloudflareaccess.com',
    aud: 'test-access-aud-tag',
    sub: 'user-uuid-1234',
    email: 'admin@yesenterprises.in',
    name: 'Authorized Admin',
    iat: nowSec,
    nbf: nowSec - 10,
    exp: nowSec + 3600,
    ...payloadOverrides
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  const signature = base64UrlEncode(signer.sign(key));

  return `${data}.${signature}`;
}

// Mock fetch function to supply public JWKS without network access
const mockJwksFetch = async (url) => {
  if (url.includes('/cdn-cgi/access/certs')) {
    return new Response(JSON.stringify({ keys: [testJwk], public_certs: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response('Not Found', { status: 404 });
};

// ── MAIN TEST SUITE EXECUTION ───────────────────────────────────────────────
try {
  // Setup strictly scoped test fixtures for Phase 2
  const CAT_FEEDING = `${TEST_PREFIX}cat_feeding`;
  const CAT_STEEL = `${TEST_PREFIX}cat_steel`;
  const PROD_ACTIVE_1 = `${TEST_PREFIX}p_bottle`;
  const PROD_ACTIVE_2 = `${TEST_PREFIX}p_tiffin`;
  const PROD_DRAFT = `${TEST_PREFIX}p_draft`;
  const PROD_ARCHIVED = `${TEST_PREFIX}p_archived`;

  const CLEAN_RUN_ID = RUN_ID.replace(/_/g, '-');
  const SLUG_BOTTLE = `feeding-bottle-${CLEAN_RUN_ID}`;
  const SLUG_TIFFIN = `steel-tiffin-${CLEAN_RUN_ID}`;
  const SLUG_DRAFT = `draft-item-${CLEAN_RUN_ID}`;
  const SLUG_ARCHIVED = `archived-item-${CLEAN_RUN_ID}`;

  sqliteDb.prepare(`
    INSERT INTO categories (id, name, name_hi, slug, sort_order) VALUES 
    (?, 'Feeding Bottles', 'फीडिंग बोतलें', ?, 1),
    (?, 'Stainless Steel', 'स्टेनलेस स्टील', ?, 2);
  `).run(CAT_FEEDING, `feeding-${CLEAN_RUN_ID}`, CAT_STEEL, `steel-${CLEAN_RUN_ID}`);

  sqliteDb.prepare(`
    INSERT INTO products (id, name, name_hi, slug, category_id, sku, base_price_paise, compare_at_price_paise, stock_quantity, status, is_featured, sort_order, specifications_json) VALUES
    (?, 'Classic Feeding Bottle 250ml', 'क्लासिक फीडिंग बोतल', ?, ?, 'SKU-BOT-01', 19900, 24900, 50, 'active', 1, 1, '{"capacity":"250ml","bpa_free":true}'),
    (?, 'Stainless Steel Tiffin Box', 'स्टेनलेस स्टील टिफिन', ?, ?, 'SKU-TIF-01', 34900, 39900, 20, 'active', 0, 2, '{"tiers":3,"material":"304 Grade"}'),
    (?, 'Unreleased Draft Product', 'ड्राफ्ट उत्पाद', ?, ?, 'SKU-DFT-01', 9900, NULL, 0, 'draft', 0, 99, '{}'),
    (?, 'Discontinued Archived Product', 'संग्रहीत उत्पाद', ?, ?, 'SKU-ARC-01', 9900, NULL, 0, 'archived', 0, 100, '{}');
  `).run(
    PROD_ACTIVE_1, SLUG_BOTTLE, CAT_FEEDING,
    PROD_ACTIVE_2, SLUG_TIFFIN, CAT_STEEL,
    PROD_DRAFT, SLUG_DRAFT, CAT_FEEDING,
    PROD_ARCHIVED, SLUG_ARCHIVED, CAT_STEEL
  );

  // Add variants and images
  sqliteDb.prepare(`
    INSERT INTO product_variants (id, product_id, sku, title, title_hi, price_paise, stock_quantity, status, sort_order) VALUES
    (?, ?, 'SKU-BOT-VAR-BLU', 'Blue 250ml', 'नीला 250ml', 19900, 30, 'active', 1),
    (?, ?, 'SKU-BOT-VAR-PNK', 'Pink 250ml', 'गुलाबी 250ml', 19900, 20, 'active', 2),
    (?, ?, 'SKU-BOT-VAR-INACT', 'Yellow Inactive', 'पीला', 19900, 0, 'archived', 3);
  `).run(
    `${TEST_PREFIX}var_1`, PROD_ACTIVE_1,
    `${TEST_PREFIX}var_2`, PROD_ACTIVE_1,
    `${TEST_PREFIX}var_inact`, PROD_ACTIVE_1
  );

  sqliteDb.prepare(`
    INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary, sort_order) VALUES
    (?, ?, NULL, ?, 'image/webp', 15420, 1, 1),
    (?, ?, ?, ?, 'image/webp', 12100, 0, 2);
  `).run(
    `${TEST_PREFIX}img_1`, PROD_ACTIVE_1, `${TEST_PREFIX}bottle_main.webp`,
    `${TEST_PREFIX}img_2`, PROD_ACTIVE_1, `${TEST_PREFIX}var_1`, `${TEST_PREFIX}bottle_blue.webp`
  );

  console.log('Test fixtures seeded successfully.\n');

  // ── TEST SUITE EXECUTION ──────────────────────────────────────────────────

  // 1. Health Endpoint Tests
  console.log('--- 1. Health Endpoint Tests (GET /api/health) ---');

  await assertTest('Health endpoint returns 200 with status "ok" and healthy database', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/health' });
    const res = await handleHealth(ctx);
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Expected data.status = "ok", got ${data.status}`);
    if (!data.database?.connected) throw new Error('Expected database.connected = true');
    if (typeof data.database?.latency_ms !== 'number') throw new Error('Expected latency_ms number');
    if (data.service !== 'yes-enterprises-api') throw new Error('Expected service name');
  });

  await assertTest('Health endpoint reports degraded status when DB is unavailable', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/health', env: { DB: null } });
    const res = await handleHealth(ctx);
    if (res.status !== 503) throw new Error(`Expected HTTP 503, got ${res.status}`);
    const data = await res.json();
    if (data.status !== 'degraded') throw new Error('Expected degraded status');
    if (data.database?.connected !== false) throw new Error('Expected connected: false');
  });

  await assertTest('Health endpoint does not expose secrets or internal config', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/health',
      env: { SECRET_KEY: 'super-secret', DB_PASSWORD: 'hidden' }
    });
    const res = await handleHealth(ctx);
    const bodyText = await res.text();
    if (bodyText.includes('super-secret') || bodyText.includes('hidden')) {
      throw new Error('Health check leaked environment secrets in response');
    }
  });

  // 2. Database Integration & Error Safety Tests
  console.log('\n--- 2. Database Integration & Error Safety Tests ---');

  await assertTest('D1 adapter successfully executes prepared queries against schema', async () => {
    const result = await d1Binding.prepare('SELECT COUNT(*) as c FROM products WHERE id = ?').bind(PROD_ACTIVE_1).first('c');
    if (result !== 1) throw new Error(`Expected 1 product, got ${result}`);
  });

  await assertTest('Database error handler returns safe 500 without leaking SQL or stack traces', async () => {
    const safeResponse = handleDbError(new Error('SQLITE_ERROR: syntax error at "SELECT * FROM nonexistent"'));
    if (safeResponse.status !== 500) throw new Error(`Expected status 500, got ${safeResponse.status}`);
    const json = await safeResponse.json();
    if (json.success !== false) throw new Error('Expected success: false');
    if (json.error.code !== 'DATABASE_ERROR') throw new Error('Expected DATABASE_ERROR code');
    const bodyStr = JSON.stringify(json);
    if (bodyStr.includes('SQLITE_ERROR') || bodyStr.includes('nonexistent')) {
      throw new Error('Database error response leaked internal SQL details');
    }
  });

  // 3. Categories Listing Tests (GET /api/categories)
  console.log('\n--- 3. Categories Listing Tests (GET /api/categories) ---');

  await assertTest('Categories listing returns categories with active product counts', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/categories' });
    const res = await handleCategories(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Expected success true with array');

    const cat = json.data.find(c => c.id === CAT_FEEDING);
    if (!cat) throw new Error('Feeding category not found');
    if (cat.product_count !== 1) throw new Error(`Expected product_count = 1 (active only), got ${cat.product_count}`);
  });

  await assertTest('Categories endpoint provides public cache headers', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/categories' });
    const res = await handleCategories(ctx);
    const cacheControl = res.headers.get('Cache-Control');
    if (!cacheControl || !cacheControl.includes('public') || !cacheControl.includes('s-maxage')) {
      throw new Error(`Expected public edge cache header, got: ${cacheControl}`);
    }
  });

  // 4. Products Listing Tests (GET /api/products)
  console.log('\n--- 4. Products Listing Tests (GET /api/products) ---');

  await assertTest('Products listing returns active products with pagination metadata', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/products?limit=10&offset=0' });
    const res = await handleProducts(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error('Expected success: true');
    if (!json.pagination || typeof json.pagination.total !== 'number') throw new Error('Missing pagination metadata');

    const item = json.data.find(p => p.id === PROD_ACTIVE_1);
    if (!item) throw new Error('Active product 1 not found in products listing');
    if (item.category.id !== CAT_FEEDING) throw new Error('Category relationship mismatch');
    if (item.primary_image_key !== `${TEST_PREFIX}bottle_main.webp`) {
      throw new Error(`Expected primary image key, got: ${item.primary_image_key}`);
    }
    if (item.variants_count !== 2) throw new Error(`Expected 2 active variants, got ${item.variants_count}`);
  });

  await assertTest('Inactive (draft/archived) products are omitted from public catalogue', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/products?limit=50' });
    const res = await handleProducts(ctx);
    const json = await res.json();
    const ids = json.data.map(p => p.id);
    if (ids.includes(PROD_DRAFT)) throw new Error('Draft product leaked into public listing');
    if (ids.includes(PROD_ARCHIVED)) throw new Error('Archived product leaked into public listing');
  });

  await assertTest('Products listing supports category filtering by slug', async () => {
    const ctx = createFunctionContext({ url: `http://localhost/api/products?category=feeding-${CLEAN_RUN_ID}` });
    const res = await handleProducts(ctx);
    const json = await res.json();
    if (json.data.length !== 1 || json.data[0].id !== PROD_ACTIVE_1) {
      throw new Error(`Expected exactly product 1 for category filter, got ${json.data.length}`);
    }
  });

  await assertTest('Products listing supports featured filtering', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/products?featured=1' });
    const res = await handleProducts(ctx);
    const json = await res.json();
    const testItems = json.data.filter(p => p.id.startsWith(TEST_PREFIX));
    if (testItems.length !== 1 || testItems[0].id !== PROD_ACTIVE_1) {
      throw new Error(`Expected only active product 1 as featured, got ${testItems.length}`);
    }
  });

  await assertTest('Products listing supports keyword search filtering', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/products?search=Tiffin' });
    const res = await handleProducts(ctx);
    const json = await res.json();
    const testItems = json.data.filter(p => p.id.startsWith(TEST_PREFIX));
    if (testItems.length !== 1 || testItems[0].id !== PROD_ACTIVE_2) {
      throw new Error(`Expected only Tiffin product matching search, got ${testItems.length}`);
    }
  });

  await assertTest('Products listing clamps pagination limit to maximum 50', async () => {
    const ctx = createFunctionContext({ url: 'http://localhost/api/products?limit=500' });
    const res = await handleProducts(ctx);
    const json = await res.json();
    if (json.pagination.limit !== 50) {
      throw new Error(`Expected limit clamped to 50, got ${json.pagination.limit}`);
    }
  });

  await assertTest('Products listing rejects negative or non-integer pagination limit with 400', async () => {
    const ctx1 = createFunctionContext({ url: 'http://localhost/api/products?limit=-5' });
    const res1 = await handleProducts(ctx1);
    if (res1.status !== 400) throw new Error(`Expected 400 for negative limit, got ${res1.status}`);

    const ctx2 = createFunctionContext({ url: 'http://localhost/api/products?limit=invalid' });
    const res2 = await handleProducts(ctx2);
    if (res2.status !== 400) throw new Error(`Expected 400 for non-integer limit, got ${res2.status}`);
  });

  await assertTest('Products listing rejects negative or non-integer pagination offset with 400', async () => {
    const ctx1 = createFunctionContext({ url: 'http://localhost/api/products?offset=-10' });
    const res1 = await handleProducts(ctx1);
    if (res1.status !== 400) throw new Error(`Expected 400 for negative offset, got ${res1.status}`);

    const ctx2 = createFunctionContext({ url: 'http://localhost/api/products?offset=xyz' });
    const res2 = await handleProducts(ctx2);
    if (res2.status !== 400) throw new Error(`Expected 400 for non-integer offset, got ${res2.status}`);
  });

  // 5. Product Lookup by Slug Tests (GET /api/products/:slug)
  console.log('\n--- 5. Product Lookup by Slug Tests (GET /api/products/:slug) ---');

  await assertTest('Product detail returns active product with variants and images', async () => {
    const ctx = createFunctionContext({
      url: `http://localhost/api/products/${SLUG_BOTTLE}`,
      params: { slug: SLUG_BOTTLE }
    });
    const res = await handleProductDetail(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error('Expected success true with product data');
    if (json.data.slug !== SLUG_BOTTLE) throw new Error('Slug mismatch');
    if (json.data.variants.length !== 2) throw new Error(`Expected 2 active variants, got ${json.data.variants.length}`);
    if (json.data.images.length !== 2) throw new Error(`Expected 2 images, got ${json.data.images.length}`);
    if (json.data.specifications.capacity !== '250ml') throw new Error('Specifications JSON not parsed');
  });

  await assertTest('Product detail returns 404 for non-existent slug', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/products/non-existent-product',
      params: { slug: 'non-existent-product' }
    });
    const res = await handleProductDetail(ctx);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    const json = await res.json();
    if (json.error.code !== 'PRODUCT_NOT_FOUND') throw new Error('Expected PRODUCT_NOT_FOUND code');
  });

  await assertTest('Product detail returns 404 for draft product slug', async () => {
    const ctx = createFunctionContext({
      url: `http://localhost/api/products/${SLUG_DRAFT}`,
      params: { slug: SLUG_DRAFT }
    });
    const res = await handleProductDetail(ctx);
    if (res.status !== 404) throw new Error(`Expected 404 for draft product, got ${res.status}`);
  });

  await assertTest('Product detail returns 404 for archived product slug', async () => {
    const ctx = createFunctionContext({
      url: `http://localhost/api/products/${SLUG_ARCHIVED}`,
      params: { slug: SLUG_ARCHIVED }
    });
    const res = await handleProductDetail(ctx);
    if (res.status !== 404) throw new Error(`Expected 404 for archived product, got ${res.status}`);
  });

  await assertTest('Product detail rejects invalid slug format with 400', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/products/Invalid%20Slug%20With%20Spaces',
      params: { slug: 'Invalid Slug With Spaces' }
    });
    const res = await handleProductDetail(ctx);
    if (res.status !== 400) throw new Error(`Expected 400 for invalid slug, got ${res.status}`);
    const json = await res.json();
    if (json.error.code !== 'INVALID_SLUG') throw new Error('Expected INVALID_SLUG code');
  });

  // 6. Admin Authentication & Cloudflare Access Security Tests
  console.log('\n--- 6. Admin Authentication & Cloudflare Access Security Tests ---');

  await assertTest('Unauthenticated admin session request rejected with 401 UNAUTHENTICATED', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      env: { ENABLE_DEV_ADMIN_BYPASS: 'false' }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = await res.json();
    if (json.error.code !== 'UNAUTHENTICATED') throw new Error(`Expected UNAUTHENTICATED, got ${json.error.code}`);
  });

  await assertTest('Malformed Access JWT rejected with 401', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { CF_Authorization: 'not-a-valid-jwt-token' },
      env: { ENABLE_DEV_ADMIN_BYPASS: 'false' }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await assertTest('Expired Access JWT rejected with 401 EXPIRED_TOKEN', async () => {
    const expiredToken = createSignedJwt({ exp: Math.floor(Date.now() / 1000) - 300 });
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { CF_Authorization: expiredToken },
      env: { ENABLE_DEV_ADMIN_BYPASS: 'false' }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = await res.json();
    if (json.error.code !== 'EXPIRED_TOKEN') throw new Error(`Expected EXPIRED_TOKEN, got ${json.error.code}`);
  });

  await assertTest('Access JWT with wrong audience rejected with 401 INVALID_AUDIENCE', async () => {
    const wrongAudToken = createSignedJwt({ aud: 'wrong-audience-tag' });
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { CF_Authorization: wrongAudToken },
      env: { ENABLE_DEV_ADMIN_BYPASS: 'false', CF_ACCESS_AUD: 'test-access-aud-tag' }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = await res.json();
    if (json.error.code !== 'INVALID_AUDIENCE') throw new Error(`Expected INVALID_AUDIENCE, got ${json.error.code}`);
  });

  await assertTest('Access JWT with wrong issuer rejected with 401 INVALID_ISSUER', async () => {
    const wrongIssToken = createSignedJwt({ iss: 'https://evil-team.cloudflareaccess.com' });
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { CF_Authorization: wrongIssToken },
      env: { ENABLE_DEV_ADMIN_BYPASS: 'false', CF_ACCESS_TEAM_NAME: 'yes-enterprises' }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = await res.json();
    if (json.error.code !== 'INVALID_ISSUER') throw new Error(`Expected INVALID_ISSUER, got ${json.error.code}`);
  });

  await assertTest('Access JWT with tampered signature rejected with 401 INVALID_SIGNATURE', async () => {
    const validToken = createSignedJwt();
    const parts = validToken.split('.');
    // Flip characters in the signature
    const corruptedSig = parts[2].substring(0, parts[2].length - 4) + 'AAAA';
    const tamperedToken = `${parts[0]}.${parts[1]}.${corruptedSig}`;

    // Pass custom mock fetcher for JWKS
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { CF_Authorization: tamperedToken },
      env: { ENABLE_DEV_ADMIN_BYPASS: 'false', CF_ACCESS_TEAM_NAME: 'yes-enterprises' }
    });

    // Custom test calling middleware with injected mock JWKS fetch
    const { validateAdminSession } = await import('../functions/_shared/auth.js');
    const authResult = await validateAdminSession(ctx, mockJwksFetch);
    if (authResult.ok) throw new Error('Tampered signature was accepted');
    if (authResult.code !== 'INVALID_SIGNATURE') throw new Error(`Expected INVALID_SIGNATURE, got ${authResult.code}`);
  });

  await assertTest('Admin allowlist blocks non-admin email with 403 FORBIDDEN', async () => {
    const unauthorizedToken = createSignedJwt({ email: 'stranger@external.com' });
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { CF_Authorization: unauthorizedToken },
      env: {
        ENABLE_DEV_ADMIN_BYPASS: 'false',
        CF_ACCESS_TEAM_NAME: 'yes-enterprises',
        ADMIN_EMAILS: 'admin@yesenterprises.in'
      }
    });

    const { validateAdminSession } = await import('../functions/_shared/auth.js');
    const authResult = await validateAdminSession(ctx, mockJwksFetch);
    if (authResult.ok) throw new Error('Unauthorized email was accepted');
    if (authResult.status !== 403 || authResult.code !== 'FORBIDDEN') {
      throw new Error(`Expected 403 FORBIDDEN, got ${authResult.status} ${authResult.code}`);
    }
  });

  await assertTest('Valid RS256 token with permitted admin email returns 200 with admin session', async () => {
    const validToken = createSignedJwt({ email: 'admin@yesenterprises.in' });
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { CF_Authorization: validToken },
      env: {
        ENABLE_DEV_ADMIN_BYPASS: 'false',
        CF_ACCESS_TEAM_NAME: 'yes-enterprises',
        CF_ACCESS_AUD: 'test-access-aud-tag',
        ADMIN_EMAILS: 'admin@yesenterprises.in'
      }
    });

    const { validateAdminSession } = await import('../functions/_shared/auth.js');
    const authResult = await validateAdminSession(ctx, mockJwksFetch);
    if (!authResult.ok) throw new Error(`Expected authentication success, got: ${authResult.message}`);
    if (authResult.user.email !== 'admin@yesenterprises.in') throw new Error('Email mismatch');
    if (authResult.user.auth_type !== 'cloudflare_access') throw new Error('Expected cloudflare_access auth_type');
  });

  // 7. Development Bypass Safety Tests (4 Simultaneous Conditions)
  console.log('\n--- 7. Development Bypass Safety Tests (4 Simultaneous Conditions) ---');

  await assertTest('Development bypass succeeds on localhost when all 4 conditions are met', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { 'x-dev-admin-bypass': 'true' },
      env: {
        ENVIRONMENT: 'development',
        ENABLE_DEV_ADMIN_BYPASS: 'true',
        DEV_BYPASS_EMAIL: 'admin@yesenterprises.in',
        ADMIN_EMAILS: 'admin@yesenterprises.in'
      }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data.authenticated) throw new Error('Expected authenticated admin session');
    if (json.data.auth_type !== 'development_bypass') throw new Error('Expected development_bypass auth_type');
    if (json.data.email !== 'admin@yesenterprises.in') throw new Error('Email mismatch');
  });

  await assertTest('Bypass rejected in production environment (ENVIRONMENT = "production")', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { 'x-dev-admin-bypass': 'true' },
      env: {
        ENVIRONMENT: 'production',
        ENABLE_DEV_ADMIN_BYPASS: 'true'
      }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401 in production, got ${res.status}`);
  });

  await assertTest('Bypass rejected on non-localhost remote host (e.g. api.yesenterprises.in)', async () => {
    const ctx = createFunctionContext({
      url: 'https://api.yesenterprises.in/api/admin/session',
      headers: {
        host: 'api.yesenterprises.in',
        'x-dev-admin-bypass': 'true'
      },
      env: {
        ENVIRONMENT: 'development',
        ENABLE_DEV_ADMIN_BYPASS: 'true'
      }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401 on remote host, got ${res.status}`);
  });

  await assertTest('Bypass rejected when ENABLE_DEV_ADMIN_BYPASS is not "true"', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { 'x-dev-admin-bypass': 'true' },
      env: {
        ENVIRONMENT: 'development',
        ENABLE_DEV_ADMIN_BYPASS: 'false'
      }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401 when flag is false, got ${res.status}`);
  });

  await assertTest('Bypass rejected when x-dev-admin-bypass header is missing', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: {},
      env: {
        ENVIRONMENT: 'development',
        ENABLE_DEV_ADMIN_BYPASS: 'true'
      }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 401) throw new Error(`Expected 401 when header missing, got ${res.status}`);
  });

  await assertTest('Bypass rejected when dev bypass email is not in ADMIN_EMAILS allowlist', async () => {
    const ctx = createFunctionContext({
      url: 'http://localhost/api/admin/session',
      headers: { 'x-dev-admin-bypass': 'true' },
      env: {
        ENVIRONMENT: 'development',
        ENABLE_DEV_ADMIN_BYPASS: 'true',
        DEV_BYPASS_EMAIL: 'imposter@external.com',
        ADMIN_EMAILS: 'admin@yesenterprises.in'
      }
    });
    const res = await handleAdminSession(ctx);
    if (res.status !== 403) throw new Error(`Expected 403 when dev email not in allowlist, got ${res.status}`);
  });

} finally {
  console.log('\n--- Guaranteed Teardown (finally block) ---');

  // Exact-prefix parameterized cleanup
  cleanupTestFixturesByPrefix(sqliteDb, TEST_PREFIX);
  console.log(`Scoped test fixtures matching exact prefix "${TEST_PREFIX}" cleaned up.`);

  // Verify baseline preservation
  await assertTest('Final Verification: Pre-existing database baseline counts completely preserved', async () => {
    const finalCounts = {
      categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
      products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
      variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
      images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
      inventoryLogs: sqliteDb.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
      siteSettings: sqliteDb.prepare("SELECT COUNT(*) as c FROM site_settings").get().c
    };

    for (const [table, count] of Object.entries(baselineCounts)) {
      if (finalCounts[table] !== count) {
        throw new Error(`Count mismatch in table "${table}": expected ${count}, got ${finalCounts[table]}`);
      }
    }
  });
}

console.log('=================================================================');
console.log(`Phase 2 Test Suite Summary: ${passed} Passed, ${failed} Failed`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL ${passed} PHASE 2 BACKEND & API TESTS COMPLETED SUCCESSFULLY!`);
  console.log('🛡️ DATA INTEGRITY CONFIRMED: Database baseline state 100% preserved.');
  console.log('ℹ️ TEST DISTINCTION:');
  console.log('   - Sections 1-5: Local Pages Functions handlers + local D1 emulator database.');
  console.log('   - Section 6: Real WebCrypto RS256 signature verification & Cloudflare Access claims.');
  console.log('   - Section 7: Multi-condition development bypass security matrix.');
  process.exit(0);
}
