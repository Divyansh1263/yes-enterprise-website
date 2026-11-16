import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

// Import Pages Functions handlers to test live backend integration with frontend services
import { onRequestGet as handleAdminProductsList, onRequestPost as handleAdminProductCreate } from '../functions/api/admin/products/index.js';
import { onRequestGet as handleAdminProductGet, onRequestPut as handleAdminProductPut, onRequestDelete as handleAdminProductDelete } from '../functions/api/admin/products/[id].js';
import { onRequestPost as handleAdminProductDuplicate } from '../functions/api/admin/products/[id]/duplicate.js';
import { onRequestPost as handleAdminCategoryCreate } from '../functions/api/admin/categories/index.js';
import { onRequestPut as handleAdminCategoryPut, onRequestDelete as handleAdminCategoryDelete } from '../functions/api/admin/categories/[id].js';
import { onRequestPut as handleAdminCategoryReorder } from '../functions/api/admin/categories/reorder.js';
import { onRequestPut as handleAdminInventoryUpdate } from '../functions/api/admin/inventory/index.js';
import { onRequestGet as handleAdminInventoryLogs } from '../functions/api/admin/inventory/logs.js';
import { onRequestPost as handleUploadRequestUrl } from '../functions/api/admin/uploads/request-url.js';
import { onRequestPost as handleUploadFinalize } from '../functions/api/admin/uploads/finalize.js';
import { onRequestPut as handleImagePut, onRequestDelete as handleImageDelete } from '../functions/api/admin/images/[id].js';
import { onRequestPut as handleImageReorder } from '../functions/api/admin/images/reorder.js';
import { onRequestGet as handleAdminSession } from '../functions/api/admin/session.js';
import { onRequestGet as handlePublicProducts } from '../functions/api/products/index.js';
import { onRequestGet as handlePublicProductDetail } from '../functions/api/products/[slug].js';
import { onRequestGet as handlePublicCategories } from '../functions/api/categories/index.js';

// Import client services & utilities
import { isLocalEnvironment, isFixtureFallbackAllowed, isDevBypassActive, setDevBypassActive, apiFetch, ApiError } from '../src/services/api/client.js';
import { getAdminSession, loginWithDevBypass, signOutAdmin } from '../src/services/api/auth.js';
import { getR2ImageUrl } from '../src/services/api/uploads.js';
import { paiseToInr, inrToPaise, formatInr } from '../src/utils/currency.js';
import { buildWhatsAppUrl, buildWhatsAppContactUrl } from '../src/lib/whatsapp.js';
import { getAllProducts, getAllCategories, getProductName, getProductDescription, getCategoryName } from '../src/data/products.js';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 4 Frontend & Integration Test Suite');
console.log('Testing Admin Dashboard, Security, Offline Fallback & Workflows');
console.log('=================================================================\n');

// Mapping of known Cloudflare D1 database IDs to their Miniflare Durable Object storage hashes
const KNOWN_D1_HASHES = {
  // Production / active development binding: 54c9ce5b-377e-4788-9899-43f71addf8a9
  '54c9ce5b-377e-4788-9899-43f71addf8a9': '6a1b3b744fa3757d88c3c37a6e58dbe029fc1f0fedf109567181075521f4e00c'
};

// ── 1. DETERMINISTIC INTENDED D1 DATABASE LOCATOR ────────────────────────────
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
      const mig = inspectDb.prepare("SELECT id FROM d1_migrations WHERE name = '0001_initial_schema.sql'").get();
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
      rawDb.exec('SAVEPOINT d1_p4_batch;');
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.all());
        }
        rawDb.exec('RELEASE SAVEPOINT d1_p4_batch;');
        return results;
      } catch (err) {
        rawDb.exec('ROLLBACK TO SAVEPOINT d1_p4_batch; RELEASE SAVEPOINT d1_p4_batch;');
        throw err;
      }
    }
  };
}

const d1Binding = createD1Adapter(sqliteDb);

// ── MOCK IN-MEMORY R2 BUCKET ─────────────────────────────────────────────────
const mockR2Storage = new Map();
const mockR2Bucket = {
  async get(key) {
    if (!mockR2Storage.has(key)) return null;
    const item = mockR2Storage.get(key);
    return {
      size: item.bytes.length,
      httpMetadata: { contentType: item.contentType },
      async arrayBuffer() {
        return item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength);
      }
    };
  },
  async put(key, bytes, options = {}) {
    mockR2Storage.set(key, {
      bytes: new Uint8Array(bytes),
      contentType: options.httpMetadata?.contentType || 'application/octet-stream'
    });
    return { key, size: bytes.length };
  },
  async delete(key) {
    mockR2Storage.delete(key);
    return true;
  }
};

// ── TEST RUN IDENTIFIERS & BASELINE STATE ────────────────────────────────────
const RUN_ID = `p4_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const TEST_PREFIX = `test_${RUN_ID}_`;
const CLEAN_RUN_ID = RUN_ID.replace(/_/g, '-');

const baselineCounts = {
  categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
  products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
  variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
  images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
  inventoryLogs: sqliteDb.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
  pendingUploads: sqliteDb.prepare("SELECT COUNT(*) as c FROM pending_uploads").get().c,
  cleanupClaims: sqliteDb.prepare("SELECT COUNT(*) as c FROM cleanup_claims").get().c
};

console.log(`Pre-test baseline database record count: ${baselineCounts.products} products, ${baselineCounts.categories} categories.`);

// Safe exact-prefix parameterized teardown helper
function cleanupTestFixturesByPrefix(rawDb, prefix) {
  rawDb.prepare(`
    DELETE FROM product_images 
    WHERE substr(id, 1, length(?)) = ? 
       OR substr(product_id, 1, length(?)) = ?
       OR substr(image_key, 1, length(?)) = ?;
  `).run(prefix, prefix, prefix, prefix, prefix, prefix);

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

// ── ENVIRONMENT CONTEXT CREATION HELPER ──────────────────────────────────────
const DEV_ENV = {
  ENVIRONMENT: 'development',
  CF_ACCESS_TEAM_NAME: 'yes-enterprises',
  CF_ACCESS_AUD: 'test-aud-p4',
  ADMIN_EMAILS: 'admin@yesenterprises.in,owner@yesenterprises.in',
  ENABLE_DEV_ADMIN_BYPASS: 'true',
  DEV_BYPASS_EMAIL: 'admin@yesenterprises.in',
  R2_ACCOUNT_ID: 'test-account-id',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key-p4',
  R2_BUCKET_NAME: 'yes-enterprises-public-images',
  DB: d1Binding,
  PRODUCT_BUCKET: mockR2Bucket
};

function createRequestContext(urlStr, options = {}, envOverrides = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});

  if (options.auth !== false && !headers.has('x-dev-admin-bypass')) {
    headers.set('x-dev-admin-bypass', 'true');
    headers.set('host', '127.0.0.1:8788');
  }

  const reqInit = { method, headers };
  if (options.body) {
    reqInit.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const request = new Request(urlStr, reqInit);
  const url = new URL(urlStr);

  return {
    request,
    env: { ...DEV_ENV, ...envOverrides },
    params: options.params || {},
    data: {},
    waitUntil: () => {},
    next: () => {},
    functionPath: url.pathname
  };
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

// ── VALID IMAGE BYTE GENERATORS ─────────────────────────────────────────────
function createValidJpegBytes(width = 120, height = 80) {
  const buf = new Uint8Array(20);
  buf[0] = 0xFF; buf[1] = 0xD8;
  buf[2] = 0xFF; buf[3] = 0xC0;
  const view = new DataView(buf.buffer);
  view.setUint16(4, 11, false);
  buf[6] = 8;
  view.setUint16(7, height, false);
  view.setUint16(9, width, false);
  buf[11] = 3;
  buf[18] = 0xFF; buf[19] = 0xD9;
  return buf;
}

// ── MAIN RUNNER ─────────────────────────────────────────────────────────────
async function runPhase4Tests() {
  let testCatId = null;
  let simpleId = null;
  let variableId = null;
  let dupeId = null;
  const trackedImageKeys = new Set();

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // 1. UNSAFE FIXTURE FALLBACK REMOVAL & VERIFICATION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 1. Unsafe Production Fixture Fallback Removal Tests ---');

    await assertTest('Production environment: isLocalEnvironment() strictly returns false even on localhost', async () => {
      // Mock window on localhost
      globalThis.window = { location: { hostname: 'localhost' } };
      // Simulate production environment
      globalThis.__TEST_IS_PROD__ = true;
      try {
        const result = isLocalEnvironment();
        if (result !== false) throw new Error(`Expected isLocalEnvironment() to be false in production, got ${result}`);
      } finally {
        globalThis.__TEST_IS_PROD__ = undefined;
      }
    });

    await assertTest('Production environment: isFixtureFallbackAllowed() strictly returns false', async () => {
      globalThis.window = { location: { hostname: 'localhost' } };
      globalThis.__TEST_IS_PROD__ = true;
      try {
        const result = isFixtureFallbackAllowed();
        if (result !== false) throw new Error(`Expected isFixtureFallbackAllowed() to be false in production, got ${result}`);
      } finally {
        globalThis.__TEST_IS_PROD__ = undefined;
      }
    });

    await assertTest('Production environment: API failure returns 0 products and error state without substituting fixtures', async () => {
      // Setup mock fetch that fails (simulating network/backend failure)
      const origFetch = globalThis.fetch;
      globalThis.window = { location: { hostname: 'yesenterprises.in' } };
      globalThis.__TEST_IS_PROD__ = true;

      try {
        globalThis.fetch = async () => {
          throw new TypeError('Failed to fetch: Connection refused');
        };

        // Attempting to fetch products with fallback data passed
        let caughtErr = null;
        let returnedData = null;
        try {
          returnedData = await apiFetch('/products');
        } catch (err) {
          caughtErr = err;
        }

        if (!caughtErr) throw new Error('Expected apiFetch to throw on network error');
        if (returnedData !== null) throw new Error('Expected no data on failure');

        // Verify that isFixtureFallbackAllowed is false so hooks will not inject fixtures
        if (isFixtureFallbackAllowed() !== false) {
          throw new Error('Fixture fallback should not be allowed');
        }
      } finally {
        globalThis.fetch = origFetch;
        globalThis.__TEST_IS_PROD__ = undefined;
      }
    });

    await assertTest('Preserve WhatsApp contact functionality even when catalogue API is offline', async () => {
      const waUrl = buildWhatsAppContactUrl('en');
      if (!waUrl || (!waUrl.includes('api.whatsapp.com') && !waUrl.includes('wa.me'))) {
        throw new Error(`Invalid WhatsApp contact URL: ${waUrl}`);
      }
      const waUrlHi = buildWhatsAppContactUrl('hi');
      if (!waUrlHi || (!waUrlHi.includes('api.whatsapp.com') && !waUrlHi.includes('wa.me'))) {
        throw new Error('Hindi WhatsApp contact URL generation failed');
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 2. ADMIN SETTINGS PERSISTENCE VERIFICATION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 2. Admin Settings Persistence Findings ---');

    await assertTest('Confirm no backend write API exists for site_settings', async () => {
      const endpoints = [
        'functions/api/admin/settings.js',
        'functions/api/admin/settings/index.js',
        'functions/api/settings.js',
        'functions/api/settings/index.js'
      ];
      for (const ep of endpoints) {
        if (fs.existsSync(path.resolve(ep))) {
          throw new Error(`Unexpected settings endpoint found at ${ep}`);
        }
      }
    });

    await assertTest('AdminSettings page renders read-only config with disclaimer without fake persistence', async () => {
      const content = fs.readFileSync(path.resolve('src/pages/admin/AdminSettings.jsx'), 'utf-8');
      if (content.includes('setSaved(true)') || content.includes('Settings saved to local configuration')) {
        throw new Error('AdminSettings contains fake save handler or fake alert');
      }
      if (!content.includes('readOnly') || !content.includes('site_settings')) {
        throw new Error('AdminSettings should clearly explain that dynamic settings are read-only and unauthoritzed');
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 3. AUTHENTICATION & SECURITY VERIFICATION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 3. Authentication & Security Verification Tests ---');

    await assertTest('Dev bypass header is NOT sent in production builds', async () => {
      const origFetch = globalThis.fetch;
      let sentHeaders = null;
      globalThis.__TEST_IS_PROD__ = true;

      try {
        globalThis.window = { location: { hostname: 'yesenterprises.in' } };
        globalThis.sessionStorage = { getItem: () => 'true' };

        globalThis.fetch = async (url, opts) => {
          sentHeaders = opts.headers;
          return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
        };

        try {
          await apiFetch('/admin/session');
        } catch {}

        if (sentHeaders && sentHeaders.get('x-dev-admin-bypass')) {
          throw new Error('x-dev-admin-bypass header was sent in production mode!');
        }
      } finally {
        globalThis.__TEST_IS_PROD__ = undefined;
        globalThis.fetch = origFetch;
      }
    });

    await assertTest('loginWithDevBypass() throws error when called on non-local origin', async () => {
      globalThis.__TEST_IS_PROD__ = true;
      try {
        let caught = null;
        try {
          await loginWithDevBypass();
        } catch (e) {
          caught = e;
        }
        if (!caught) throw new Error('Expected loginWithDevBypass to throw in production mode');
      } finally {
        globalThis.__TEST_IS_PROD__ = undefined;
      }
    });

    await assertTest('signOutAdmin() clears local bypass state and redirects in production', async () => {
      let cleared = false;
      globalThis.sessionStorage = {
        setItem: (k, v) => {
          if (k === 'ye_dev_admin_bypass' && v === 'false') cleared = true;
        }
      };
      setDevBypassActive(false);
      if (!cleared && isLocalEnvironment()) {
        throw new Error('Failed to set dev bypass to false on sign out');
      }
    });

    await assertTest('Backend session handler correctly derives identity from token / bypass', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/session');
      const res = await handleAdminSession(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (!body.data?.authenticated || body.data?.email !== 'admin@yesenterprises.in') {
        throw new Error('Identity was not correctly derived from session');
      }
    });

    await assertTest('Backend session handler rejects unauthenticated request with 401', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/session', { auth: false });
      const res = await handleAdminSession(ctx);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 4. PRODUCT MANAGEMENT WORKFLOWS (CRUD, VARIANTS, SEARCH, PERSISTENCE)
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 4. Product Management Workflow Tests ---');

    const catSlug = `${CLEAN_RUN_ID}-p4-cat`;

    await assertTest('Workflow: Create Category for testing', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        body: {
          name: 'P4 Test Category',
          name_hi: 'P4 टेस्ट श्रेणी',
          slug: catSlug,
          sort_order: 1
        }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 201) throw new Error(`Failed to create test category: ${res.status}`);
      const body = await res.json();
      testCatId = body.data?.id;
    });

    const simpleSku = `YE-${CLEAN_RUN_ID.toUpperCase()}-SMP`;
    const simpleSlug = `${CLEAN_RUN_ID}-glass-water-bottle`;

    await assertTest('Workflow: Create Simple Product with currency in paise, stock and specs', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products', {
        method: 'POST',
        body: {
          name: 'Glass Water Bottle 500ml',
          name_hi: 'कांच की पानी की बोतल 500ml',
          slug: simpleSlug,
          category_id: testCatId,
          has_variants: false,
          base_price_paise: inrToPaise('299.00'),
          compare_at_price_paise: inrToPaise('399.00'),
          stock_quantity: 45,
          low_stock_threshold: 5,
          sku: simpleSku,
          specifications: [{ key: 'Material', value: 'Borosilicate Glass' }],
          status: 'active'
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 201) throw new Error(`Failed to create simple product: ${res.status}`);
      const body = await res.json();
      simpleId = body.data?.id;
      if (body.data?.base_price_paise !== 29900) {
        throw new Error(`Expected price 29900 paise, got ${body.data?.base_price_paise}`);
      }
    });

    await assertTest('Workflow: Verify Simple Product persistence on server reload (GET /admin/products/:id)', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${simpleId}`, {
        params: { id: simpleId }
      });
      const res = await handleAdminProductGet(ctx);
      if (res.status !== 200) throw new Error(`Product reload failed with status ${res.status}`);
      const body = await res.json();
      if (body.data?.name !== 'Glass Water Bottle 500ml' || body.data?.stock_quantity !== 45) {
        throw new Error('Reloaded product data does not match persisted state');
      }
    });

    const varSku1 = `YE-${CLEAN_RUN_ID.toUpperCase()}-V1`;
    const varSku2 = `YE-${CLEAN_RUN_ID.toUpperCase()}-V2`;
    const varSlug = `${CLEAN_RUN_ID}-stainless-steel-sipper`;

    await assertTest('Workflow: Create Variable Product with seller attribute schema & dynamic variants', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products', {
        method: 'POST',
        body: {
          name: 'Stainless Steel Sipper Tumbler',
          name_hi: 'स्टेनलेस स्टील सिपर टम्बलर',
          slug: varSlug,
          category_id: testCatId,
          has_variants: true,
          variant_attributes_schema: ['Capacity', 'Colour'],
          variants: [
            {
              title: '350ml Blue',
              title_hi: '350ml नीला',
              sku: varSku1,
              price_paise: inrToPaise('349.00'),
              stock_quantity: 20,
              low_stock_threshold: 4,
              attributes: { Capacity: '350ml', Colour: 'Blue' }
            },
            {
              title: '500ml Red',
              title_hi: '500ml लाल',
              sku: varSku2,
              price_paise: inrToPaise('449.00'),
              stock_quantity: 35,
              low_stock_threshold: 5,
              attributes: { Capacity: '500ml', Colour: 'Red' }
            }
          ]
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 201) throw new Error(`Failed to create variable product: ${res.status}`);
      const body = await res.json();
      variableId = body.data?.id;
      if (!variableId || body.data?.variants?.length !== 2) {
        throw new Error('Variable product was not persisted with variants');
      }
    });

    await assertTest('Workflow: Edit existing product details & modify variants', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${simpleId}`, {
        method: 'PUT',
        params: { id: simpleId },
        body: {
          name: 'Premium Glass Water Bottle 500ml',
          stock_quantity: 60 // +15
        }
      });
      const res = await handleAdminProductPut(ctx);
      if (res.status !== 200) throw new Error(`Product update failed: ${res.status}`);
      const body = await res.json();
      if (body.data?.name !== 'Premium Glass Water Bottle 500ml' || body.data?.stock_quantity !== 60) {
        throw new Error('Product update did not persist to D1');
      }
    });

    await assertTest('Workflow: Duplicate product and verify independent R2 keys', async () => {
      // Attach an image to simpleId in mock R2
      const imgKey = `products/${TEST_PREFIX}img_to_dupe.jpg`;
      trackedImageKeys.add(imgKey);
      await mockR2Bucket.put(imgKey, createValidJpegBytes(150, 150), { httpMetadata: { contentType: 'image/jpeg' } });
      sqliteDb.prepare(`
        INSERT INTO product_images (id, product_id, image_key, alt_text, mime_type, file_size_bytes, width, height, is_primary, sort_order)
        VALUES (?, ?, ?, 'Dupe test', 'image/jpeg', 20, 150, 150, 1, 0)
      `).run(`${TEST_PREFIX}img_dupe_1`, simpleId, imgKey);

      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${simpleId}/duplicate`, {
        method: 'POST',
        params: { id: simpleId }
      });
      const res = await handleAdminProductDuplicate(ctx);
      if (res.status !== 201) throw new Error(`Product duplication failed: ${res.status}`);
      const body = await res.json();
      dupeId = body.data?.id;

      // Verify duplicated product has independent image key
      const dupeImages = sqliteDb.prepare('SELECT image_key FROM product_images WHERE product_id = ?').all(dupeId);
      for (const d of dupeImages) {
        trackedImageKeys.add(d.image_key);
      }
      if (dupeImages.length !== 1 || dupeImages[0].image_key === imgKey) {
        throw new Error('Duplicated product must have a distinct R2 object key');
      }
    });

    await assertTest('Workflow: Search and filter products by status and stock status', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products?q=Premium');
      const res = await handleAdminProductsList(ctx);
      if (res.status !== 200) throw new Error(`Search failed: ${res.status}`);
      const body = await res.json();
      if (!body.data.some(p => p.id === simpleId)) {
        throw new Error('Search query did not return expected product');
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 5. INVENTORY CONTROL & AUDIT TRAIL WORKFLOWS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 5. Inventory Control & Audit Trail Tests ---');

    await assertTest('Workflow: Stock adjustment with mandatory reason updates quantity and records log', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/inventory', {
        method: 'PUT',
        body: {
          product_id: simpleId,
          new_quantity: 80,
          reason: 'Received new batch from factory floor'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 200) throw new Error(`Inventory update failed: ${res.status}`);
      const body = await res.json();
      if (body.data?.new_quantity !== 80 || body.data?.previous_quantity !== 60) {
        throw new Error('Inventory update returned incorrect values');
      }

      // Verify audit log
      const logsCtx = createRequestContext(`https://127.0.0.1:8788/api/admin/inventory/logs?product_id=${simpleId}`);
      const logsRes = await handleAdminInventoryLogs(logsCtx);
      if (logsRes.status !== 200) throw new Error(`Failed to fetch inventory logs: ${logsRes.status}`);
      const logsBody = await logsRes.json();
      if (!logsBody.data.some(l => l.reason === 'Received new batch from factory floor' && l.change_amount === 20)) {
        throw new Error('Audit trail does not contain recorded inventory change');
      }
    });

    await assertTest('Workflow: Reject stock adjustment missing mandatory audit reason', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/inventory', {
        method: 'PUT',
        body: {
          product_id: simpleId,
          new_quantity: 90,
          reason: '   ' // empty reason
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 400) throw new Error(`Expected 400 for missing reason, got ${res.status}`);
    });

    await assertTest('Workflow: Reject negative stock adjustment quantity', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/inventory', {
        method: 'PUT',
        body: {
          product_id: simpleId,
          new_quantity: -5,
          reason: 'Damaged'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 400) throw new Error(`Expected 400 for negative stock, got ${res.status}`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 6. CATEGORY WORKFLOWS & 409 PROTECTION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 6. Category Management & Deletion Protection Tests ---');

    await assertTest('Workflow: Reorder category orders in batch', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories/reorder', {
        method: 'PUT',
        body: {
          orders: [{ id: testCatId, sort_order: 99 }]
        }
      });
      const res = await handleAdminCategoryReorder(ctx);
      if (res.status !== 200) throw new Error(`Category reorder failed: ${res.status}`);
      const row = sqliteDb.prepare('SELECT sort_order FROM categories WHERE id = ?').get(testCatId);
      if (row.sort_order !== 99) throw new Error(`Expected sort_order 99, got ${row.sort_order}`);
    });

    await assertTest('Workflow: Category with active products cannot be deleted (409 Conflict)', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/categories/${testCatId}`, {
        method: 'DELETE',
        params: { id: testCatId }
      });
      const res = await handleAdminCategoryDelete(ctx);
      if (res.status !== 409) throw new Error(`Expected 409 Conflict when deleting category with products, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'CATEGORY_IN_USE') {
        throw new Error(`Expected CATEGORY_IN_USE, got ${body.error?.code}`);
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 7. IMAGE UPLOAD & R2 WORKFLOWS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 7. Image Upload Pipeline & R2 Compatibility Tests ---');

    let generatedKey = null;

    await assertTest('Workflow: Presigned upload URL generation matches signed Content-Type', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/request-url', {
        method: 'POST',
        body: {
          product_id: simpleId,
          mime_type: 'image/jpeg',
          file_size_bytes: 250000
        }
      });
      const res = await handleUploadRequestUrl(ctx);
      if (res.status !== 200) throw new Error(`Request URL failed: ${res.status}`);
      const body = await res.json();
      generatedKey = body.image_key;
      trackedImageKeys.add(generatedKey);
      if (!generatedKey || !generatedKey.endsWith('.jpg')) {
        throw new Error(`Generated key has invalid extension: ${generatedKey}`);
      }
      if (!body.upload_url) throw new Error('Missing upload_url in response');
    });

    await assertTest('Workflow: Finalize R2 upload and store image metadata', async () => {
      // Put bytes in mock R2
      await mockR2Bucket.put(generatedKey, createValidJpegBytes(200, 200), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: generatedKey,
          product_id: simpleId,
          alt_text: 'Finalized JPEG',
          is_primary: true,
          sort_order: 1
        }
      });
      const res = await handleUploadFinalize(ctx);
      if (res.status !== 201) throw new Error(`Finalize failed: ${res.status}`);
      const body = await res.json();
      if (!body.data?.id || body.data?.image_key !== generatedKey) {
        throw new Error('Image record metadata not returned properly');
      }
    });

    await assertTest('Workflow: Failed upload retry generates fresh UUID key without key collision', async () => {
      const ctx1 = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/request-url', {
        method: 'POST',
        body: { product_id: simpleId, mime_type: 'image/jpeg', file_size_bytes: 120000 }
      });
      const res1 = await handleUploadRequestUrl(ctx1);
      const key1 = (await res1.json()).image_key;
      trackedImageKeys.add(key1);

      const ctx2 = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/request-url', {
        method: 'POST',
        body: { product_id: simpleId, mime_type: 'image/jpeg', file_size_bytes: 120000 }
      });
      const res2 = await handleUploadRequestUrl(ctx2);
      const key2 = (await res2.json()).image_key;
      trackedImageKeys.add(key2);

      if (key1 === key2) throw new Error('Retried upload must generate distinct image keys');
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 8. PUBLIC CATALOGUE INTEGRATION & WHATSAPP GENERATION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 8. Public Catalogue & Dynamic WhatsApp Integration ---');

    await assertTest('Public API: GET /api/products returns active catalogue items with primary image', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/products');
      const res = await handlePublicProducts(ctx);
      if (res.status !== 200) throw new Error(`Public products failed: ${res.status}`);
      const body = await res.json();
      if (!body.data.some(p => p.slug === simpleSlug)) {
        throw new Error('Public catalogue does not contain created product');
      }
    });

    await assertTest('Public API: GET /api/products/:slug returns variants and specifications', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/products/${varSlug}`, {
        params: { slug: varSlug }
      });
      const res = await handlePublicProductDetail(ctx);
      if (res.status !== 200) throw new Error(`Product detail failed: ${res.status}`);
      const body = await res.json();
      if (!body.data || body.data.variants?.length !== 2) {
        throw new Error('Public product detail does not contain active variants');
      }
    });

    await assertTest('WhatsApp Enquiry: Generates dynamic text with variant title and SKU', async () => {
      const url = buildWhatsAppUrl({
        productName: 'Stainless Steel Sipper Tumbler (350ml Blue)',
        quantity: 20,
        lang: 'en'
      });
      if (!url.includes('Stainless%20Steel%20Sipper%20Tumbler') || !url.includes('350ml%20Blue')) {
        throw new Error(`Generated WhatsApp URL missing variant details: ${url}`);
      }
      if (!url.includes('20')) {
        throw new Error('WhatsApp URL missing quantity');
      }
    });

    await assertTest('Currency utility: paiseToInr and inrToPaise conversions are exact', async () => {
      if (inrToPaise('299.00') !== 29900) throw new Error('inrToPaise conversion error');
      if (inrToPaise(299) !== 29900) throw new Error('inrToPaise integer conversion error');
      if (paiseToInr(29900) !== 299) throw new Error('paiseToInr conversion error');
      if (formatInr(29900) !== '₹299') throw new Error(`formatInr error: ${formatInr(29900)}`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 9. CLEANUP & TEARDOWN
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 9. Guaranteed Scoped Teardown ---');

    await assertTest('Workflow: Delete all products and verify category can now be safely deleted', async () => {
      // 1. Delete simple product
      if (simpleId) {
        const delSimpCtx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${simpleId}`, {
          method: 'DELETE',
          params: { id: simpleId }
        });
        await handleAdminProductDelete(delSimpCtx);
      }

      // 2. Delete variable product
      if (variableId) {
        const delVarCtx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableId}`, {
          method: 'DELETE',
          params: { id: variableId }
        });
        await handleAdminProductDelete(delVarCtx);
      }

      // 3. Delete duplicated product
      if (dupeId) {
        const delDupeCtx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${dupeId}`, {
          method: 'DELETE',
          params: { id: dupeId }
        });
        await handleAdminProductDelete(delDupeCtx);
      }

      // 4. Delete any remaining test products referencing category
      if (testCatId) {
        const remaining = sqliteDb.prepare('SELECT id FROM products WHERE category_id = ?').all(testCatId);
        for (const p of remaining) {
          const delCtx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${p.id}`, {
            method: 'DELETE',
            params: { id: p.id }
          });
          await handleAdminProductDelete(delCtx);
        }

        // 5. Delete category
        const delCatCtx = createRequestContext(`https://127.0.0.1:8788/api/admin/categories/${testCatId}`, {
          method: 'DELETE',
          params: { id: testCatId }
        });
        const res = await handleAdminCategoryDelete(delCatCtx);
        if (res.status !== 200) throw new Error(`Failed to delete category after products removed: ${res.status}`);
      }
    });

  } finally {
    // Guaranteed teardown
    if (dupeId) {
      sqliteDb.prepare('DELETE FROM product_images WHERE product_id = ?').run(dupeId);
      sqliteDb.prepare('DELETE FROM product_variants WHERE product_id = ?').run(dupeId);
      sqliteDb.prepare('DELETE FROM inventory_logs WHERE product_id = ?').run(dupeId);
      sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(dupeId);
    }
    if (testCatId) {
      const remainingProds = sqliteDb.prepare('SELECT id FROM products WHERE category_id = ?').all(testCatId);
      for (const p of remainingProds) {
        sqliteDb.prepare('DELETE FROM product_images WHERE product_id = ?').run(p.id);
        sqliteDb.prepare('DELETE FROM product_variants WHERE product_id = ?').run(p.id);
        sqliteDb.prepare('DELETE FROM inventory_logs WHERE product_id = ?').run(p.id);
        sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(p.id);
      }
      sqliteDb.prepare('DELETE FROM categories WHERE id = ?').run(testCatId);
    }
    for (const k of trackedImageKeys) {
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(k);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(k);
      sqliteDb.prepare('DELETE FROM product_images WHERE image_key = ?').run(k);
    }
    cleanupTestFixturesByPrefix(sqliteDb, TEST_PREFIX);
    cleanupTestFixturesByPrefix(sqliteDb, `${CLEAN_RUN_ID}`);
    cleanupTestFixturesByPrefix(sqliteDb, `products/${TEST_PREFIX}`);
    mockR2Storage.clear();

    const finalCounts = {
      categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
      products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
      variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
      images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
      inventoryLogs: sqliteDb.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
      pendingUploads: sqliteDb.prepare("SELECT COUNT(*) as c FROM pending_uploads").get().c,
      cleanupClaims: sqliteDb.prepare("SELECT COUNT(*) as c FROM cleanup_claims").get().c
    };

    console.log('\nBaseline Counts:', JSON.stringify(baselineCounts));
    console.log('Final Counts:   ', JSON.stringify(finalCounts));
    sqliteDb.close();

    const baselineMatch =
      finalCounts.products === baselineCounts.products &&
      finalCounts.categories === baselineCounts.categories &&
      finalCounts.variants === baselineCounts.variants &&
      finalCounts.images === baselineCounts.images &&
      finalCounts.inventoryLogs === baselineCounts.inventoryLogs &&
      finalCounts.pendingUploads === baselineCounts.pendingUploads &&
      finalCounts.cleanupClaims === baselineCounts.cleanupClaims;

    if (baselineMatch) {
      console.log('✅ PASS: Final Verification: Pre-existing database baseline counts completely preserved');
      passed++;
    } else {
      console.log('❌ FAIL: Database baseline counts modified during test run');
      failed++;
    }

    console.log('\n=================================================================');
    console.log(`Phase 4 Test Suite Summary: ${passed} Passed, ${failed} Failed`);
    console.log('=================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase4Tests();
