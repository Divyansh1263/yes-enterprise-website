import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { AwsClient } from 'aws4fetch';

// Import Pages Functions handlers for Phase 3
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
import { onRequestPost as handleUploadCleanup } from '../functions/api/admin/uploads/cleanup.js';

import { onRequestPut as handleImagePut, onRequestDelete as handleImageDelete } from '../functions/api/admin/images/[id].js';
import { onRequestPut as handleImageReorder } from '../functions/api/admin/images/reorder.js';

import { validateImagePayload, verifyImageFileSignature } from '../functions/_shared/image-utils.js';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 3 Admin & Image Upload Integration Tests');
console.log('Testing Admin Write APIs, R2 Uploads, Products, Inventory & Cleanup');
console.log('NOTE: Handler-level tests with local D1 emulator and simulated R2');
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
      rawDb.exec('SAVEPOINT d1_p3_batch;');
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.all());
        }
        rawDb.exec('RELEASE SAVEPOINT d1_p3_batch;');
        return results;
      } catch (err) {
        rawDb.exec('ROLLBACK TO SAVEPOINT d1_p3_batch; RELEASE SAVEPOINT d1_p3_batch;');
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
const RUN_ID = `p3_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const TEST_PREFIX = `test_${RUN_ID}_`;
const CLEAN_RUN_ID = RUN_ID.replace(/_/g, '-');
const dynamicallyGeneratedKeys = new Set();

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
  CF_ACCESS_AUD: 'test-aud-p3',
  ADMIN_EMAILS: 'admin@yesenterprises.in,owner@yesenterprises.in',
  ENABLE_DEV_ADMIN_BYPASS: 'true',
  DEV_BYPASS_EMAIL: 'admin@yesenterprises.in',
  R2_ACCOUNT_ID: 'test-account-id',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key-p3',
  R2_BUCKET_NAME: 'yes-enterprises-public-images',
  DB: d1Binding,
  PRODUCT_BUCKET: mockR2Bucket
};

function createRequestContext(urlStr, options = {}, envOverrides = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});

  // By default, inject development admin bypass headers unless explicitly disabled
  if (options.auth !== false && !headers.has('x-dev-admin-bypass')) {
    headers.set('x-dev-admin-bypass', 'true');
    headers.set('host', '127.0.0.1:8788');
  }

  const reqInit = {
    method,
    headers
  };

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

// ── SYNTHETIC VALID IMAGE BYTE GENERATORS ───────────────────────────────────
function createValidPngBytes(width = 100, height = 100) {
  // 8-byte signature + 25-byte IHDR chunk + minimal trailer
  const buf = new Uint8Array(33);
  // Signature
  buf.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 0);
  // IHDR length 13
  const view = new DataView(buf.buffer);
  view.setUint32(8, 13, false);
  // 'IHDR'
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  // Width & Height
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  // Bit depth, colour type, compression, filter, interlace
  buf[24] = 8;
  buf[25] = 2; // RGB
  buf[26] = 0;
  buf[27] = 0;
  buf[28] = 0;
  // CRC dummy
  view.setUint32(29, 0x12345678, false);
  return buf;
}

function createValidJpegBytes(width = 120, height = 80) {
  // SOI (FF D8) + SOF0 marker (FF C0) + Length (00 11) + precision (08) + H + W + components + EOI (FF D9)
  const buf = new Uint8Array(20);
  buf[0] = 0xFF; buf[1] = 0xD8; // SOI
  buf[2] = 0xFF; buf[3] = 0xC0; // SOF0
  const view = new DataView(buf.buffer);
  view.setUint16(4, 11, false); // Length
  buf[6] = 8; // Precision
  view.setUint16(7, height, false); // Height
  view.setUint16(9, width, false);  // Width
  buf[11] = 3; // 3 components
  buf[18] = 0xFF; buf[19] = 0xD9; // EOI
  return buf;
}

function createValidAvifBytes(width = 800, height = 600) {
  const buf = new Uint8Array(36);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 12, false);
  buf.set([0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 4); // ftypavif
  view.setUint32(12, 20, false);
  buf.set([0x69, 0x73, 0x70, 0x65], 16); // ispe
  view.setUint32(20, 0, false); // version/flags
  view.setUint32(24, width, false); // width
  view.setUint32(28, height, false); // height
  return buf;
}

// ── MAIN PHASE 3 TEST RUNNER ────────────────────────────────────────────────
async function runPhase3Tests() {
  try {
    // ═════════════════════════════════════════════════════════════════════════
    // 1. AUTHENTICATION & SECURITY SAFEGUARDS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 1. Authentication & Security Enforcement Tests ---');

    await assertTest('Reject unauthenticated admin write request with 401 UNAUTHENTICATED', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        auth: false,
        body: { name: 'Test', name_hi: 'टेस्ट', slug: `${CLEAN_RUN_ID}-unauth` }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'UNAUTHENTICATED') throw new Error(`Expected UNAUTHENTICATED, got ${body.error?.code}`);
    });

    await assertTest('Reject dev bypass on non-localhost remote origin', async () => {
      const ctx = createRequestContext('https://api.yesenterprises.in/api/admin/categories', {
        method: 'POST',
        headers: { 'x-dev-admin-bypass': 'true', host: 'api.yesenterprises.in' },
        body: { name: 'Test', name_hi: 'टेस्ट', slug: `${CLEAN_RUN_ID}-remote-bypass` }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await assertTest('Reject dev bypass when ENVIRONMENT is "production"', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        headers: { 'x-dev-admin-bypass': 'true', host: '127.0.0.1:8788' },
        body: { name: 'Test', name_hi: 'टेस्ट', slug: `${CLEAN_RUN_ID}-prod-bypass` }
      }, { ENVIRONMENT: 'production' });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await assertTest('Reject dev bypass when bypass email is not in ADMIN_EMAILS allowlist with 403', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        headers: { 'x-dev-admin-bypass': 'true', host: '127.0.0.1:8788' },
        body: { name: 'Test', name_hi: 'टेस्ट', slug: `${CLEAN_RUN_ID}-forbidden-bypass` }
      }, { DEV_BYPASS_EMAIL: 'intruder@hacker.io' });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await assertTest('Reject unauthenticated write requests to all representative admin endpoints with 401', async () => {
      const endpoints = [
        { handler: handleAdminProductCreate, url: 'https://127.0.0.1:8788/api/admin/products', method: 'POST' },
        { handler: handleAdminProductPut, url: 'https://127.0.0.1:8788/api/admin/products/dummy', method: 'PUT', params: { id: 'dummy' } },
        { handler: handleAdminProductDelete, url: 'https://127.0.0.1:8788/api/admin/products/dummy', method: 'DELETE', params: { id: 'dummy' } },
        { handler: handleAdminProductDuplicate, url: 'https://127.0.0.1:8788/api/admin/products/dummy/duplicate', method: 'POST', params: { id: 'dummy' } },
        { handler: handleAdminInventoryUpdate, url: 'https://127.0.0.1:8788/api/admin/inventory', method: 'PUT' },
        { handler: handleUploadRequestUrl, url: 'https://127.0.0.1:8788/api/admin/uploads/request-url', method: 'POST' },
        { handler: handleUploadFinalize, url: 'https://127.0.0.1:8788/api/admin/uploads/finalize', method: 'POST' },
        { handler: handleUploadCleanup, url: 'https://127.0.0.1:8788/api/admin/uploads/cleanup', method: 'POST' }
      ];

      for (const ep of endpoints) {
        const ctx = createRequestContext(ep.url, {
          method: ep.method,
          auth: false,
          params: ep.params,
          body: { dummy: 'data' }
        });
        const res = await ep.handler(ctx);
        if (res.status !== 401) {
          throw new Error(`Endpoint ${ep.url} failed to reject unauthenticated request with 401 (got ${res.status})`);
        }
      }
    });

    await assertTest('Reject cross-site cookie-authenticated write request via CSRF Sec-Fetch-Site protection with 403', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        auth: false,
        headers: {
          cookie: 'CF_Authorization=mock.cookie.token',
          'sec-fetch-site': 'cross-site'
        },
        body: { name: 'CSRF Attack', name_hi: 'हमला', slug: `${CLEAN_RUN_ID}-csrf` }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'CSRF_REJECTED') throw new Error(`Expected CSRF_REJECTED, got ${body.error?.code}`);
    });

    await assertTest('Reject cross-origin cookie-authenticated write request via CSRF Origin protection with 403', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        auth: false,
        headers: {
          cookie: 'CF_Authorization=mock.cookie.token',
          origin: 'https://evil-attacker-site.com'
        },
        body: { name: 'Origin Attack', name_hi: 'हमला', slug: `${CLEAN_RUN_ID}-origin-csrf` }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'CSRF_REJECTED') throw new Error(`Expected CSRF_REJECTED, got ${body.error?.code}`);
    });

    await assertTest('Fail closed with 401 in production when CF_ACCESS_TEAM_NAME is unconfigured', async () => {
      const ctx = createRequestContext('https://yesenterprises.in/api/admin/categories', {
        method: 'POST',
        auth: false,
        headers: { 'CF_Authorization': 'dummy.token.here' },
        body: { name: 'Prod Fail', name_hi: 'फेल', slug: `${CLEAN_RUN_ID}-prod-fail` }
      }, { ENVIRONMENT: 'production', CF_ACCESS_TEAM_NAME: '' });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'CONFIGURATION_ERROR') throw new Error(`Expected CONFIGURATION_ERROR, got ${body.error?.code}`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 2. CATEGORY CRUD, ORDERING & DELETION PROTECTION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 2. Category CRUD & Deletion Protection Tests ---');

    let testCatId = null;
    const catSlug = `${CLEAN_RUN_ID}-feeding-bottles`;

    await assertTest('Create category successfully (POST /api/admin/categories)', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        body: {
          name: 'Feeding Bottles',
          name_hi: 'फीडिंग बॉटल्स',
          slug: catSlug,
          description: 'High quality feeding bottles',
          description_hi: 'उच्च गुणवत्ता वाली फीडिंग बोतलें',
          sort_order: 1
        }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const body = await res.json();
      testCatId = body.data?.id;
      if (!testCatId || body.data?.slug !== catSlug) throw new Error('Category was not created properly.');
    });

    await assertTest('Reject duplicate category slug with 409 Conflict', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories', {
        method: 'POST',
        body: {
          name: 'Duplicate Category',
          name_hi: 'डुप्लिकेट श्रेणी',
          slug: catSlug
        }
      });
      const res = await handleAdminCategoryCreate(ctx);
      if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'SLUG_ALREADY_EXISTS') throw new Error(`Expected SLUG_ALREADY_EXISTS, got ${body.error?.code}`);
    });

    await assertTest('Update category successfully (PUT /api/admin/categories/:id)', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/categories/${testCatId}`, {
        method: 'PUT',
        params: { id: testCatId },
        body: {
          name: 'Feeding Bottles Premium',
          sort_order: 5
        }
      });
      const res = await handleAdminCategoryPut(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.data?.name !== 'Feeding Bottles Premium' || body.data?.sort_order !== 5) {
        throw new Error('Category updates did not persist.');
      }
    });

    await assertTest('Batch reorder categories (PUT /api/admin/categories/reorder)', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/categories/reorder', {
        method: 'PUT',
        body: {
          orders: [{ id: testCatId, sort_order: 10 }]
        }
      });
      const res = await handleAdminCategoryReorder(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const row = sqliteDb.prepare('SELECT sort_order FROM categories WHERE id = ?').get(testCatId);
      if (row.sort_order !== 10) throw new Error(`Expected sort_order 10, got ${row.sort_order}`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 3. PRODUCT CRUD, VARIANTS & SPECIFICATIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 3. Product CRUD & Variant Management Tests ---');

    let simpleProdId = null;
    const simpleProdSlug = `${CLEAN_RUN_ID}-stainless-bottle-simple`;
    const simpleSku = `YES-${CLEAN_RUN_ID.toUpperCase()}-S01`;

    await assertTest('Create simple product with initial stock and inventory log', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products', {
        method: 'POST',
        body: {
          name: 'Stainless Steel Water Bottle',
          name_hi: 'स्टेनलेस स्टील पानी की बोतल',
          slug: simpleProdSlug,
          category_id: testCatId,
          material: '304 Stainless Steel',
          brand: 'YES ENTERPRISES',
          has_variants: false,
          base_price_paise: 35000,
          compare_at_price_paise: 45000,
          sku: simpleSku,
          stock_quantity: 40,
          low_stock_threshold: 10,
          specifications: { Capacity: '750ml', Grade: '304 Food Grade' },
          status: 'active',
          is_featured: true,
          sort_order: 1
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 201) {
        const err = await res.json();
        throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(err)}`);
      }
      const body = await res.json();
      simpleProdId = body.data?.id;
      if (!simpleProdId || body.data?.sku !== simpleSku) throw new Error('Product not created correctly.');

      // Verify initial stock was logged in inventory_logs
      const log = sqliteDb.prepare('SELECT * FROM inventory_logs WHERE product_id = ?').get(simpleProdId);
      if (!log || log.new_quantity !== 40 || log.change_amount !== 40) {
        throw new Error('Initial stock inventory log was not created.');
      }
    });

    await assertTest('Reject duplicate SKU across products with 409 SKU_COLLISION', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products', {
        method: 'POST',
        body: {
          name: 'Another Bottle',
          name_hi: 'दूसरी बोतल',
          slug: `${CLEAN_RUN_ID}-duplicate-sku-prod`,
          category_id: testCatId,
          has_variants: false,
          sku: simpleSku // Colliding with simpleProdId
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'SKU_COLLISION') throw new Error(`Expected SKU_COLLISION, got ${body.error?.code}`);
    });

    let variableProdId = null;
    const varProdSlug = `${CLEAN_RUN_ID}-insulated-tiffin-var`;
    const varSku1 = `YES-${CLEAN_RUN_ID.toUpperCase()}-V01`;
    const varSku2 = `YES-${CLEAN_RUN_ID.toUpperCase()}-V02`;

    await assertTest('Create variable product with multiple variants atomically', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products', {
        method: 'POST',
        body: {
          name: 'Insulated Stainless Steel Tiffin',
          name_hi: 'इंसुलेटेड स्टेनलेस स्टील टिफिन',
          slug: varProdSlug,
          category_id: testCatId,
          has_variants: true,
          variant_attributes_schema: [
            { name: 'compartments', name_hi: 'कंटेनर', options: ['2 Containers', '3 Containers'] }
          ],
          variants: [
            {
              title: '2 Containers (500ml)',
              title_hi: '2 कंटेनर (500 मिली)',
              sku: varSku1,
              price_paise: 49900,
              stock_quantity: 25,
              attributes: { compartments: '2 Containers' }
            },
            {
              title: '3 Containers (750ml)',
              title_hi: '3 कंटेनर (750 मिली)',
              sku: varSku2,
              price_paise: 64900,
              stock_quantity: 30,
              attributes: { compartments: '3 Containers' }
            }
          ]
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 201) {
        const err = await res.json();
        throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(err)}`);
      }
      const body = await res.json();
      variableProdId = body.data?.id;
      if (!variableProdId || body.data?.variants?.length !== 2) {
        throw new Error('Variable product and variants were not created.');
      }

      // Verify each variant generated an inventory log
      const logs = sqliteDb.prepare('SELECT COUNT(*) as c FROM inventory_logs WHERE product_id = ?').get(variableProdId);
      if (logs.c !== 2) throw new Error(`Expected 2 inventory logs, got ${logs.c}`);
    });

    await assertTest('Reject duplicate SKU between product and variant via database trigger', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products', {
        method: 'POST',
        body: {
          name: 'Colliding Product',
          name_hi: 'टकराव उत्पाद',
          slug: `${CLEAN_RUN_ID}-colliding-sku`,
          category_id: testCatId,
          has_variants: false,
          sku: varSku1 // Exists on variant
        }
      });
      const res = await handleAdminProductCreate(ctx);
      if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
    });

    await assertTest('Update product details and track stock edit in inventory_logs', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${simpleProdId}`, {
        method: 'PUT',
        params: { id: simpleProdId },
        body: {
          stock_quantity: 55, // Changed from 40 to 55 (+15)
          base_price_paise: 38000
        }
      });
      const res = await handleAdminProductPut(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.data?.stock_quantity !== 55 || body.data?.base_price_paise !== 38000) {
        throw new Error('Product stock update did not persist.');
      }

      // Verify inventory log recorded
      const latestLog = sqliteDb.prepare(`
        SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY id DESC LIMIT 1
      `).get(simpleProdId);
      if (!latestLog || latestLog.previous_quantity !== 40 || latestLog.new_quantity !== 55 || latestLog.change_amount !== 15) {
        throw new Error('Inventory audit log was not accurately recorded on stock update.');
      }
    });

    await assertTest('Update variable product: add new variant and protect product_id immutability', async () => {
      const var3Sku = `YES-${CLEAN_RUN_ID.toUpperCase()}-V03`;
      const currentVariants = sqliteDb.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(variableProdId);

      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}`, {
        method: 'PUT',
        params: { id: variableProdId },
        body: {
          variants: [
            ...currentVariants.map(v => ({
              id: v.id,
              title: v.title,
              title_hi: v.title_hi,
              sku: v.sku,
              price_paise: v.price_paise,
              stock_quantity: v.stock_quantity,
              attributes: JSON.parse(v.attributes_json)
            })),
            {
              title: '4 Containers (1000ml)',
              title_hi: '4 कंटेनर (1000 मिली)',
              sku: var3Sku,
              price_paise: 89900,
              stock_quantity: 15,
              attributes: { compartments: '4 Containers' }
            }
          ]
        }
      });
      const res = await handleAdminProductPut(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.data?.variants?.length !== 3) throw new Error(`Expected 3 variants, got ${body.data?.variants?.length}`);
    });

    await assertTest('Retrieve product by ID for admin (GET /api/admin/products/:id)', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}`, {
        params: { id: variableProdId }
      });
      const res = await handleAdminProductGet(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.data?.id !== variableProdId || body.data?.variants?.length !== 3) {
        throw new Error('Admin product retrieval returned incorrect data.');
      }
    });

    await assertTest('List products for admin with status, variant count and stock totals', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/products?status=all');
      const res = await handleAdminProductsList(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (!Array.isArray(body.data) || body.data.length < 2) {
        throw new Error('Admin products listing failed to return created products.');
      }
      const varItem = body.data.find(p => p.id === variableProdId);
      if (!varItem || varItem.variant_count !== 3 || varItem.stock_quantity !== 70) {
        throw new Error(`Variant count or total stock incorrect: count=${varItem?.variant_count}, stock=${varItem?.stock_quantity}`);
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 4. PRODUCT DUPLICATION & R2 COMPENSATION TESTS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 4. Product Duplication Tests ---');

    let duplicatedProdId = null;
    let origImgKey1 = null;
    let origImgKey2 = null;
    let origImgKey3 = null;

    await assertTest('Attach multiple images to product and verify duplication generates independent R2 keys (All copies successful)', async () => {
      // 1. Seed 3 images on variable product in product_images and mock R2 storage
      origImgKey1 = `products/${TEST_PREFIX}var_img1.jpg`;
      origImgKey2 = `products/${TEST_PREFIX}var_img2.png`;
      origImgKey3 = `products/${TEST_PREFIX}var_img3.jpg`;

      await mockR2Bucket.put(origImgKey1, createValidJpegBytes(200, 200), {
        httpMetadata: { contentType: 'image/jpeg' }
      });
      await mockR2Bucket.put(origImgKey2, createValidPngBytes(300, 300), {
        httpMetadata: { contentType: 'image/png' }
      });
      await mockR2Bucket.put(origImgKey3, createValidJpegBytes(400, 400), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      const firstVar = sqliteDb.prepare('SELECT id FROM product_variants WHERE product_id = ?').get(variableProdId);

      sqliteDb.prepare(`
        INSERT INTO product_images (id, product_id, variant_id, image_key, alt_text, mime_type, file_size_bytes, width, height, is_primary, sort_order)
        VALUES (?, ?, NULL, ?, 'Main tiffin', 'image/jpeg', 20, 200, 200, 1, 0)
      `).run(`${TEST_PREFIX}img_v1`, variableProdId, origImgKey1);

      sqliteDb.prepare(`
        INSERT INTO product_images (id, product_id, variant_id, image_key, alt_text, mime_type, file_size_bytes, width, height, is_primary, sort_order)
        VALUES (?, ?, ?, ?, 'Variant tiffin', 'image/png', 33, 300, 300, 0, 1)
      `).run(`${TEST_PREFIX}img_v2`, variableProdId, firstVar.id, origImgKey2);

      sqliteDb.prepare(`
        INSERT INTO product_images (id, product_id, variant_id, image_key, alt_text, mime_type, file_size_bytes, width, height, is_primary, sort_order)
        VALUES (?, ?, NULL, ?, 'Side angle', 'image/jpeg', 45, 400, 400, 0, 2)
      `).run(`${TEST_PREFIX}img_v3`, variableProdId, origImgKey3);

      // 2. Duplicate product
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}/duplicate`, {
        method: 'POST',
        params: { id: variableProdId }
      });
      const res = await handleAdminProductDuplicate(ctx);
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const body = await res.json();
      duplicatedProdId = body.data?.id;

      // 3. Verify duplicated product images in database
      const dupImages = sqliteDb.prepare('SELECT * FROM product_images WHERE product_id = ?').all(duplicatedProdId);
      if (dupImages.length !== 3) {
        throw new Error(`Expected 3 duplicated images, got ${dupImages.length}`);
      }

      // Verify that duplicate image keys are fresh and DIFFERENT from original keys
      for (const dImg of dupImages) {
        dynamicallyGeneratedKeys.add(dImg.image_key);
        if ([origImgKey1, origImgKey2, origImgKey3].includes(dImg.image_key)) {
          throw new Error(`CRITICAL INTEGRITY FLAW: Duplicated image shared original R2 key: ${dImg.image_key}`);
        }
        // Verify copied object actually exists in R2 storage
        const obj = await mockR2Bucket.get(dImg.image_key);
        if (!obj) {
          throw new Error(`Copied R2 object was not found in storage for key: ${dImg.image_key}`);
        }
      }

      // Verify duplicated product status and slug
      if (body.data?.status !== 'draft') {
        throw new Error(`Duplicated product should be draft, got "${body.data?.status}"`);
      }
      if (!body.data?.slug.endsWith('-copy')) {
        throw new Error(`Duplicated slug "${body.data?.slug}" should end with -copy.`);
      }
    });

    await assertTest('Product duplication compensation: First copy fails -> zero orphan copies, original product intact', async () => {
      let copyAttempt = 0;
      const failingBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) {
          copyAttempt++;
          if (copyAttempt === 1) throw new Error('Simulated R2 failure on first image copy');
          return mockR2Bucket.put(k, b, o);
        },
        async delete(k) { return mockR2Bucket.delete(k); }
      };

      const beforeProducts = sqliteDb.prepare('SELECT COUNT(*) as c FROM products').get().c;
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}/duplicate`, {
        method: 'POST',
        params: { id: variableProdId }
      }, { PRODUCT_BUCKET: failingBucket });

      const res = await handleAdminProductDuplicate(ctx);
      if (res.status !== 500) throw new Error(`Expected 500 on copy failure, got ${res.status}`);

      const afterProducts = sqliteDb.prepare('SELECT COUNT(*) as c FROM products').get().c;
      if (afterProducts !== beforeProducts) throw new Error('Duplicate product was committed despite copy failure!');

      // Verify original product is 100% intact
      const orig = sqliteDb.prepare('SELECT id FROM products WHERE id = ?').get(variableProdId);
      if (!orig) throw new Error('Original product was damaged!');
      const origImages = sqliteDb.prepare('SELECT * FROM product_images WHERE product_id = ?').all(variableProdId);
      if (origImages.length !== 3) throw new Error(`Original images altered! Expected 3, got ${origImages.length}`);
    });

    await assertTest('Product duplication compensation: Middle copy fails -> deletes first copy, original product intact', async () => {
      let copyAttempt = 0;
      const createdKeys = [];
      const deletedKeys = [];

      const failingBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) {
          copyAttempt++;
          if (copyAttempt === 2) throw new Error('Simulated R2 failure on middle image copy');
          createdKeys.push(k);
          return mockR2Bucket.put(k, b, o);
        },
        async delete(k) {
          deletedKeys.push(k);
          return mockR2Bucket.delete(k);
        }
      };

      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}/duplicate`, {
        method: 'POST',
        params: { id: variableProdId }
      }, { PRODUCT_BUCKET: failingBucket });

      const res = await handleAdminProductDuplicate(ctx);
      if (res.status !== 500) throw new Error(`Expected 500 on middle copy failure, got ${res.status}`);

      if (createdKeys.length !== 1) throw new Error(`Expected 1 created key, got ${createdKeys.length}`);
      if (!deletedKeys.includes(createdKeys[0])) throw new Error('First copy was not cleaned up during compensation!');
      const orphanCheck = await mockR2Bucket.get(createdKeys[0]);
      if (orphanCheck) throw new Error('Orphan object remained in storage after middle copy failure!');
    });

    await assertTest('Product duplication compensation: Final copy fails -> deletes first two copies, original product intact', async () => {
      let copyAttempt = 0;
      const createdKeys = [];
      const deletedKeys = [];

      const failingBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) {
          copyAttempt++;
          if (copyAttempt === 3) throw new Error('Simulated R2 failure on final image copy');
          createdKeys.push(k);
          return mockR2Bucket.put(k, b, o);
        },
        async delete(k) {
          deletedKeys.push(k);
          return mockR2Bucket.delete(k);
        }
      };

      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}/duplicate`, {
        method: 'POST',
        params: { id: variableProdId }
      }, { PRODUCT_BUCKET: failingBucket });

      const res = await handleAdminProductDuplicate(ctx);
      if (res.status !== 500) throw new Error(`Expected 500 on final copy failure, got ${res.status}`);

      if (createdKeys.length !== 2) throw new Error(`Expected 2 created keys, got ${createdKeys.length}`);
      for (const k of createdKeys) {
        if (!deletedKeys.includes(k)) throw new Error(`Key ${k} was not deleted during compensation!`);
        const orphanCheck = await mockR2Bucket.get(k);
        if (orphanCheck) throw new Error(`Orphan key ${k} remained in storage!`);
      }
    });

    await assertTest('Product duplication compensation: Database transaction fails after successful copies -> cleans all copies', async () => {
      const createdKeys = [];
      const deletedKeys = [];

      const trackingBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) {
          createdKeys.push(k);
          return mockR2Bucket.put(k, b, o);
        },
        async delete(k) {
          deletedKeys.push(k);
          return mockR2Bucket.delete(k);
        }
      };

      // Create a D1 adapter whose batch() rejects with a simulated disk error
      const failingDb = {
        ...d1Binding,
        async batch() {
          throw new Error('Simulated D1 batch execution failure');
        }
      };

      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}/duplicate`, {
        method: 'POST',
        params: { id: variableProdId }
      }, { PRODUCT_BUCKET: trackingBucket, DB: failingDb });

      const res = await handleAdminProductDuplicate(ctx);
      if (res.status !== 500) throw new Error(`Expected 500, got ${res.status}`);

      if (createdKeys.length !== 3) throw new Error(`Expected 3 created keys, got ${createdKeys.length}`);
      for (const k of createdKeys) {
        if (!deletedKeys.includes(k)) throw new Error(`Key ${k} was not compensated upon batch failure!`);
        const orphanCheck = await mockR2Bucket.get(k);
        if (orphanCheck) throw new Error(`Orphan key ${k} remained in storage!`);
      }
    });

    await assertTest('Product duplication compensation: Compensation deletion fails -> records in cleanup_claims as failed', async () => {
      let copyAttempt = 0;
      let targetKey = null;

      const failingDeleteBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) {
          copyAttempt++;
          if (copyAttempt === 1) targetKey = k;
          if (copyAttempt === 2) throw new Error('Simulated R2 error on copy 2');
          return mockR2Bucket.put(k, b, o);
        },
        async delete() {
          throw new Error('Simulated network failure during compensation delete');
        }
      };

      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}/duplicate`, {
        method: 'POST',
        params: { id: variableProdId }
      }, { PRODUCT_BUCKET: failingDeleteBucket });

      const res = await handleAdminProductDuplicate(ctx);
      if (res.status !== 500) throw new Error(`Expected 500, got ${res.status}`);

      // Verify that targetKey was safely recorded into cleanup_claims with status = 'failed'
      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(targetKey);
      if (!claim || claim.status !== 'failed') {
        throw new Error(`Expected cleanup_claims record with status failed, got ${claim?.status}`);
      }

      // Cleanup test fixture
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(targetKey);
      await mockR2Bucket.delete(targetKey);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 5. CATEGORY DELETION PROTECTION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 5. Category Deletion Protection Tests ---');

    await assertTest('Block category deletion when referenced by products with 409 CATEGORY_IN_USE', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/categories/${testCatId}`, {
        method: 'DELETE',
        params: { id: testCatId }
      });
      const res = await handleAdminCategoryDelete(ctx);
      if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'CATEGORY_IN_USE') {
        throw new Error(`Expected CATEGORY_IN_USE, got ${body.error?.code}`);
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 6. INVENTORY STOCK MANAGEMENT & AUDIT LOGS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 6. Inventory Stock Management & Audit Log Tests ---');

    await assertTest('Update stock on simple product via inventory endpoint (PUT /api/admin/inventory)', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/inventory', {
        method: 'PUT',
        body: {
          product_id: simpleProdId,
          new_quantity: 60,
          reason: 'Manual warehouse restock'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.data?.previous_quantity !== 55 || body.data?.new_quantity !== 60 || body.data?.change_amount !== 5) {
        throw new Error(`Inventory audit fields mismatched: ${JSON.stringify(body.data)}`);
      }
    });

    await assertTest('Update stock on variable product variant via inventory endpoint', async () => {
      const firstVar = sqliteDb.prepare('SELECT id, stock_quantity FROM product_variants WHERE product_id = ?').get(variableProdId);
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/inventory', {
        method: 'PUT',
        body: {
          product_id: variableProdId,
          variant_id: firstVar.id,
          new_quantity: 45,
          reason: 'Batch production completed'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.data?.new_quantity !== 45) throw new Error('Variant stock was not updated.');
    });

    await assertTest('Reject updating stock on variable product without variant_id', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/inventory', {
        method: 'PUT',
        body: {
          product_id: variableProdId,
          new_quantity: 100,
          reason: 'Attempt bulk update'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await assertTest('Reject negative stock update with 400 VALIDATION_ERROR', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/inventory', {
        method: 'PUT',
        body: {
          product_id: simpleProdId,
          new_quantity: -10,
          reason: 'Invalid negative adjustment'
        }
      });
      const res = await handleAdminInventoryUpdate(ctx);
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await assertTest('Query paginated inventory audit logs (GET /api/admin/inventory/logs)', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/inventory/logs?product_id=${simpleProdId}`);
      const res = await handleAdminInventoryLogs(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (!Array.isArray(body.data) || body.data.length < 3) {
        throw new Error(`Expected at least 3 audit logs for product, got ${body.data?.length}`);
      }
      if (body.data[0].product_id !== simpleProdId) {
        throw new Error('Log does not match requested product_id.');
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 7. R2 PRESIGNED UPLOAD URL & LIFECYCLE
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 7. R2 Presigned Upload URL & Lifecycle Tests ---');

    let generatedKey = null;

    await assertTest('Request presigned upload URL with signed Content-Type (POST /api/admin/uploads/request-url)', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/request-url', {
        method: 'POST',
        body: {
          product_id: simpleProdId,
          filename: 'bottle-front.jpg',
          mime_type: 'image/jpeg',
          file_size_bytes: 524288
        }
      });
      const res = await handleUploadRequestUrl(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      generatedKey = body.image_key;
      dynamicallyGeneratedKeys.add(generatedKey);

      if (!generatedKey || !generatedKey.startsWith('products/') || !generatedKey.endsWith('.jpg')) {
        throw new Error(`Invalid generated image_key: ${generatedKey}`);
      }

      if (!body.upload_url || !body.upload_url.includes('X-Amz-Signature') || !body.upload_url.includes('X-Amz-SignedHeaders')) {
        throw new Error(`Invalid presigned URL: ${body.upload_url}`);
      }

      // Verify pending_uploads record exists in database
      const pendingRow = sqliteDb.prepare('SELECT * FROM pending_uploads WHERE image_key = ?').get(generatedKey);
      if (!pendingRow || pendingRow.product_id !== simpleProdId) {
        throw new Error('pending_uploads record was not properly created.');
      }
    });

    await assertTest('Reject upload URL request with invalid or unsupported MIME type', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/request-url', {
        method: 'POST',
        body: {
          product_id: simpleProdId,
          filename: 'executable.exe',
          mime_type: 'application/x-msdownload',
          file_size_bytes: 1024
        }
      });
      const res = await handleUploadRequestUrl(ctx);
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await assertTest('Reject upload URL request for oversized file (> 10MB)', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/request-url', {
        method: 'POST',
        body: {
          product_id: simpleProdId,
          filename: 'huge-poster.jpg',
          mime_type: 'image/jpeg',
          file_size_bytes: 20 * 1024 * 1024 // 20MB
        }
      });
      const res = await handleUploadRequestUrl(ctx);
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await assertTest('Safeguard: Refuse upload URL request if key exists in cleanup_claims', async () => {
      const dummyKey = `products/${TEST_PREFIX}dummy_${crypto.randomUUID()}.jpg`;
      // Manually seed a claim
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'token-claim-check', datetime('now', '+5 minutes'), 'claimed')
      `).run(dummyKey);

      // Verify safeguard check logic
      const claimExists = sqliteDb.prepare('SELECT 1 FROM cleanup_claims WHERE image_key = ?').get(dummyKey);
      if (!claimExists) throw new Error('Seeded claim not found.');

      // Cleanup dummy claim
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(dummyKey);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 8. BINARY IMAGE VALIDATION & UPLOAD FINALIZATION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 8. Binary Image Validation & Finalization Tests ---');

    await assertTest('Binary signature parser detects valid JPEG and PNG', () => {
      const jpeg = createValidJpegBytes(100, 100);
      const png = createValidPngBytes(200, 150);

      const checkJpeg = verifyImageFileSignature(jpeg, 'image/jpeg');
      if (!checkJpeg.valid || checkJpeg.detectedMime !== 'image/jpeg') {
        throw new Error('JPEG signature verification failed.');
      }

      const checkPng = verifyImageFileSignature(png, 'image/png');
      if (!checkPng.valid || checkPng.detectedMime !== 'image/png') {
        throw new Error('PNG signature verification failed.');
      }
    });

    await assertTest('Binary signature parser rejects text file spoofing as image', () => {
      const fakeImage = new TextEncoder().encode('<html><body>Not an image</body></html>');
      const check = verifyImageFileSignature(fakeImage, 'image/jpeg');
      if (check.valid) throw new Error('Expected binary signature check to reject HTML text.');
    });

    await assertTest('Dimension parser rejects image smaller than minimum dimension (10x10)', () => {
      const tinyPng = createValidPngBytes(5, 5);
      const res = validateImagePayload(tinyPng, 'image/png');
      if (res.valid) throw new Error('Expected validation failure for 5x5 image.');
    });

    await assertTest('Dimension parser rejects image larger than maximum allowed dimension (> 8000x8000)', () => {
      const hugePng = createValidPngBytes(8001, 100);
      const res = validateImagePayload(hugePng, 'image/png');
      if (res.valid) throw new Error('Expected validation failure for 8001x100 image.');
    });

    await assertTest('Dimension parser rejects image exceeding total pixel limit (> 32 megapixels)', () => {
      const bombPng = createValidPngBytes(7000, 6000); // 42 Megapixels
      const res = validateImagePayload(bombPng, 'image/png');
      if (res.valid) throw new Error('Expected validation failure for 42MP image exceeding 32MP limit.');
    });

    await assertTest('Dimension parser safely handles malformed JPEG marker lengths without hanging', () => {
      // JPEG with corrupted marker length (length = 0)
      const corruptJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x00, 0x08, 0x00, 0x64, 0x00, 0x64]);
      const res = validateImagePayload(corruptJpeg, 'image/jpeg');
      // Should not throw or crash
      if (res.width !== null || res.height !== null) throw new Error('Malformed marker should return null dimensions.');
    });

    await assertTest('Dimension parser extracts valid dimensions from AVIF ispe box', () => {
      const avifBytes = createValidAvifBytes(800, 600);
      const res = validateImagePayload(avifBytes, 'image/avif');
      if (!res.valid || res.width !== 800 || res.height !== 600) {
        throw new Error(`AVIF dimension extraction failed: ${JSON.stringify(res)}`);
      }
    });

    await assertTest('Dimension parser safely handles truncated GIF header without throwing', () => {
      const truncatedGif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // Only 6 bytes (missing dimensions)
      const res = validateImagePayload(truncatedGif, 'image/gif');
      if (res.valid && res.width !== null) throw new Error('Truncated GIF should not return valid dimensions.');
    });

    let uploadedImageId1 = null;

    await assertTest('Finalize upload successfully: inspects R2 object and transfers pending to images', async () => {
      // Simulate direct-to-R2 upload by putting valid JPEG into mock R2 bucket
      const jpegBytes = createValidJpegBytes(400, 400);
      await mockR2Bucket.put(generatedKey, jpegBytes, {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: generatedKey,
          product_id: simpleProdId,
          alt_text: 'Front view of stainless steel bottle',
          alt_text_hi: 'स्टेनलेस स्टील की बोतल का फ्रंट व्यू',
          is_primary: true,
          sort_order: 0
        }
      });
      const res = await handleUploadFinalize(ctx);
      if (res.status !== 201) {
        const err = await res.json();
        throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(err)}`);
      }
      const body = await res.json();
      uploadedImageId1 = body.data?.id;

      if (!uploadedImageId1 || !body.data?.is_primary) {
        throw new Error('Image was not marked as primary.');
      }

      // Verify pending_uploads record was deleted atomically
      const pendingStillExists = sqliteDb.prepare('SELECT 1 FROM pending_uploads WHERE image_key = ?').get(generatedKey);
      if (pendingStillExists) throw new Error('pending_uploads record was not deleted upon finalization.');

      // Verify product_images record exists
      const imgRow = sqliteDb.prepare('SELECT * FROM product_images WHERE id = ?').get(uploadedImageId1);
      if (!imgRow || imgRow.image_key !== generatedKey) throw new Error('product_images record not found.');
    });

    await assertTest('Reject finalization when image key has an active cleanup claim', async () => {
      // 1. Create a pending upload
      const testKey = `products/${TEST_PREFIX}test_${crypto.randomUUID()}.jpg`;
      sqliteDb.prepare('INSERT INTO pending_uploads (image_key, product_id) VALUES (?, ?)').run(testKey, simpleProdId);

      // 2. Insert cleanup claim
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'claim-conflict-token', datetime('now', '+5 minutes'), 'claimed')
      `).run(testKey);

      // 3. Attempt finalization
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: testKey,
          product_id: simpleProdId
        }
      });
      const res = await handleUploadFinalize(ctx);
      if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'IMAGE_CLAIMED_FOR_CLEANUP') {
        throw new Error(`Expected IMAGE_CLAIMED_FOR_CLEANUP, got ${body.error?.code}`);
      }

      // Cleanup
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(testKey);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(testKey);
    });

    let uploadedImageId2 = null;
    const secondImageKey = `products/${TEST_PREFIX}second_${crypto.randomUUID()}.png`;

    await assertTest('Add second image and switch primary image atomically', async () => {
      sqliteDb.prepare('INSERT INTO pending_uploads (image_key, product_id) VALUES (?, ?)').run(secondImageKey, simpleProdId);
      const pngBytes = createValidPngBytes(600, 600);
      await mockR2Bucket.put(secondImageKey, pngBytes, {
        httpMetadata: { contentType: 'image/png' }
      });

      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: secondImageKey,
          product_id: simpleProdId,
          alt_text: 'Side angle of water bottle',
          is_primary: true, // Make this new image primary
          sort_order: 1
        }
      });
      const res = await handleUploadFinalize(ctx);
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const body = await res.json();
      uploadedImageId2 = body.data?.id;

      // Verify the second image is primary and first image was unset
      const img1 = sqliteDb.prepare('SELECT is_primary FROM product_images WHERE id = ?').get(uploadedImageId1);
      const img2 = sqliteDb.prepare('SELECT is_primary FROM product_images WHERE id = ?').get(uploadedImageId2);
      if (img1.is_primary !== 0 || img2.is_primary !== 1) {
        throw new Error(`Primary switch failed: img1=${img1.is_primary}, img2=${img2.is_primary}`);
      }
    });

    await assertTest('Deterministic primary fallback: deleting primary image promotes next available image', async () => {
      // img2 is currently primary. Delete img2.
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/images/${uploadedImageId2}`, {
        method: 'DELETE',
        params: { id: uploadedImageId2 }
      });
      const res = await handleImageDelete(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

      // Verify img1 was automatically promoted to primary
      const img1 = sqliteDb.prepare('SELECT is_primary FROM product_images WHERE id = ?').get(uploadedImageId1);
      if (img1.is_primary !== 1) {
        throw new Error(`Expected img1 to be promoted to primary, got is_primary=${img1?.is_primary}`);
      }
    });

    await assertTest('Batch reorder product images (PUT /api/admin/images/reorder)', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/images/reorder', {
        method: 'PUT',
        body: {
          product_id: simpleProdId,
          orders: [{ id: uploadedImageId1, sort_order: 10 }]
        }
      });
      const res = await handleImageReorder(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const row = sqliteDb.prepare('SELECT sort_order FROM product_images WHERE id = ?').get(uploadedImageId1);
      if (row.sort_order !== 10) throw new Error(`Expected sort_order 10, got ${row.sort_order}`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 9. ORPHAN UPLOAD CLEANUP ENGINE & LEASE IDEMPOTENCY
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 9. Cleanup Engine & Lease Idempotency Tests ---');

    await assertTest('Clean up expired abandoned pending uploads (> 24 hours)', async () => {
      // Seed an expired pending upload (> 24h old)
      const orphanKey = `products/${TEST_PREFIX}orphan_${crypto.randomUUID()}.jpg`;
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(orphanKey, simpleProdId);

      // Seed mock object in storage
      await mockR2Bucket.put(orphanKey, createValidJpegBytes(100, 100));

      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50, dry_run: false }
      });
      const res = await handleUploadCleanup(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.cleaned_count < 1) throw new Error('Expected at least 1 cleaned orphan upload.');

      // Verify pending_uploads record deleted
      const pendingStill = sqliteDb.prepare('SELECT 1 FROM pending_uploads WHERE image_key = ?').get(orphanKey);
      if (pendingStill) throw new Error('Orphan pending upload was not removed.');

      // Verify object deleted from R2
      const storageObj = await mockR2Bucket.get(orphanKey);
      if (storageObj) throw new Error('Orphan object was not deleted from R2 storage.');

      // Verify claim is permanently tombstoned
      const tombClaim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(orphanKey);
      if (!tombClaim || tombClaim.status !== 'tombstone') throw new Error(`Expected tombstone, got ${tombClaim?.status}`);
    });

    await assertTest('Idempotent cleanup: repeated run produces 0 errors and 0 orphaned items', async () => {
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50, dry_run: false }
      });
      const res = await handleUploadCleanup(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.error_count !== 0) throw new Error(`Expected 0 errors on repeated cleanup, got ${body.error_count}`);
    });

    await assertTest('Concurrency: Active unexpired claim cannot be stolen by another worker', async () => {
      const activeKey = `products/${TEST_PREFIX}active_${crypto.randomUUID()}.jpg`;
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(activeKey, simpleProdId);

      // Worker Alpha acquires claim for 5 minutes
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'token-worker-alpha', datetime('now', '+5 minutes'), 'claimed')
      `).run(activeKey);

      await mockR2Bucket.put(activeKey, createValidJpegBytes(100, 100));

      // Worker Beta runs cleanup
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      await handleUploadCleanup(ctx);

      // Verify claim ownership was NOT stolen by Worker Beta
      const claim = sqliteDb.prepare('SELECT claim_token FROM cleanup_claims WHERE image_key = ?').get(activeKey);
      if (!claim || claim.claim_token !== 'token-worker-alpha') {
        throw new Error(`Active claim was stolen! Expected token-worker-alpha, got ${claim?.claim_token}`);
      }
      // Verify object was NOT deleted from R2
      const obj = await mockR2Bucket.get(activeKey);
      if (!obj) throw new Error('Object was deleted while under active unexpired lease!');

      // Cleanup
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(activeKey);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(activeKey);
      await mockR2Bucket.delete(activeKey);
    });

    await assertTest('Concurrency: Expired lease can be atomically reacquired by another worker and tombstoned', async () => {
      const expiredKey = `products/${TEST_PREFIX}expired_${crypto.randomUUID()}.jpg`;
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'stale-token-123', datetime('now', '-10 minutes'), 'claimed')
      `).run(expiredKey);

      await mockR2Bucket.put(expiredKey, createValidJpegBytes(100, 100));

      // Worker Beta runs cleanup and should reacquire expired lease
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const res = await handleUploadCleanup(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

      // Verify claim is permanently tombstoned and object is deleted
      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(expiredKey);
      if (!claim || claim.status !== 'tombstone') throw new Error(`Expected tombstone, got ${claim?.status}`);
      const obj = await mockR2Bucket.get(expiredKey);
      if (obj) throw new Error('Object was not deleted after expired lease reacquisition.');
    });

    await assertTest('Concurrency: Failed claim can be retried and safely reacquired and tombstoned', async () => {
      const failedKey = `products/${TEST_PREFIX}failed_${crypto.randomUUID()}.jpg`;
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'failed-worker-token', datetime('now', '+10 minutes'), 'failed')
      `).run(failedKey);

      await mockR2Bucket.put(failedKey, createValidJpegBytes(100, 100));

      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const res = await handleUploadCleanup(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(failedKey);
      if (!claim || claim.status !== 'tombstone') throw new Error(`Expected tombstone upon retry, got ${claim?.status}`);
    });

    await assertTest('Deterministic interleaving race: Finalization acquiring ownership blocks concurrent cleanup from deleting R2 object', async () => {
      const raceKey = `products/${TEST_PREFIX}race_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(raceKey, createValidJpegBytes(300, 300), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      // 1. Pending upload created > 24 hours ago (candidate for cleanup)
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(raceKey, simpleProdId);

      let cleanupRanMidFlight = false;
      let cleanupAttemptResult = null;

      // Wrap bucket so that during Finalization's R2 get(), Cleanup concurrently attempts to process raceKey
      const interleavingBucket = {
        async get(k) {
          if (k === raceKey && !cleanupRanMidFlight) {
            cleanupRanMidFlight = true;
            // Concurrently execute cleanup worker mid-flight while Finalization holds active lease
            const cleanupCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
              method: 'POST',
              body: { max_items: 50 }
            });
            cleanupAttemptResult = await handleUploadCleanup(cleanupCtx);
          }
          return mockR2Bucket.get(k);
        },
        async put(k, b, o) { return mockR2Bucket.put(k, b, o); },
        async delete(k) { return mockR2Bucket.delete(k); }
      };

      // 2. Finalization worker starts, acquires lease, and retrieves R2 object (triggering concurrent cleanup)
      const finalizeCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: raceKey,
          product_id: simpleProdId,
          alt_text: 'Interleaving verified image'
        }
      }, { PRODUCT_BUCKET: interleavingBucket });

      const finRes = await handleUploadFinalize(finalizeCtx);
      if (finRes.status !== 201) throw new Error(`Finalization failed with ${finRes.status}`);

      // 3. Verify that concurrent cleanup was executed mid-flight
      if (!cleanupRanMidFlight) throw new Error('Cleanup was not invoked during finalization mid-flight!');
      if (cleanupAttemptResult?.status !== 200) throw new Error('Cleanup attempt returned non-200');

      // 4. Final verification: Metadata exists in product_images, R2 object is intact, pending_uploads is removed
      const imgInDb = sqliteDb.prepare('SELECT id FROM product_images WHERE image_key = ?').get(raceKey);
      if (!imgInDb) throw new Error('Image record missing in product_images after finalization!');
      const finalR2 = await mockR2Bucket.get(raceKey);
      if (!finalR2) throw new Error('R2 object deleted after successful finalization!');
      const pendingCheck = sqliteDb.prepare('SELECT 1 FROM pending_uploads WHERE image_key = ?').get(raceKey);
      if (pendingCheck) throw new Error('pending_uploads record was not removed!');

      // Teardown
      sqliteDb.prepare('DELETE FROM product_images WHERE image_key = ?').run(raceKey);
      await mockR2Bucket.delete(raceKey);
    });

    await assertTest('Upload state protocol: Cleanup wins ownership -> blocks concurrent finalization with 409', async () => {
      const cleanupWonKey = `products/${TEST_PREFIX}cleanupwon_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(cleanupWonKey, createValidJpegBytes(200, 200));

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(cleanupWonKey, simpleProdId);

      // Cleanup acquires active lease
      const cleanupToken = `cleanup_${crypto.randomUUID()}`;
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, ?, datetime('now', '+5 minutes'), 'claimed')
      `).run(cleanupWonKey, cleanupToken);

      // Finalization attempts to finalize concurrently
      const finalizeCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: cleanupWonKey,
          product_id: simpleProdId,
          alt_text: 'Blocked finalization'
        }
      });
      const finRes = await handleUploadFinalize(finalizeCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${finRes.status}`);
      const finBody = await finRes.json();
      if (finBody.error?.code !== 'IMAGE_CLAIMED_FOR_CLEANUP') {
        throw new Error(`Expected IMAGE_CLAIMED_FOR_CLEANUP, got ${finBody.error?.code}`);
      }

      // Verify no record inserted into product_images
      const imgInDb = sqliteDb.prepare('SELECT id FROM product_images WHERE image_key = ?').get(cleanupWonKey);
      if (imgInDb) throw new Error('Product image was inserted despite active cleanup lease!');

      // Cleanup
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(cleanupWonKey);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(cleanupWonKey);
      await mockR2Bucket.delete(cleanupWonKey);
    });

    await assertTest('Upload state protocol: Finalization fails after acquiring ownership -> releases claim cleanly', async () => {
      const corruptKey = `products/${TEST_PREFIX}corrupt_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(corruptKey, new TextEncoder().encode('corrupted non-image bytes'));

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now'))
      `).run(corruptKey, simpleProdId);

      const finalizeCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: corruptKey,
          product_id: simpleProdId,
          alt_text: 'Corrupt payload'
        }
      });
      const res = await handleUploadFinalize(finalizeCtx);
      if (res.status !== 400) throw new Error(`Expected 400 on corrupt image, got ${res.status}`);

      // Verify claim was cleanly released
      const claim = sqliteDb.prepare('SELECT 1 FROM cleanup_claims WHERE image_key = ?').get(corruptKey);
      if (claim) throw new Error('Finalization claim was not released upon validation error!');

      // Teardown
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(corruptKey);
      await mockR2Bucket.delete(corruptKey);
    });

    await assertTest('Upload state protocol: Expired finalization ownership recovery -> retry acquires and succeeds', async () => {
      const retryKey = `products/${TEST_PREFIX}retry_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(retryKey, createValidJpegBytes(250, 250), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now'))
      `).run(retryKey, simpleProdId);

      // Previous aborted attempt left an expired finalizing lease
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'finalize_stale_123', datetime('now', '-5 minutes'), 'claimed')
      `).run(retryKey);

      // Retrying finalization should safely reacquire the expired lease and succeed
      const finalizeCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: retryKey,
          product_id: simpleProdId,
          alt_text: 'Recovered upload'
        }
      });
      const res = await handleUploadFinalize(finalizeCtx);
      if (res.status !== 201) throw new Error(`Expected 201 on retry, got ${res.status}`);

      const img = sqliteDb.prepare('SELECT id FROM product_images WHERE image_key = ?').get(retryKey);
      if (!img) throw new Error('Image was not finalized after expired lease recovery!');

      // Teardown
      sqliteDb.prepare('DELETE FROM product_images WHERE image_key = ?').run(retryKey);
      await mockR2Bucket.delete(retryKey);
    });

    await assertTest('Upload state protocol: Stale worker attempting to commit after losing ownership is rejected', async () => {
      const staleKey = `products/${TEST_PREFIX}stale_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(staleKey, createValidJpegBytes(250, 250));

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now'))
      `).run(staleKey, simpleProdId);

      // Another worker/cleanup has taken over ownership
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'cleanup_stolen_token', datetime('now', '+5 minutes'), 'claimed')
      `).run(staleKey);

      const finalizeCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: staleKey,
          product_id: simpleProdId,
          alt_text: 'Stale attempt'
        }
      });
      const res = await handleUploadFinalize(finalizeCtx);
      if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);

      // Verify no record in product_images
      const img = sqliteDb.prepare('SELECT id FROM product_images WHERE image_key = ?').get(staleKey);
      if (img) throw new Error('Stale worker committed record to product_images!');

      // Teardown
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(staleKey);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(staleKey);
      await mockR2Bucket.delete(staleKey);
    });

    await assertTest('Stale cleanup worker defense: Worker A pauses before R2 delete, lease expires, Worker B finalizes image, Worker A resumes and is prevented from deleting R2 object', async () => {
      const targetKey = `products/${TEST_PREFIX}target_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(targetKey, createValidJpegBytes(250, 250), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      // 1. Pending upload > 24 hours old
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(targetKey, simpleProdId);

      let workerBCompleted = false;
      let interceptedOnce = false;

      // Wrap D1 adapter for Worker A to intercept lease renewal immediately before R2 delete
      const workerADb = {
        ...d1Binding,
        prepare(sql) {
          const stmt = d1Binding.prepare(sql);
          if (sql.includes('UPDATE cleanup_claims') && sql.includes("status = 'deleting'") && !interceptedOnce) {
            return {
              bind(...params) {
                const boundStmt = stmt.bind(...params);
                return {
                  async run() {
                    interceptedOnce = true;
                    // Step 4: Worker A pauses and its lease expires!
                    sqliteDb.prepare(`
                      UPDATE cleanup_claims
                      SET lease_expires_at = datetime('now', '-10 minutes')
                      WHERE image_key = ?
                    `).run(targetKey);

                    // Step 5 & 6: Worker B (Finalization) arrives, acquires lease, finalizes image
                    const finalizeCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
                      method: 'POST',
                      body: {
                        image_key: targetKey,
                        product_id: simpleProdId,
                        alt_text: 'Worker B finalized this image'
                      }
                    });
                    const finRes = await handleUploadFinalize(finalizeCtx);
                    if (finRes.status !== 201) throw new Error(`Worker B finalization failed: ${finRes.status}`);
                    workerBCompleted = true;

                    // Step 7: Worker A resumes and executes its renewal query!
                    // Since lease was expired and claim was deleted by Worker B, Worker A's renewal must update 0 rows
                    return boundStmt.run();
                  }
                };
              }
            };
          }
          return stmt;
        }
      };

      // Run Worker A's cleanup
      const workerACtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      }, { DB: workerADb });

      const cleanupRes = await handleUploadCleanup(workerACtx);
      if (cleanupRes.status !== 200) throw new Error(`Cleanup returned ${cleanupRes.status}`);

      // Verify that Worker B ran mid-flight
      if (!workerBCompleted) throw new Error('Worker B finalization was not triggered!');

      // Verify that Worker A did NOT delete the R2 object!
      const r2Obj = await mockR2Bucket.get(targetKey);
      if (!r2Obj) {
        throw new Error('CRITICAL FLAW: Stale Worker A deleted the R2 object after Worker B finalized it!');
      }

      // Verify that product_images still holds the active record
      const imgInDb = sqliteDb.prepare('SELECT id FROM product_images WHERE image_key = ?').get(targetKey);
      if (!imgInDb) {
        throw new Error('Image record was lost from product_images!');
      }

      // Teardown
      sqliteDb.prepare('DELETE FROM product_images WHERE image_key = ?').run(targetKey);
      await mockR2Bucket.delete(targetKey);
    });

    await assertTest('Finalization vs Cleanup Race: Successfully finalized image is NEVER deleted by cleanup engine', async () => {
      const raceKey = `products/${TEST_PREFIX}race_fin_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(raceKey, createValidJpegBytes(250, 250));

      // 1. Image is finalized in product_images
      sqliteDb.prepare(`
        INSERT INTO product_images (id, product_id, variant_id, image_key, alt_text, mime_type, file_size_bytes, width, height, is_primary, sort_order)
        VALUES (?, ?, NULL, ?, 'Race protected image', 'image/jpeg', 20, 250, 250, 0, 99)
      `).run(`${TEST_PREFIX}race_img`, simpleProdId, raceKey);

      // 2. A stale pending upload or expired claim also exists for the same key
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'stale-claim-token', datetime('now', '-5 minutes'), 'claimed')
      `).run(raceKey);

      // 3. Cleanup engine runs
      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      await handleUploadCleanup(ctx);

      // 4. Verify R2 object was NOT deleted because it is active in product_images!
      const obj = await mockR2Bucket.get(raceKey);
      if (!obj) {
        throw new Error('CRITICAL CONCURRENCY BUG: Finalized image was deleted by cleanup engine!');
      }

      // Cleanup
      sqliteDb.prepare('DELETE FROM product_images WHERE id = ?').run(`${TEST_PREFIX}race_img`);
      await mockR2Bucket.delete(raceKey);
    });

    await assertTest('R2 deletion failure marks cleanup claim as failed for retry and blocks finalization', async () => {
      const failKey = `products/${TEST_PREFIX}fail_${crypto.randomUUID()}.jpg`;
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(failKey, simpleProdId);

      // Create a mock bucket that throws on delete for failKey
      const failingBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) { return mockR2Bucket.put(k, b, o); },
        async delete(k) {
          if (k === failKey) throw new Error('Simulated R2 network error 503 Service Unavailable');
          return mockR2Bucket.delete(k);
        }
      };

      const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      }, { PRODUCT_BUCKET: failingBucket });

      const res = await handleUploadCleanup(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (body.error_count !== 1) throw new Error(`Expected error_count 1, got ${body.error_count}`);

      // Verify claim status was set to 'failed' in database
      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(failKey);
      if (!claim || claim.status !== 'failed') {
        throw new Error(`Expected status failed, got ${claim?.status}`);
      }

      // Verify that finalization is strictly blocked while status is 'failed' (uncertain outcome)
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: failKey,
          product_id: simpleProdId,
          alt_text: 'Attempt finalize on failed claim'
        }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${finRes.status}`);
      const finBody = await finRes.json();
      if (finBody.error?.code !== 'IMAGE_DELETION_IN_PROGRESS') {
        throw new Error(`Expected IMAGE_DELETION_IN_PROGRESS, got ${finBody.error?.code}`);
      }

      // Verify zero metadata created in product_images
      const metaCheck = sqliteDb.prepare('SELECT 1 FROM product_images WHERE image_key = ?').get(failKey);
      if (metaCheck) throw new Error('Metadata was inserted into product_images despite failed deletion claim!');

      // Cleanup
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(failKey);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(failKey);
    });

    await assertTest('In-flight delayed R2 deletion: Worker A marks deleting, lease expires during delayed R2 DELETE, Worker B finalization strictly blocked with 409, creating 0 metadata; Worker A completes deletion cleanly and tombstones key', async () => {
      const delayedKey = `products/${TEST_PREFIX}delayed_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(delayedKey, createValidJpegBytes(200, 200), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(delayedKey, simpleProdId);

      let workerBAttemptResult = null;
      let workerBImagesCount = null;
      let inFlightStatusVerified = false;

      // Wrap bucket to intercept while R2 DELETE is in flight
      const delayedBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) { return mockR2Bucket.put(k, b, o); },
        async delete(k) {
          if (k === delayedKey) {
            // Step 1: Verify Worker A has atomically transitioned claim to 'deleting' in D1 BEFORE touching R2
            const claimDuringDelete = sqliteDb.prepare('SELECT status, claim_token FROM cleanup_claims WHERE image_key = ?').get(delayedKey);
            if (!claimDuringDelete || claimDuringDelete.status !== 'deleting') {
              throw new Error(`Expected claim status 'deleting' before R2 delete, got ${claimDuringDelete?.status}`);
            }
            inFlightStatusVerified = true;

            // Step 2: Simulate that the R2 DELETE request was delayed and Worker A's lease expired in D1
            sqliteDb.prepare(`
              UPDATE cleanup_claims
              SET lease_expires_at = datetime('now', '-10 minutes')
              WHERE image_key = ?
            `).run(delayedKey);

            // Step 3: Concurrently, Worker B attempts to finalize this image while Worker A's R2 DELETE is still in flight
            const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
              method: 'POST',
              body: {
                image_key: delayedKey,
                product_id: simpleProdId,
                alt_text: 'Worker B attempted finalize during delayed deletion'
              }
            });
            const finRes = await handleUploadFinalize(finCtx);
            workerBAttemptResult = {
              status: finRes.status,
              body: await finRes.json()
            };

            // Step 4: Verify zero metadata was created in product_images
            workerBImagesCount = sqliteDb.prepare('SELECT COUNT(*) as c FROM product_images WHERE image_key = ?').get(delayedKey).c;
          }
          // Step 5: Worker A's delayed R2 DELETE request eventually completes
          return mockR2Bucket.delete(k);
        }
      };

      const workerACtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      }, { PRODUCT_BUCKET: delayedBucket });

      const cleanupRes = await handleUploadCleanup(workerACtx);
      if (cleanupRes.status !== 200) throw new Error(`Expected 200, got ${cleanupRes.status}`);

      // Verify assertions
      if (!inFlightStatusVerified) throw new Error('In-flight claim status verification did not execute!');
      if (workerBAttemptResult?.status !== 409) {
        throw new Error(`Worker B was not blocked during in-flight deletion! Got ${workerBAttemptResult?.status}`);
      }
      if (workerBAttemptResult?.body?.error?.code !== 'IMAGE_DELETION_IN_PROGRESS') {
        throw new Error(`Expected IMAGE_DELETION_IN_PROGRESS, got ${workerBAttemptResult?.body?.error?.code}`);
      }
      if (workerBImagesCount !== 0) {
        throw new Error(`CRITICAL INTEGRITY VIOLATION: Worker B created ${workerBImagesCount} metadata rows while R2 delete was in flight!`);
      }

      // Verify Worker A's deletion cleanly removed object and permanently tombstoned claim
      const r2Obj = await mockR2Bucket.get(delayedKey);
      if (r2Obj) throw new Error('R2 object was not deleted when Worker A finished!');
      const pendingRow = sqliteDb.prepare('SELECT 1 FROM pending_uploads WHERE image_key = ?').get(delayedKey);
      if (pendingRow) throw new Error('pending_uploads record was not deleted upon cleanup completion!');
      const claimRow = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(delayedKey);
      if (!claimRow || claimRow.status !== 'tombstone') {
        throw new Error(`Expected tombstone status upon completion, got ${claimRow?.status}`);
      }

      // Verify subsequent finalization attempt cleanly rejected with 409
      const finFollowupCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: delayedKey,
          product_id: simpleProdId,
          alt_text: 'Followup attempt'
        }
      });
      const finFollowupRes = await handleUploadFinalize(finFollowupCtx);
      if (finFollowupRes.status !== 409) throw new Error(`Expected 409 for tombstoned key, got ${finFollowupRes.status}`);
    });

    // ── RECOVERY PATH & CRASH-AFTER-DISPATCH VERIFICATION SUITE ───────────────
    await assertTest('Crash-after-dispatch scenario: Worker A transitions to deleting, dispatches R2 DELETE, and crashes before response; lease expires; Worker B recovers and tombstones key; finalization is strictly blocked with 409, and delayed Worker A response completing later causes zero corruption', async () => {
      const crashKey = `products/${TEST_PREFIX}crash_disp_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(crashKey, createValidJpegBytes(250, 250), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(crashKey, simpleProdId);

      let workerADeleteDispatched = false;

      // Bucket that intercepts Worker A's dispatch and simulates crash
      const crashingBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) { return mockR2Bucket.put(k, b, o); },
        async delete(k) {
          if (k === crashKey && !workerADeleteDispatched) {
            workerADeleteDispatched = true;
            // Step 1: Verify Worker A has atomically transitioned to 'deleting' in D1
            const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(crashKey);
            if (!claim || claim.status !== 'deleting') throw new Error(`Expected deleting status, got ${claim?.status}`);
            // Step 2 & 3: Worker A dispatches R2 DELETE, but Worker A crashes before receiving response!
            throw new Error('Worker A simulated process crash (SIGKILL/unhandledException)');
          }
          return mockR2Bucket.delete(k);
        }
      };

      // Run Worker A's cleanup -> crashes during R2 delete
      const workerACtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      }, { PRODUCT_BUCKET: crashingBucket });
      await handleUploadCleanup(workerACtx);

      // Step 4: Worker A's lease expires
      sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET lease_expires_at = datetime('now', '-10 minutes')
        WHERE image_key = ?
      `).run(crashKey);

      // Step 5 & 6: Worker B runs cleanup recovery (Pass 2)
      const workerBCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const recoveryRes = await handleUploadCleanup(workerBCtx);
      if (recoveryRes.status !== 200) throw new Error(`Recovery returned ${recoveryRes.status}`);

      // Verify Worker B tombstoned the claim and removed pending_uploads
      const tombstoneClaim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(crashKey);
      if (!tombstoneClaim || tombstoneClaim.status !== 'tombstone') {
        throw new Error(`Expected tombstone status after Worker B recovery, got ${tombstoneClaim?.status}`);
      }
      const pendingCheck = sqliteDb.prepare('SELECT 1 FROM pending_uploads WHERE image_key = ?').get(crashKey);
      if (pendingCheck) throw new Error('pending_uploads record was not removed by Worker B!');

      // Step 7: Attempt finalization on crashKey
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: crashKey,
          product_id: simpleProdId,
          alt_text: 'Attempt finalize on tombstoned key'
        }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${finRes.status}`);
      const finBody = await finRes.json();
      if (finBody.error?.code !== 'IMAGE_DELETION_IN_PROGRESS') {
        throw new Error(`Expected IMAGE_DELETION_IN_PROGRESS, got ${finBody.error?.code}`);
      }
      // Verify 0 rows in product_images
      const metaCheck = sqliteDb.prepare('SELECT 1 FROM product_images WHERE image_key = ?').get(crashKey);
      if (metaCheck) throw new Error('product_images record was created for tombstoned key!');

      // Step 8: Simulate Worker A's original delayed DELETE completing after Worker B's response
      await mockR2Bucket.delete(crashKey); // Idempotent delete

      // Verify status remains tombstone and 0 metadata exists
      const finalClaim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(crashKey);
      if (finalClaim?.status !== 'tombstone') throw new Error('Tombstone status was altered!');
    });

    await assertTest('Crash immediately after deleting transition but before dispatch: Lease expires, Worker B recovers, marks tombstone, finalization permanently blocked', async () => {
      const preDispatchCrashKey = `products/${TEST_PREFIX}predisp_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(preDispatchCrashKey, createValidJpegBytes(200, 200));

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(preDispatchCrashKey, simpleProdId);

      // Worker A transitions to 'deleting' in D1
      const tokenA = `worker_a_${crypto.randomUUID()}`;
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, ?, datetime('now', '+5 minutes'), 'deleting')
      `).run(preDispatchCrashKey, tokenA);

      // Worker A crashes immediately before dispatching R2 delete!
      // Lease expires:
      sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET lease_expires_at = datetime('now', '-5 minutes')
        WHERE image_key = ?
      `).run(preDispatchCrashKey);

      // Worker B runs cleanup recovery (Pass 2 scans expired deleting claim)
      const workerBCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const res = await handleUploadCleanup(workerBCtx);
      if (res.status !== 200) throw new Error(`Cleanup failed with ${res.status}`);

      // Verify Worker B safely deleted R2 object and set tombstone
      const obj = await mockR2Bucket.get(preDispatchCrashKey);
      if (obj) throw new Error('Object was not deleted by Worker B!');
      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(preDispatchCrashKey);
      if (!claim || claim.status !== 'tombstone') throw new Error(`Expected tombstone, got ${claim?.status}`);

      // Finalization attempt strictly blocked with 409
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: { image_key: preDispatchCrashKey, product_id: simpleProdId }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409, got ${finRes.status}`);
    });

    await assertTest('Crash immediately after dispatch: Request in flight, lease expires, Worker B recovers, marks tombstone, finalization permanently blocked', async () => {
      const inFlightCrashKey = `products/${TEST_PREFIX}inflight_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(inFlightCrashKey, createValidJpegBytes(200, 200));

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(inFlightCrashKey, simpleProdId);

      let deleteDispatched = false;
      const dispatchCrashingBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) { return mockR2Bucket.put(k, b, o); },
        async delete(k) {
          if (k === inFlightCrashKey) {
            deleteDispatched = true;
            // Crash immediately as packet is sent
            throw new Error('Connection reset by peer immediately after packet dispatch');
          }
          return mockR2Bucket.delete(k);
        }
      };

      const workerACtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      }, { PRODUCT_BUCKET: dispatchCrashingBucket });
      await handleUploadCleanup(workerACtx);

      if (!deleteDispatched) throw new Error('Delete was not dispatched!');

      // Worker B runs recovery with standard bucket
      const workerBCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const recRes = await handleUploadCleanup(workerBCtx);
      if (recRes.status !== 200) throw new Error(`Recovery failed: ${recRes.status}`);

      // Verify object is gone and tombstoned
      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(inFlightCrashKey);
      if (!claim || claim.status !== 'tombstone') throw new Error(`Expected tombstone, got ${claim?.status}`);

      // Finalization blocked with 409
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: { image_key: inFlightCrashKey, product_id: simpleProdId }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409, got ${finRes.status}`);
    });

    await assertTest('Timeout with unknown R2 outcome: Claim marked failed, finalization permanently blocked, cleanup retry permanently tombstones key', async () => {
      const timeoutKey = `products/${TEST_PREFIX}timeout_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(timeoutKey, createValidJpegBytes(150, 150));

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(timeoutKey, simpleProdId);

      const timingOutBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) { return mockR2Bucket.put(k, b, o); },
        async delete(k) {
          if (k === timeoutKey) throw new Error('TimeoutError: R2 DELETE request timed out after 30000ms');
          return mockR2Bucket.delete(k);
        }
      };

      const timeoutCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      }, { PRODUCT_BUCKET: timingOutBucket });

      const timeoutRes = await handleUploadCleanup(timeoutCtx);
      if (timeoutRes.status !== 200) throw new Error(`Expected 200, got ${timeoutRes.status}`);

      // Verify claim status is 'failed'
      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(timeoutKey);
      if (!claim || claim.status !== 'failed') throw new Error(`Expected status failed, got ${claim?.status}`);

      // Finalization permanently blocked with 409 because outcome is uncertain
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: { image_key: timeoutKey, product_id: simpleProdId }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409, got ${finRes.status}`);

      // Cleanup recovery retry safely succeeds and transitions to tombstone
      const retryCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const retryRes = await handleUploadCleanup(retryCtx);
      if (retryRes.status !== 200) throw new Error(`Retry cleanup failed: ${retryRes.status}`);

      const finalClaim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(timeoutKey);
      if (!finalClaim || finalClaim.status !== 'tombstone') throw new Error(`Expected tombstone, got ${finalClaim?.status}`);

      // Finalization remains permanently blocked
      const finFollowupCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: { image_key: timeoutKey, product_id: simpleProdId }
      });
      const finRes2 = await handleUploadFinalize(finFollowupCtx);
      if (finRes2.status !== 409) throw new Error(`Expected 409 after tombstone, got ${finRes2.status}`);
    });

    await assertTest('R2 success followed by crash before D1 cleanup: Object deleted from R2, claim still deleting; lease expires, Worker B recovers, permanently tombstones key', async () => {
      const postSuccessCrashKey = `products/${TEST_PREFIX}postsuccess_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(postSuccessCrashKey, createValidJpegBytes(200, 200));

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(postSuccessCrashKey, simpleProdId);

      // Worker A transitions to 'deleting' in D1
      const tokenA = `worker_a_${crypto.randomUUID()}`;
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, ?, datetime('now', '+5 minutes'), 'deleting')
      `).run(postSuccessCrashKey, tokenA);

      // Worker A deletes object from R2 successfully
      await mockR2Bucket.delete(postSuccessCrashKey);

      // Worker A crashes BEFORE committing D1 tombstone update!
      // Lease expires:
      sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET lease_expires_at = datetime('now', '-5 minutes')
        WHERE image_key = ?
      `).run(postSuccessCrashKey);

      // Worker B runs recovery (calls idempotent R2 delete and updates D1 to tombstone)
      const workerBCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const recRes = await handleUploadCleanup(workerBCtx);
      if (recRes.status !== 200) throw new Error(`Recovery failed: ${recRes.status}`);

      // Verify claim is tombstoned and pending_uploads is removed
      const claim = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(postSuccessCrashKey);
      if (!claim || claim.status !== 'tombstone') throw new Error(`Expected tombstone, got ${claim?.status}`);
      const pending = sqliteDb.prepare('SELECT 1 FROM pending_uploads WHERE image_key = ?').get(postSuccessCrashKey);
      if (pending) throw new Error('pending_uploads was not deleted!');

      // Finalization permanently blocked with 409
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: { image_key: postSuccessCrashKey, product_id: simpleProdId }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409, got ${finRes.status}`);
    });

    await assertTest('Multiple cleanup workers attempting recovery concurrently: Serial ACID update in D1 ensures exactly one worker succeeds', async () => {
      const concurrentKey = `products/${TEST_PREFIX}concurrent_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(concurrentKey, createValidJpegBytes(200, 200));

      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'stale_token', datetime('now', '-5 minutes'), 'deleting')
      `).run(concurrentKey);

      // Simulate two workers attempting atomic lease acquisition in D1 concurrently:
      const tokenWorker1 = `worker_1_${crypto.randomUUID()}`;
      const tokenWorker2 = `worker_2_${crypto.randomUUID()}`;

      const res1 = sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET claim_token = ?, lease_expires_at = datetime('now', '+5 minutes'), status = 'deleting'
        WHERE image_key = ? AND (lease_expires_at < datetime('now') OR status = 'failed') AND status != 'tombstone'
      `).run(tokenWorker1, concurrentKey);

      const res2 = sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET claim_token = ?, lease_expires_at = datetime('now', '+5 minutes'), status = 'deleting'
        WHERE image_key = ? AND (lease_expires_at < datetime('now') OR status = 'failed') AND status != 'tombstone'
      `).run(tokenWorker2, concurrentKey);

      // Exactly one worker must win the claim (changes === 1) and the second must get changes === 0
      if (res1.changes !== 1) throw new Error(`Worker 1 expected changes === 1, got ${res1.changes}`);
      if (res2.changes !== 0) throw new Error(`Worker 2 expected changes === 0, got ${res2.changes}`);

      // Verify database holds Worker 1's token
      const winner = sqliteDb.prepare('SELECT claim_token FROM cleanup_claims WHERE image_key = ?').get(concurrentKey);
      if (winner?.claim_token !== tokenWorker1) throw new Error('Worker 1 was not recorded as winner!');
    });

    await assertTest('Stale worker resuming after recovery: Resuming worker with old claim token cannot alter tombstoned claim or delete resources', async () => {
      const staleResumeKey = `products/${TEST_PREFIX}staleresume_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(staleResumeKey, createValidJpegBytes(200, 200));

      const staleTokenA = `stale_worker_a_${crypto.randomUUID()}`;
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, ?, datetime('now', '-10 minutes'), 'deleting')
      `).run(staleResumeKey, staleTokenA);

      // Worker B recovers and transitions claim to 'tombstone'
      const recCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      await handleUploadCleanup(recCtx);

      // Verify status is tombstone
      const claim = sqliteDb.prepare('SELECT status, claim_token FROM cleanup_claims WHERE image_key = ?').get(staleResumeKey);
      if (claim?.status !== 'tombstone') throw new Error(`Expected tombstone, got ${claim?.status}`);

      // Worker A resumes and attempts to mark failed or update D1 using its old token:
      const staleAttempt = sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET status = 'failed'
        WHERE image_key = ? AND claim_token = ?
      `).run(staleResumeKey, staleTokenA);

      if (staleAttempt.changes !== 0) throw new Error(`Stale worker affected ${staleAttempt.changes} rows! Expected 0.`);

      // Verify status is STILL tombstone
      const claimAfter = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(staleResumeKey);
      if (claimAfter?.status !== 'tombstone') throw new Error('Stale worker altered tombstone status!');
    });

    // ── FAILED-TO-CLAIM RACE SAFETY SUITE (TESTS A, B, C) ────────────────────
    await assertTest('Test A — Failed claim retry crash: Worker B acquires retry as deleting and crashes, lease expires, Worker C finalization strictly blocked with 409 and 0 metadata', async () => {
      const testAKey = `products/${TEST_PREFIX}test_a_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(testAKey, createValidJpegBytes(200, 200), {
        httpMetadata: { contentType: 'image/jpeg' }
      });
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(testAKey, simpleProdId);

      // Step 1: Worker A dispatches DELETE, but outcome is uncertain (throws network timeout error)
      const timingOutBucket = {
        async get(k) { return mockR2Bucket.get(k); },
        async put(k, b, o) { return mockR2Bucket.put(k, b, o); },
        async delete(k) {
          if (k === testAKey) throw new Error('Worker A simulated network timeout / connection drop');
          return mockR2Bucket.delete(k);
        }
      };

      const workerACtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      }, { PRODUCT_BUCKET: timingOutBucket });
      await handleUploadCleanup(workerACtx);

      // Verify claim status became 'failed'
      const claimAfterA = sqliteDb.prepare('SELECT status, claim_token FROM cleanup_claims WHERE image_key = ?').get(testAKey);
      if (!claimAfterA || claimAfterA.status !== 'failed') {
        throw new Error(`Expected failed status after Worker A, got ${claimAfterA?.status}`);
      }

      // Step 2: Worker B starts retry and acquires retry ownership (transitions failed -> deleting)
      // We simulate Worker B crashing immediately after acquiring retry ownership, before dispatching DELETE
      const workerBToken = `retry_worker_b_${crypto.randomUUID()}`;
      const retryAcquireResult = sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET claim_token = ?,
            lease_expires_at = datetime('now', '+5 minutes'),
            status = 'deleting'
        WHERE image_key = ? 
          AND (
            status = 'failed'
            OR (status = 'deleting' AND lease_expires_at < datetime('now'))
            OR (status = 'claimed' AND lease_expires_at < datetime('now'))
          )
          AND status != 'tombstone'
      `).run(workerBToken, testAKey);

      if (retryAcquireResult.changes !== 1) {
        throw new Error(`Worker B failed to acquire retry ownership: changes=${retryAcquireResult.changes}`);
      }

      // Verify claim in D1 is now 'deleting' with Worker B's token (NEVER touched 'claimed')
      const claimAfterB = sqliteDb.prepare('SELECT status, claim_token FROM cleanup_claims WHERE image_key = ?').get(testAKey);
      if (!claimAfterB || claimAfterB.status !== 'deleting') {
        throw new Error(`Expected deleting status after Worker B acquisition, got ${claimAfterB?.status}`);
      }

      // Step 3: Simulate Worker B process crash before dispatching DELETE, and Worker B's lease expires
      sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET lease_expires_at = datetime('now', '-5 minutes')
        WHERE image_key = ?
      `).run(testAKey);

      // Verify that after lease expiry, status is STILL 'deleting'
      const claimExpired = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(testAKey);
      if (!claimExpired || claimExpired.status !== 'deleting') {
        throw new Error(`Expected status to remain deleting after lease expiry, got ${claimExpired?.status}`);
      }

      // Step 4: Worker C attempts finalization on testAKey
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: testAKey,
          product_id: simpleProdId,
          alt_text: 'Worker C finalization attempt'
        }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${finRes.status}`);
      const finBody = await finRes.json();
      if (finBody.error?.code !== 'IMAGE_DELETION_IN_PROGRESS') {
        throw new Error(`Expected IMAGE_DELETION_IN_PROGRESS, got ${finBody.error?.code}`);
      }

      // Verify zero metadata created in product_images
      const metaCount = sqliteDb.prepare('SELECT COUNT(*) as c FROM product_images WHERE image_key = ?').get(testAKey).c;
      if (metaCount !== 0) throw new Error(`CRITICAL INTEGRITY FAILURE: ${metaCount} product_images rows created!`);

      // Cleanup
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(testAKey);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(testAKey);
      await mockR2Bucket.delete(testAKey);
    });

    await assertTest('Test B — Old request completes after retry: Worker B succeeds and tombstones key; Worker A delayed delete completes later; key remains permanently tombstoned and finalization blocked', async () => {
      const testBKey = `products/${TEST_PREFIX}test_b_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(testBKey, createValidJpegBytes(200, 200), {
        httpMetadata: { contentType: 'image/jpeg' }
      });
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(testBKey, simpleProdId);

      // Step 1: Worker A dispatches DELETE, but request is delayed; outcome marked 'failed' after timeout
      const tokenA = `worker_a_${crypto.randomUUID()}`;
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, ?, datetime('now', '-5 minutes'), 'failed')
      `).run(testBKey, tokenA);

      // Step 2: Worker B retries deletion via cleanup Pass 2 and succeeds
      const workerBCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      const recRes = await handleUploadCleanup(workerBCtx);
      if (recRes.status !== 200) throw new Error(`Worker B cleanup retry failed: ${recRes.status}`);

      // Verify Worker B transitioned key to tombstone
      const claimAfterB = sqliteDb.prepare('SELECT status, claim_token FROM cleanup_claims WHERE image_key = ?').get(testBKey);
      if (!claimAfterB || claimAfterB.status !== 'tombstone') {
        throw new Error(`Expected tombstone after Worker B, got ${claimAfterB?.status}`);
      }

      // Step 3: Worker A's original DELETE eventually completes in R2 and attempts to update D1
      await mockR2Bucket.delete(testBKey); // Idempotent in R2
      const staleWorkerAUpdate = sqliteDb.prepare(`
        UPDATE cleanup_claims
        SET status = 'tombstone'
        WHERE image_key = ? AND claim_token = ?
      `).run(testBKey, tokenA);

      if (staleWorkerAUpdate.changes !== 0) {
        throw new Error(`Stale Worker A matched ${staleWorkerAUpdate.changes} rows! Expected 0.`);
      }

      // Verify key remains permanently tombstoned in D1
      const claimFinal = sqliteDb.prepare('SELECT status FROM cleanup_claims WHERE image_key = ?').get(testBKey);
      if (claimFinal?.status !== 'tombstone') {
        throw new Error(`Tombstone status altered! Got ${claimFinal?.status}`);
      }

      // Step 4: Finalization attempt is strictly blocked with 409
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: testBKey,
          product_id: simpleProdId,
          alt_text: 'Finalization attempt on tombstoned key'
        }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${finRes.status}`);
      const finBody = await finRes.json();
      if (finBody.error?.code !== 'IMAGE_DELETION_IN_PROGRESS') {
        throw new Error(`Expected IMAGE_DELETION_IN_PROGRESS, got ${finBody.error?.code}`);
      }
      const metaCheck = sqliteDb.prepare('SELECT 1 FROM product_images WHERE image_key = ?').get(testBKey);
      if (metaCheck) throw new Error('product_images record created on tombstoned key!');

      // Cleanup
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(testBKey);
    });

    await assertTest('Test C — Concurrent failed-claim retries: Two workers attempt retry simultaneously; exactly one acquires retry ownership as deleting; neither makes key eligible for finalization', async () => {
      const testCKey = `products/${TEST_PREFIX}test_c_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(testCKey, createValidJpegBytes(200, 200), {
        httpMetadata: { contentType: 'image/jpeg' }
      });
      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now', '-25 hours'))
      `).run(testCKey, simpleProdId);

      // Seed claim in 'failed' status
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'initial_failed_token', datetime('now', '-10 minutes'), 'failed')
      `).run(testCKey);

      // Two workers race to execute the atomic conditional retry query simultaneously:
      const tokenWorker1 = `worker_1_${crypto.randomUUID()}`;
      const tokenWorker2 = `worker_2_${crypto.randomUUID()}`;

      const retrySql = `
        UPDATE cleanup_claims
        SET claim_token = ?,
            lease_expires_at = datetime('now', '+5 minutes'),
            status = 'deleting'
        WHERE image_key = ? 
          AND (
            status = 'failed'
            OR (status = 'deleting' AND lease_expires_at < datetime('now'))
            OR (status = 'claimed' AND lease_expires_at < datetime('now'))
          )
          AND status != 'tombstone';
      `;

      const res1 = sqliteDb.prepare(retrySql).run(tokenWorker1, testCKey);
      const res2 = sqliteDb.prepare(retrySql).run(tokenWorker2, testCKey);

      // Exactly one worker must acquire the claim (changes === 1) and the other must get changes === 0
      if (res1.changes !== 1) throw new Error(`Worker 1 expected changes === 1, got ${res1.changes}`);
      if (res2.changes !== 0) throw new Error(`Worker 2 expected changes === 0, got ${res2.changes}`);

      // Verify the claim status in D1 is 'deleting' (NEVER 'claimed')
      const claimInDb = sqliteDb.prepare('SELECT status, claim_token FROM cleanup_claims WHERE image_key = ?').get(testCKey);
      if (!claimInDb || claimInDb.status !== 'deleting') {
        throw new Error(`Expected claim status 'deleting', got ${claimInDb?.status}`);
      }
      if (claimInDb.claim_token !== tokenWorker1) {
        throw new Error(`Expected claim_token to be Worker 1's token, got ${claimInDb?.claim_token}`);
      }

      // Verify that neither worker has made the key eligible for finalization
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: testCKey,
          product_id: simpleProdId,
          alt_text: 'Finalization attempt during concurrent retry'
        }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 409) throw new Error(`Expected 409 Conflict, got ${finRes.status}`);
      const finBody = await finRes.json();
      if (finBody.error?.code !== 'IMAGE_DELETION_IN_PROGRESS') {
        throw new Error(`Expected IMAGE_DELETION_IN_PROGRESS, got ${finBody.error?.code}`);
      }

      // Complete Worker 1's cleanup to leave DB clean
      const worker1Ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
        method: 'POST',
        body: { max_items: 50 }
      });
      await handleUploadCleanup(worker1Ctx);

      // Cleanup
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(testCKey);
      sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?').run(testCKey);
      await mockR2Bucket.delete(testCKey);
    });

    await assertTest('Successful finalization after safe recovery: Expired claimed status (no R2 deletion issued) verifies R2 object and finalizes successfully', async () => {
      const safeKey = `products/${TEST_PREFIX}safe_${crypto.randomUUID()}.jpg`;
      await mockR2Bucket.put(safeKey, createValidJpegBytes(300, 300), {
        httpMetadata: { contentType: 'image/jpeg' }
      });

      sqliteDb.prepare(`
        INSERT INTO pending_uploads (image_key, product_id, created_at)
        VALUES (?, ?, datetime('now'))
      `).run(safeKey, simpleProdId);

      // Expired lease with status = 'claimed' (previous worker crashed before ever attempting R2 deletion)
      sqliteDb.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, 'crashed_worker_token', datetime('now', '-5 minutes'), 'claimed')
      `).run(safeKey);

      // Finalization should safely reacquire, verify R2 object, and finalize successfully
      const finCtx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/finalize', {
        method: 'POST',
        body: {
          image_key: safeKey,
          product_id: simpleProdId,
          alt_text: 'Safely recovered upload'
        }
      });
      const finRes = await handleUploadFinalize(finCtx);
      if (finRes.status !== 201) {
        const err = await finRes.json();
        throw new Error(`Expected 201 on safe recovery finalization, got ${finRes.status}: ${JSON.stringify(err)}`);
      }

      // Verify product_images record created
      const img = sqliteDb.prepare('SELECT id FROM product_images WHERE image_key = ?').get(safeKey);
      if (!img) throw new Error('product_images record was not created during safe recovery finalization!');

      // Verify claim was cleanly released
      const claim = sqliteDb.prepare('SELECT 1 FROM cleanup_claims WHERE image_key = ?').get(safeKey);
      if (claim) throw new Error('Claim was not released after safe recovery finalization!');

      // Teardown
      sqliteDb.prepare('DELETE FROM product_images WHERE image_key = ?').run(safeKey);
      await mockR2Bucket.delete(safeKey);
    });

    await assertTest('Repeated cleanup runs: Completely idempotent across passes with 0 errors', async () => {
      for (let run = 1; run <= 3; run++) {
        const ctx = createRequestContext('https://127.0.0.1:8788/api/admin/uploads/cleanup', {
          method: 'POST',
          body: { max_items: 50, dry_run: false }
        });
        const res = await handleUploadCleanup(ctx);
        if (res.status !== 200) throw new Error(`Run ${run} returned ${res.status}`);
        const body = await res.json();
        if (body.error_count !== 0) throw new Error(`Run ${run} had error_count ${body.error_count}`);
      }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // 10. PRODUCT DELETION CASCADE & RESOURCE CLEANUP
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- 10. Product Deletion Cascade & Resource Cleanup Tests ---');

    await assertTest('Delete product cascades variants, images, and acquires cleanup claims', async () => {
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${simpleProdId}`, {
        method: 'DELETE',
        params: { id: simpleProdId }
      });
      const res = await handleAdminProductDelete(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

      // Verify product deleted
      const p = sqliteDb.prepare('SELECT 1 FROM products WHERE id = ?').get(simpleProdId);
      if (p) throw new Error('Product was not deleted from database.');

      // Verify images cascaded
      const imgs = sqliteDb.prepare('SELECT COUNT(*) as c FROM product_images WHERE product_id = ?').get(simpleProdId);
      if (imgs.c !== 0) throw new Error('Product images were not cascaded upon deletion.');
    });

    await assertTest('Delete original product: duplicate product preserves images and R2 objects intact', async () => {
      // 1. Delete original product
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${variableProdId}`, {
        method: 'DELETE',
        params: { id: variableProdId }
      });
      const res = await handleAdminProductDelete(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

      // 2. Verify original product and original images are deleted from database
      const origProd = sqliteDb.prepare('SELECT 1 FROM products WHERE id = ?').get(variableProdId);
      if (origProd) throw new Error('Original product was not deleted.');
      const origImgs = sqliteDb.prepare('SELECT 1 FROM product_images WHERE product_id = ?').get(variableProdId);
      if (origImgs) throw new Error('Original product images were not deleted from DB.');

      // 3. Verify original R2 keys were removed from storage
      const origObj1 = await mockR2Bucket.get(origImgKey1);
      const origObj2 = await mockR2Bucket.get(origImgKey2);
      const origObj3 = await mockR2Bucket.get(origImgKey3);
      if (origObj1 || origObj2 || origObj3) {
        throw new Error('Original R2 objects were not deleted from storage.');
      }

      // 4. Verify DUPLICATED product STILL HAS its images in database!
      const dupImgs = sqliteDb.prepare('SELECT * FROM product_images WHERE product_id = ?').all(duplicatedProdId);
      if (dupImgs.length !== 3) {
        throw new Error(`Expected 3 duplicate images to survive, found ${dupImgs.length}`);
      }

      // 5. Verify DUPLICATED product STILL HAS its objects intact in R2 storage!
      for (const dImg of dupImgs) {
        const dupObj = await mockR2Bucket.get(dImg.image_key);
        if (!dupObj) {
          throw new Error(`CRITICAL DATA LOSS: Duplicated R2 object was deleted when original product was deleted: ${dImg.image_key}`);
        }
      }
    });

    await assertTest('Delete remaining test products and verify category can now be safely deleted', async () => {
      // Delete duplicated product
      const ctxDup = createRequestContext(`https://127.0.0.1:8788/api/admin/products/${duplicatedProdId}`, {
        method: 'DELETE',
        params: { id: duplicatedProdId }
      });
      await handleAdminProductDelete(ctxDup);

      // Category should now be unreferenced and deletable
      const ctx = createRequestContext(`https://127.0.0.1:8788/api/admin/categories/${testCatId}`, {
        method: 'DELETE',
        params: { id: testCatId }
      });
      const res = await handleAdminCategoryDelete(ctx);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

      const c = sqliteDb.prepare('SELECT 1 FROM categories WHERE id = ?').get(testCatId);
      if (c) throw new Error('Category was not deleted.');
    });

  } finally {
    console.log('\n--- Guaranteed Teardown (finally block) ---');
    cleanupTestFixturesByPrefix(sqliteDb, TEST_PREFIX);
    cleanupTestFixturesByPrefix(sqliteDb, `products/${TEST_PREFIX}`);
    for (const dynKey of dynamicallyGeneratedKeys) {
      sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?').run(dynKey);
    }
    // Also clean up any mock storage items
    mockR2Storage.clear();

    const postCounts = {
      categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
      products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
      variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
      images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
      inventoryLogs: sqliteDb.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
      pendingUploads: sqliteDb.prepare("SELECT COUNT(*) as c FROM pending_uploads").get().c,
      cleanupClaims: sqliteDb.prepare("SELECT COUNT(*) as c FROM cleanup_claims").get().c
    };

    let countsMatch = true;
    for (const [key, val] of Object.entries(baselineCounts)) {
      if (postCounts[key] !== val) {
        console.error(`Baseline count mismatch for ${key}: before=${val}, after=${postCounts[key]}`);
        countsMatch = false;
      }
    }

    if (countsMatch) {
      console.log('✅ PASS: Final Verification: Pre-existing database baseline counts completely preserved');
      passed++;
    } else {
      console.error('❌ FAIL: Database baseline counts were altered during test run!');
      failed++;
    }

    sqliteDb.close();
  }

  console.log('\n=================================================================');
  console.log(`Phase 3 Test Suite Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch(err => {
  console.error('Fatal error during Phase 3 test execution:', err);
  process.exit(1);
});

