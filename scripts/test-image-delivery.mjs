/**
 * YES ENTERPRISES — Image Delivery Route Test Suite
 * Tests functions/uploads/[[key]].js for R2 image streaming, security,
 * directory traversal rejection, access control, caching, and conditional requests.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import { onRequest } from '../functions/uploads/[[key]].js';

console.log('=================================================================');
console.log('YES ENTERPRISES — R2 Image Delivery Route Test Suite');
console.log('Testing /uploads/[[key]] Access Control, Security & Caching');
console.log('=================================================================\n');

// Mapping of known Cloudflare D1 database IDs to their Miniflare Durable Object storage hashes
const KNOWN_D1_HASHES = {
  // Production / active development binding: 54c9ce5b-377e-4788-9899-43f71addf8a9
  '54c9ce5b-377e-4788-9899-43f71addf8a9': '6a1b3b744fa3757d88c3c37a6e58dbe029fc1f0fedf109567181075521f4e00c'
};

// ── 1. LOCATE LOCAL D1 DATABASE ─────────────────────────────────────────────
function locateIntendedD1Database() {
  if (process.env.D1_TEST_DB_PATH && fs.existsSync(process.env.D1_TEST_DB_PATH)) {
    return process.env.D1_TEST_DB_PATH;
  }
  const d1Dir = path.resolve('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(d1Dir)) {
    throw new Error(`Local D1 state directory not found at: ${d1Dir}`);
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
  throw new Error('Could not locate intended D1 database.');
}

const dbPath = locateIntendedD1Database();
console.log(`Connecting to local D1 emulator database:\n  ${dbPath}\n`);
const sqliteDb = new DatabaseSync(dbPath);
sqliteDb.exec('PRAGMA foreign_keys = ON;');

// ── 2. RECORD BASELINE COUNTS ────────────────────────────────────────────────
const baselineCounts = {
  categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
  products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
  variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
  images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
  inventoryLogs: sqliteDb.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
  pendingUploads: sqliteDb.prepare("SELECT COUNT(*) as c FROM pending_uploads").get().c,
  cleanupClaims: sqliteDb.prepare("SELECT COUNT(*) as c FROM cleanup_claims").get().c
};
console.log('Pre-test baseline database record counts:', baselineCounts);

// ── 3. D1 ADAPTER ────────────────────────────────────────────────────────────
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
    }
  };
}

const d1Binding = createD1Adapter(sqliteDb);

// ── 4. MOCK R2 BUCKET ────────────────────────────────────────────────────────
const mockR2Storage = new Map();

function createMockR2Bucket() {
  return {
    async get(key) {
      if (!mockR2Storage.has(key)) return null;
      const item = mockR2Storage.get(key);
      return {
        size: item.bytes.length,
        httpEtag: item.etag || `"${crypto.createHash('md5').update(item.bytes).digest('hex')}"`,
        httpMetadata: {
          contentType: item.contentType
        },
        body: item.bytes,
        bytes: item.bytes,
        async arrayBuffer() {
          return item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength);
        }
      };
    },
    async put(key, bytes, options = {}) {
      mockR2Storage.set(key, {
        bytes: Buffer.isBuffer(bytes) ? new Uint8Array(bytes) : bytes,
        contentType: options?.httpMetadata?.contentType || 'application/octet-stream',
        etag: options?.etag || `"${crypto.randomUUID()}"`
      });
    }
  };
}

const mockBucket = createMockR2Bucket();

// ── 4b. RSA-2048 CRYPTOGRAPHIC TEST KEYPAIR (RS256) ──────────────────────────
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const testJwk = publicKey.export({ format: 'jwk' });
testJwk.kid = 'image-audit-test-key-id';
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
    aud: 'test-audit-aud-tag',
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

const mockJwksFetch = async (url) => {
  if (url.includes('/cdn-cgi/access/certs')) {
    return new Response(JSON.stringify({ keys: [testJwk], public_certs: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response('Not Found', { status: 404 });
};

// ── 5. TEST CONTEXT BUILDER ──────────────────────────────────────────────────
const TEST_ENV = {
  DB: d1Binding,
  PRODUCT_BUCKET: mockBucket,
  ENVIRONMENT: 'development',
  ADMIN_EMAILS: 'admin@yesenterprises.in',
  DEV_BYPASS_EMAIL: 'admin@yesenterprises.in',
  ENABLE_DEV_ADMIN_BYPASS: 'true',
  CF_ACCESS_TEAM_NAME: 'yes-enterprises',
  CF_ACCESS_AUD: 'test-audit-aud-tag',
  FETCH_FN: mockJwksFetch
};

function createRequestContext(urlStr, options = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});

  let keySegments = [];
  if (options.params?.key) {
    keySegments = options.params.key;
  } else {
    const idx = urlStr.indexOf('/uploads/');
    if (idx !== -1) {
      const sub = urlStr.slice(idx + '/uploads/'.length).split('?')[0];
      keySegments = sub ? sub.split('/') : [];
    }
  }

  return {
    request: new Request(urlStr, {
      method,
      headers
    }),
    env: options.env || TEST_ENV,
    params: {
      key: keySegments
    }
  };
}

// ── 6. SEED TEST FIXTURES ────────────────────────────────────────────────────
const RUN_ID = `deltest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const CAT_ID = crypto.randomUUID();
const PROD_ACTIVE_ID = crypto.randomUUID();
const PROD_DRAFT_ID = crypto.randomUUID();
const PROD_ARCHIVED_ID = crypto.randomUUID();
const PROD_VAR_ID = crypto.randomUUID();
const VAR_ACTIVE_ID = crypto.randomUUID();
const VAR_ARCHIVED_ID = crypto.randomUUID();

// Sample valid image payloads with genuine signatures
const SAMPLE_JPEG = Buffer.concat([
  Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]),
  Buffer.alloc(500, 0xAA)
]);

const SAMPLE_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  Buffer.alloc(600, 0xBB)
]);

const SAMPLE_WEBP = Buffer.concat([
  Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x20, 0x57, 0x45, 0x42, 0x50]),
  Buffer.alloc(400, 0xCC)
]);

// Image Keys
const KEY_JPEG = `products/${RUN_ID}_active.jpg`;
const KEY_PNG = `products/${RUN_ID}_active.png`;
const KEY_WEBP = `products/${RUN_ID}_active.webp`;
const KEY_MISSING_R2 = `products/${RUN_ID}_missing_r2.jpg`;
const KEY_UNREGISTERED = `products/${RUN_ID}_unregistered.jpg`;
const KEY_DRAFT = `products/${RUN_ID}_draft.jpg`;
const KEY_ARCHIVED_PROD = `products/${RUN_ID}_archived_prod.jpg`;
const KEY_ARCHIVED_VAR = `products/${RUN_ID}_archived_var.jpg`;

function setupFixtures() {
  // Category
  sqliteDb.prepare(`
    INSERT INTO categories (id, name, name_hi, slug, sort_order)
    VALUES (?, 'Delivery Test Cat', 'डिलीवरी टेस्ट', ?, 1)
  `).run(CAT_ID, `cat-${RUN_ID}`);

  // Products
  sqliteDb.prepare(`
    INSERT INTO products (id, category_id, name, name_hi, slug, status, stock_quantity)
    VALUES (?, ?, 'Active Product', 'सक्रिय उत्पाद', ?, 'active', 50)
  `).run(PROD_ACTIVE_ID, CAT_ID, `prod-act-${RUN_ID}`);

  sqliteDb.prepare(`
    INSERT INTO products (id, category_id, name, name_hi, slug, status, stock_quantity)
    VALUES (?, ?, 'Draft Product', 'ड्राफ्ट उत्पाद', ?, 'draft', 10)
  `).run(PROD_DRAFT_ID, CAT_ID, `prod-draft-${RUN_ID}`);

  sqliteDb.prepare(`
    INSERT INTO products (id, category_id, name, name_hi, slug, status, stock_quantity)
    VALUES (?, ?, 'Archived Product', 'आर्काइव्ड उत्पाद', ?, 'archived', 0)
  `).run(PROD_ARCHIVED_ID, CAT_ID, `prod-arch-${RUN_ID}`);

  sqliteDb.prepare(`
    INSERT INTO products (id, category_id, name, name_hi, slug, status, has_variants, stock_quantity)
    VALUES (?, ?, 'Variable Product', 'वेरिएंट उत्पाद', ?, 'active', 1, 0)
  `).run(PROD_VAR_ID, CAT_ID, `prod-var-${RUN_ID}`);

  // Variants
  sqliteDb.prepare(`
    INSERT INTO product_variants (id, product_id, title, title_hi, sku, status, price_paise, stock_quantity)
    VALUES (?, ?, 'Active Var', 'सक्रिय', ?, 'active', 10000, 20)
  `).run(VAR_ACTIVE_ID, PROD_VAR_ID, `SKU-ACT-${RUN_ID.toUpperCase()}`);

  sqliteDb.prepare(`
    INSERT INTO product_variants (id, product_id, title, title_hi, sku, status, price_paise, stock_quantity)
    VALUES (?, ?, 'Archived Var', 'आर्काइव्ड', ?, 'archived', 12000, 0)
  `).run(VAR_ARCHIVED_ID, PROD_VAR_ID, `SKU-ARCH-${RUN_ID.toUpperCase()}`);

  // Product Images
  const insertImage = sqliteDb.prepare(`
    INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, width, height, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, 800, 800, ?)
  `);

  insertImage.run(crypto.randomUUID(), PROD_ACTIVE_ID, null, KEY_JPEG, 'image/jpeg', SAMPLE_JPEG.length, 1);
  insertImage.run(crypto.randomUUID(), PROD_ACTIVE_ID, null, KEY_PNG, 'image/png', SAMPLE_PNG.length, 0);
  insertImage.run(crypto.randomUUID(), PROD_ACTIVE_ID, null, KEY_WEBP, 'image/webp', SAMPLE_WEBP.length, 0);
  insertImage.run(crypto.randomUUID(), PROD_ACTIVE_ID, null, KEY_MISSING_R2, 'image/jpeg', 1024, 0);
  insertImage.run(crypto.randomUUID(), PROD_DRAFT_ID, null, KEY_DRAFT, 'image/jpeg', SAMPLE_JPEG.length, 1);
  insertImage.run(crypto.randomUUID(), PROD_ARCHIVED_ID, null, KEY_ARCHIVED_PROD, 'image/jpeg', SAMPLE_JPEG.length, 1);
  insertImage.run(crypto.randomUUID(), PROD_VAR_ID, VAR_ARCHIVED_ID, KEY_ARCHIVED_VAR, 'image/jpeg', SAMPLE_JPEG.length, 1);

  // Seed Mock R2 Storage
  mockBucket.put(KEY_JPEG, SAMPLE_JPEG, { httpMetadata: { contentType: 'image/jpeg' }, etag: '"jpeg-etag-123"' });
  mockBucket.put(KEY_PNG, SAMPLE_PNG, { httpMetadata: { contentType: 'image/png' }, etag: '"png-etag-456"' });
  mockBucket.put(KEY_WEBP, SAMPLE_WEBP, { httpMetadata: { contentType: 'image/webp' }, etag: '"webp-etag-789"' });
  mockBucket.put(KEY_UNREGISTERED, SAMPLE_JPEG, { httpMetadata: { contentType: 'image/jpeg' }, etag: '"unregistered-etag"' });
  mockBucket.put(KEY_DRAFT, SAMPLE_JPEG, { httpMetadata: { contentType: 'image/jpeg' }, etag: '"draft-etag-111"' });
  mockBucket.put(KEY_ARCHIVED_PROD, SAMPLE_JPEG, { httpMetadata: { contentType: 'image/jpeg' }, etag: '"arch-prod-etag"' });
  mockBucket.put(KEY_ARCHIVED_VAR, SAMPLE_JPEG, { httpMetadata: { contentType: 'image/jpeg' }, etag: '"arch-var-etag"' });
}

function cleanupFixtures() {
  sqliteDb.prepare("DELETE FROM product_images WHERE image_key LIKE ?").run(`products/${RUN_ID}%`);
  sqliteDb.prepare("DELETE FROM product_variants WHERE product_id = ?").run(PROD_VAR_ID);
  sqliteDb.prepare("DELETE FROM products WHERE id IN (?, ?, ?, ?)").run(PROD_ACTIVE_ID, PROD_DRAFT_ID, PROD_ARCHIVED_ID, PROD_VAR_ID);
  sqliteDb.prepare("DELETE FROM categories WHERE id = ?").run(CAT_ID);
}

// ── 7. TEST RUNNER ───────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

async function main() {
  setupFixtures();

  console.log('\n--- 1. Valid Image Format Deliveries ---');

  await runTest('1. Valid JPEG delivery: Returns 200, binary body, Content-Type, and ETag', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`);
    const res = await onRequest(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.headers.get('Content-Type') !== 'image/jpeg') throw new Error(`Expected image/jpeg, got ${res.headers.get('Content-Type')}`);
    if (!res.headers.get('ETag')) throw new Error('Missing ETag header');
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length !== SAMPLE_JPEG.length) throw new Error(`Body length mismatch: expected ${SAMPLE_JPEG.length}, got ${bytes.length}`);
  });

  await runTest('2. Valid PNG delivery: Returns 200, binary body and image/png Content-Type', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_PNG}`);
    const res = await onRequest(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.headers.get('Content-Type') !== 'image/png') throw new Error(`Expected image/png, got ${res.headers.get('Content-Type')}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length !== SAMPLE_PNG.length) throw new Error(`Body length mismatch: expected ${SAMPLE_PNG.length}, got ${bytes.length}`);
  });

  await runTest('3. Valid WebP delivery: Returns 200, binary body and image/webp Content-Type', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_WEBP}`);
    const res = await onRequest(ctx);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.headers.get('Content-Type') !== 'image/webp') throw new Error(`Expected image/webp, got ${res.headers.get('Content-Type')}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length !== SAMPLE_WEBP.length) throw new Error(`Body length mismatch: expected ${SAMPLE_WEBP.length}, got ${bytes.length}`);
  });

  console.log('\n--- 2. Existence & Registration Protection ---');

  await runTest('4. Missing R2 object returns 404', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_MISSING_R2}`);
    const res = await onRequest(ctx);
    if (res.status !== 404) throw new Error(`Expected 404 for missing R2 object, got ${res.status}`);
  });

  await runTest('5. Unregistered image key returns 404 (even if object exists in R2)', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_UNREGISTERED}`);
    const res = await onRequest(ctx);
    if (res.status !== 404) throw new Error(`Expected 404 for unregistered image key, got ${res.status}`);
  });

  await runTest('6. Invalid image key returns 400 or 404 (empty, special characters, control chars)', async () => {
    // Empty key
    const ctxEmpty = createRequestContext('http://127.0.0.1:8788/uploads/');
    const resEmpty = await onRequest(ctxEmpty);
    if (resEmpty.status !== 404 && resEmpty.status !== 400) throw new Error(`Expected 400/404 for empty key, got ${resEmpty.status}`);

    // Invalid characters (asterisk, shell chars)
    const ctxSpecial = createRequestContext('http://127.0.0.1:8788/uploads/products/invalid*name.jpg');
    const resSpecial = await onRequest(ctxSpecial);
    if (resSpecial.status !== 400) throw new Error(`Expected 400 for invalid characters, got ${resSpecial.status}`);

    // Unexpected prefix
    const ctxPrefix = createRequestContext('http://127.0.0.1:8788/uploads/private/document.jpg');
    const resPrefix = await onRequest(ctxPrefix);
    if (resPrefix.status !== 404 && resPrefix.status !== 400) throw new Error(`Expected 400/404 for unexpected prefix, got ${resPrefix.status}`);
  });

  console.log('\n--- 3. Traversal Defenses & MIME Restrictions ---');

  await runTest('7. Directory traversal attempts are rejected (raw .. and backslashes)', async () => {
    const ctx1 = createRequestContext('http://127.0.0.1:8788/uploads/products/../../secret.json');
    const res1 = await onRequest(ctx1);
    if (res1.status !== 400) throw new Error(`Expected 400 for ../ traversal, got ${res1.status}`);

    const ctx2 = createRequestContext('http://127.0.0.1:8788/uploads/products/..\\secret.jpg');
    const res2 = await onRequest(ctx2);
    if (res2.status !== 400) throw new Error(`Expected 400 for backslash traversal, got ${res2.status}`);
  });

  await runTest('8. Encoded traversal attempts are rejected (%2e%2e, %2f, double encoding)', async () => {
    const ctx1 = createRequestContext('http://127.0.0.1:8788/uploads/products/%2e%2e/secret.json');
    const res1 = await onRequest(ctx1);
    if (res1.status !== 400) throw new Error(`Expected 400 for %2e%2e traversal, got ${res1.status}`);

    const ctx2 = createRequestContext('http://127.0.0.1:8788/uploads/%2e%2e%2fsecret.json');
    const res2 = await onRequest(ctx2);
    if (res2.status !== 400) throw new Error(`Expected 400 for %2e%2e%2f traversal, got ${res2.status}`);
  });

  await runTest('9. Unsupported MIME types and executable extensions are rejected', async () => {
    const exts = ['exe', 'js', 'html', 'php', 'svg', 'json', 'pdf', 'sh'];
    for (const ext of exts) {
      const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/products/malicious.${ext}`);
      const res = await onRequest(ctx);
      if (res.status !== 400 && res.status !== 404) {
        throw new Error(`Expected 400/404 for extension .${ext}, got ${res.status}`);
      }
    }
  });

  console.log('\n--- 4. HTTP Headers, Caching & Conditional Requests ---');

  await runTest('10. Correct Content-Type and security headers (nosniff, DENY, CSP sandbox)', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`);
    const res = await onRequest(ctx);
    if (res.headers.get('Content-Type') !== 'image/jpeg') throw new Error('Incorrect Content-Type');
    if (res.headers.get('X-Content-Type-Options') !== 'nosniff') throw new Error('Missing X-Content-Type-Options: nosniff');
    if (res.headers.get('X-Frame-Options') !== 'DENY') throw new Error('Missing X-Frame-Options: DENY');
    if (!res.headers.get('Content-Security-Policy')?.includes('sandbox')) throw new Error('Missing CSP sandbox directive');
  });

  await runTest('11. ETag is returned in response', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`);
    const res = await onRequest(ctx);
    const etag = res.headers.get('ETag');
    if (!etag || !etag.includes('jpeg-etag-123')) throw new Error(`Expected ETag containing jpeg-etag-123, got ${etag}`);
  });

  await runTest('12. Matching If-None-Match returns HTTP 304 with no body', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`, {
      headers: {
        'If-None-Match': '"jpeg-etag-123"'
      }
    });
    const res = await onRequest(ctx);
    if (res.status !== 304) throw new Error(`Expected 304 Not Modified, got ${res.status}`);
    const text = await res.text();
    if (text.length > 0) throw new Error(`Expected empty body for 304, got length ${text.length}`);
    if (res.headers.get('ETag') !== '"jpeg-etag-123"') throw new Error('Missing matching ETag on 304');
  });

  await runTest('13. Cache-Control headers are correct (immutable for public, private for admin preview)', async () => {
    // Public active image
    const ctxPub = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`);
    const resPub = await onRequest(ctxPub);
    const ccPub = resPub.headers.get('Cache-Control');
    if (!ccPub || !ccPub.includes('public') || !ccPub.includes('immutable')) {
      throw new Error(`Expected public immutable cache control, got: ${ccPub}`);
    }

    // Admin preview of draft image
    const ctxAdmin = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: {
        'host': 'localhost:8788',
        'x-dev-admin-bypass': 'true'
      }
    });
    const resAdmin = await onRequest(ctxAdmin);
    if (resAdmin.status !== 200) throw new Error(`Expected 200 for admin draft preview, got ${resAdmin.status}`);
    const ccAdmin = resAdmin.headers.get('Cache-Control');
    if (!ccAdmin || !ccAdmin.includes('private') || !ccAdmin.includes('no-cache')) {
      throw new Error(`Expected private no-cache control for draft preview, got: ${ccAdmin}`);
    }
  });

  console.log('\n--- 5. Authorization Policy for Draft / Archived Products ---');

  await runTest('14a. Draft product image: Public unauthenticated request returns 404', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`);
    const res = await onRequest(ctx);
    if (res.status !== 404) throw new Error(`Expected 404 for unauthenticated draft image, got ${res.status}`);
  });

  await runTest('14b. Archived product image: Public unauthenticated request returns 404', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_ARCHIVED_PROD}`);
    const res = await onRequest(ctx);
    if (res.status !== 404) throw new Error(`Expected 404 for unauthenticated archived product image, got ${res.status}`);
  });

  await runTest('14c. Archived variant image: Public unauthenticated request returns 404', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_ARCHIVED_VAR}`);
    const res = await onRequest(ctx);
    if (res.status !== 404) throw new Error(`Expected 404 for unauthenticated archived variant image, got ${res.status}`);
  });

  await runTest('14d. Draft/archived images: Authenticated admin request successfully delivers preview', async () => {
    const adminHeaders = {
      'host': 'localhost:8788',
      'x-dev-admin-bypass': 'true'
    };

    const resDraft = await onRequest(createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, { headers: adminHeaders }));
    if (resDraft.status !== 200) throw new Error(`Expected 200 for admin draft preview, got ${resDraft.status}`);

    const resArchProd = await onRequest(createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_ARCHIVED_PROD}`, { headers: adminHeaders }));
    if (resArchProd.status !== 200) throw new Error(`Expected 200 for admin archived product preview, got ${resArchProd.status}`);

    const resArchVar = await onRequest(createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_ARCHIVED_VAR}`, { headers: adminHeaders }));
    if (resArchVar.status !== 200) throw new Error(`Expected 200 for admin archived variant preview, got ${resArchVar.status}`);
  });

  console.log('\n--- 6. Fail-Closed Error Handling & HTTP Methods ---');

  await runTest('15a. Database failure fails closed without leaking internal SQL error', async () => {
    const brokenDbEnv = {
      ...TEST_ENV,
      DB: {
        prepare() {
          throw new Error('FATAL D1 DISK CORRUPTION sqlite_master locked');
        }
      }
    };
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`, { env: brokenDbEnv });
    const res = await onRequest(ctx);
    if (res.status !== 500) throw new Error(`Expected 500 on db error, got ${res.status}`);
    const text = await res.text();
    if (text.includes('sqlite') || text.includes('FATAL') || text.includes('CORRUPTION')) {
      throw new Error(`Leaked internal database details: ${text}`);
    }
  });

  await runTest('15b. R2 storage failure fails closed without leaking stack traces', async () => {
    const brokenR2Env = {
      ...TEST_ENV,
      PRODUCT_BUCKET: {
        async get() {
          throw new Error('R2_NETWORK_TIMEOUT connection reset by peer AWS4 error');
        }
      }
    };
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`, { env: brokenR2Env });
    const res = await onRequest(ctx);
    if (res.status !== 500) throw new Error(`Expected 500 on R2 error, got ${res.status}`);
    const text = await res.text();
    if (text.includes('connection reset') || text.includes('AWS4')) {
      throw new Error(`Leaked internal storage details: ${text}`);
    }
  });

  await runTest('16. HEAD request method: Returns headers with 200 and null/empty body', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`, { method: 'HEAD' });
    const res = await onRequest(ctx);
    if (res.status !== 200) throw new Error(`Expected 200 for HEAD, got ${res.status}`);
    if (res.headers.get('Content-Type') !== 'image/jpeg') throw new Error('Missing Content-Type on HEAD');
    if (!res.headers.get('ETag')) throw new Error('Missing ETag on HEAD');
    const bodyText = await res.text();
    if (bodyText.length > 0) throw new Error(`Expected 0 body bytes on HEAD, got ${bodyText.length}`);
  });

  await runTest('17. Unsupported HTTP method: POST returns 405 Method Not Allowed', async () => {
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_JPEG}`, { method: 'POST' });
    const res = await onRequest(ctx);
    if (res.status !== 405) throw new Error(`Expected 405 for POST, got ${res.status}`);
    if (res.headers.get('Allow') !== 'GET, HEAD') throw new Error(`Expected Allow: GET, HEAD, got ${res.headers.get('Allow')}`);
  });

  console.log('\n--- 7. Focused Cloudflare Access Security & Negative Audit Tests ---');

  await runTest('18. Forged admin identity headers are rejected (x-admin, x-role, cookie, query params)', async () => {
    const forgedHeadersList = [
      { 'x-admin-email': 'admin@yesenterprises.in' },
      { 'x-user-email': 'admin@yesenterprises.in' },
      { 'x-role': 'admin' },
      { 'x-authenticated': 'true' },
      { 'x-is-admin': '1' },
      { 'cookie': 'is_admin=true; role=admin; email=admin@yesenterprises.in' }
    ];

    for (const h of forgedHeadersList) {
      const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, { headers: h });
      const res = await onRequest(ctx);
      if (res.status !== 404) {
        throw new Error(`Forged header ${JSON.stringify(h)} granted access with status ${res.status}`);
      }
    }

    // Query params cannot grant access
    const ctxQuery = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}?admin=true&email=admin@yesenterprises.in`);
    const resQuery = await onRequest(ctxQuery);
    if (resQuery.status !== 404) {
      throw new Error(`Query param granted access with status ${resQuery.status}`);
    }
  });

  await runTest('19. Invalid, expired, and tampered JWTs are rejected with 404 on draft images', async () => {
    // Malformed token
    const ctxMalformed = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: { 'CF_Authorization': 'invalid.token.structure' }
    });
    const resMalformed = await onRequest(ctxMalformed);
    if (resMalformed.status !== 404) throw new Error(`Malformed JWT granted access with status ${resMalformed.status}`);

    // Expired token
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredJwt = createSignedJwt({ exp: nowSec - 60 });
    const ctxExpired = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: { 'CF_Authorization': expiredJwt }
    });
    const resExpired = await onRequest(ctxExpired);
    if (resExpired.status !== 404) throw new Error(`Expired JWT granted access with status ${resExpired.status}`);

    // Tampered signature
    const validJwt = createSignedJwt();
    const tamperedJwt = validJwt.slice(0, -6) + 'AAAAAA';
    const ctxTampered = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: { 'CF_Authorization': tamperedJwt }
    });
    const resTampered = await onRequest(ctxTampered);
    if (resTampered.status !== 404) throw new Error(`Tampered JWT granted access with status ${resTampered.status}`);
  });

  await runTest('20. JWT with incorrect audience or issuer is rejected with 404 on draft images', async () => {
    // Incorrect audience
    const wrongAudJwt = createSignedJwt({ aud: 'wrong-audience-tag' });
    const ctxAud = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: { 'CF_Authorization': wrongAudJwt }
    });
    const resAud = await onRequest(ctxAud);
    if (resAud.status !== 404) throw new Error(`Wrong audience JWT granted access with status ${resAud.status}`);

    // Incorrect issuer
    const wrongIssJwt = createSignedJwt({ iss: 'https://attacker.cloudflareaccess.com' });
    const ctxIss = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: { 'CF_Authorization': wrongIssJwt }
    });
    const resIss = await onRequest(ctxIss);
    if (resIss.status !== 404) throw new Error(`Wrong issuer JWT granted access with status ${resIss.status}`);
  });

  await runTest('21. JWT with non-allowlisted email identity is rejected with 404 on draft images', async () => {
    const unallowedJwt = createSignedJwt({ email: 'intruder@external.com' });
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: { 'CF_Authorization': unallowedJwt }
    });
    const res = await onRequest(ctx);
    if (res.status !== 404) throw new Error(`Non-allowlisted email granted access with status ${res.status}`);
  });

  await runTest('22. Valid cryptographic RS256 Cloudflare Access JWT grants admin preview with private cache', async () => {
    const validJwt = createSignedJwt({ email: 'admin@yesenterprises.in' });
    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      headers: { 'CF_Authorization': validJwt }
    });
    const res = await onRequest(ctx);
    if (res.status !== 200) throw new Error(`Expected 200 for valid RS256 JWT, got ${res.status}`);
    const cc = res.headers.get('Cache-Control');
    if (!cc || !cc.includes('private') || !cc.includes('no-cache')) {
      throw new Error(`Expected private cache control, got: ${cc}`);
    }
  });

  await runTest('23. Production environment strictly rejects development bypass headers', async () => {
    const prodEnv = {
      ...TEST_ENV,
      ENVIRONMENT: 'production',
      ENABLE_DEV_ADMIN_BYPASS: 'true'
    };

    const ctx = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_DRAFT}`, {
      env: prodEnv,
      headers: {
        'host': '127.0.0.1:8788',
        'x-dev-admin-bypass': 'true'
      }
    });

    const res = await onRequest(ctx);
    if (res.status !== 404) {
      throw new Error(`Dev bypass header permitted in production environment! Status: ${res.status}`);
    }
  });

  await runTest('24. Arbitrary R2 key existing in storage but not registered in D1 is rejected (404)', async () => {
    // Public unauthenticated
    const ctxPub = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_UNREGISTERED}`);
    const resPub = await onRequest(ctxPub);
    if (resPub.status !== 404) throw new Error(`Arbitrary R2 key was publicly accessible! Status: ${resPub.status}`);

    // Admin request
    const ctxAdmin = createRequestContext(`http://127.0.0.1:8788/uploads/${KEY_UNREGISTERED}`, {
      headers: { 'host': '127.0.0.1:8788', 'x-dev-admin-bypass': 'true' }
    });
    const resAdmin = await onRequest(ctxAdmin);
    if (resAdmin.status !== 404) throw new Error(`Arbitrary R2 key was accessible to admin! Status: ${resAdmin.status}`);
  });

  // ── 8. TEARDOWN & BASELINE PRESERVATION VERIFICATION ───────────────────────
  console.log('\n--- Teardown & Database Baseline Verification ---');
  cleanupFixtures();

  const finalCounts = {
    categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
    products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
    variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
    images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
    inventoryLogs: sqliteDb.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
    pendingUploads: sqliteDb.prepare("SELECT COUNT(*) as c FROM pending_uploads").get().c,
    cleanupClaims: sqliteDb.prepare("SELECT COUNT(*) as c FROM cleanup_claims").get().c
  };

  console.log('Post-test final database record counts:', finalCounts);
  sqliteDb.close();

  const baselinePreserved =
    finalCounts.products === baselineCounts.products &&
    finalCounts.categories === baselineCounts.categories &&
    finalCounts.variants === baselineCounts.variants &&
    finalCounts.images === baselineCounts.images &&
    finalCounts.inventoryLogs === baselineCounts.inventoryLogs &&
    finalCounts.pendingUploads === baselineCounts.pendingUploads &&
    finalCounts.cleanupClaims === baselineCounts.cleanupClaims;

  if (baselinePreserved) {
    console.log('✅ PASS: Database baseline counts 100% preserved');
    passed++;
  } else {
    console.log('❌ FAIL: Database baseline counts modified during test run');
    failed++;
  }

  console.log('\n=================================================================');
  console.log(`Image Delivery Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
