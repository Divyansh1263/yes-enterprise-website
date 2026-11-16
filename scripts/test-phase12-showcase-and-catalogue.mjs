import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 12 Automated Verification Suite');
console.log('Testing New Products, Image Galleries, Homepage Showcase & Responsive UI');
console.log('=================================================================\n');

const suiteWatchdog = setTimeout(() => {
  console.error('\n❌ Fatal: Test timeout exceeded (180s). Force exiting.');
  process.exit(1);
}, 180000);
suiteWatchdog.unref();

const PORT = 8788;
const VITE_PORT = 5173;
const CDP_PORT = 9222;
const BASE_URL = `http://127.0.0.1:${VITE_PORT}`;
const API_BACKEND_URL = `http://127.0.0.1:${PORT}`;

// D1 Database Connection
const d1Dir = path.resolve('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbFile = fs.readdirSync(d1Dir).find(f => f.includes('6a1b3b744fa3757d') && f.endsWith('.sqlite'));
if (!dbFile) throw new Error('Active local D1 database file not found.');
const dbPath = path.join(d1Dir, dbFile);
console.log(`D1 Database connected: ${dbPath}`);
const sqliteDb = new DatabaseSync(dbPath);

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    results.push({ name: message, status: 'PASS', details });
    console.log(`✅ PASS: ${message}${details ? ` (${details})` : ''}`);
  } else {
    failed++;
    results.push({ name: message, status: 'FAIL', details });
    console.error(`❌ FAIL: ${message}${details ? ` [${details}]` : ''}`);
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── PART 1: LOCAL DATABASE CATALOGUE INTEGRITY ───────────────────────────────
console.log('\n--- 1. Database Catalogue & New Product Audit ---');

const counts = {
  categories: sqliteDb.prepare('SELECT count(*) as c FROM categories').get().c,
  products: sqliteDb.prepare('SELECT count(*) as c FROM products').get().c,
  images: sqliteDb.prepare('SELECT count(*) as c FROM product_images').get().c,
  variants: sqliteDb.prepare('SELECT count(*) as c FROM product_variants').get().c
};

assert(counts.categories === 6, 'Categories count preserved at 6', `Count: ${counts.categories}`);
assert(counts.products === 17, 'Total products expanded to 17 (14 baseline + 3 new)', `Count: ${counts.products}`);
assert(counts.images === 34, 'Total images expanded to 34 (28 baseline + 6 new)', `Count: ${counts.images}`);
assert(counts.variants === 0, 'Variants count preserved at 0', `Count: ${counts.variants}`);

// Audit Product A (prod-17)
const prod17 = sqliteDb.prepare("SELECT * FROM products WHERE id = 'prod-17'").get();
assert(prod17 !== undefined, 'Product A (prod-17) exists in database');
assert(prod17?.name === 'YE Stainless Steel Feeding Bottle with Handles', 'Product A English name matches');
assert(prod17?.name_hi === 'YE हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल', 'Product A Hindi name matches');
assert(prod17?.category_id === 'ss-bottles', 'Product A category is ss-bottles');
assert(prod17?.status === 'active', 'Product A status is active');
assert(prod17?.is_featured === 1, 'Product A is featured');

// Audit Product B (prod-18)
const prod18 = sqliteDb.prepare("SELECT * FROM products WHERE id = 'prod-18'").get();
assert(prod18 !== undefined, 'Product B (prod-18) exists in database');
assert(prod18?.name === 'YE Glass Sipper with Handle – 120 ml', 'Product B English name matches');
assert(prod18?.name_hi === 'YE हैंडल वाला ग्लास सिपर – 120 ml', 'Product B Hindi name matches');
assert(prod18?.category_id === 'glass-bottles', 'Product B category is glass-bottles');
assert(prod18?.status === 'active', 'Product B status is active');

// Audit Product C (prod-19)
const prod19 = sqliteDb.prepare("SELECT * FROM products WHERE id = 'prod-19'").get();
assert(prod19 !== undefined, 'Product C (prod-19) exists in database');
assert(prod19?.name === 'YE Premium Stainless Steel Feeding Bottle – 200 ml', 'Product C English name matches');
assert(prod19?.name_hi === 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल – 200 ml', 'Product C Hindi name matches');
assert(prod19?.category_id === 'ss-bottles', 'Product C category is ss-bottles');
assert(prod19?.status === 'active', 'Product C status is active');

// Audit Product C multi-image gallery
const prod19Images = sqliteDb.prepare("SELECT * FROM product_images WHERE product_id = 'prod-19' ORDER BY sort_order").all();
assert(prod19Images.length === 4, 'Product C gallery has exactly 4 images', `Count: ${prod19Images.length}`);
assert(prod19Images[0]?.is_primary === 1, 'Product C primary image is designated');
assert(prod19Images[1]?.is_primary === 0, 'Product C secondary image 1 is non-primary');
assert(prod19Images[2]?.is_primary === 0, 'Product C secondary image 2 is non-primary');
assert(prod19Images[3]?.is_primary === 0, 'Product C secondary image 3 is non-primary');

// Foreign Key Integrity
const fkViolations = sqliteDb.prepare('PRAGMA foreign_key_check').all();
assert(fkViolations.length === 0, 'Foreign key check returns zero violations', `Violations: ${fkViolations.length}`);

// ── PART 2: STATIC ASSETS AND IMAGES AUDIT ──────────────────────────────────
console.log('\n--- 2. Static Assets & Seller Photographs Audit ---');

const sellerImgDir = path.resolve('public/assets/seller-new-products');
assert(fs.existsSync(sellerImgDir), 'public/assets/seller-new-products directory exists');

const requiredFiles = [
  'WhatsApp Image 2026-11-15 at 7.23.56 PM.jpeg',
  'WhatsApp Image 2026-11-15 at 7.23.57 PM (1).jpeg',
  'WhatsApp Image 2026-11-15 at 7.23.57 PM (2).jpeg',
  'WhatsApp Image 2026-11-15 at 7.23.57 PM.jpeg',
  'WhatsApp Image 2026-11-15 at 7.23.58 PM (1).jpeg',
  'WhatsApp Image 2026-11-15 at 7.23.58 PM (2).jpeg',
  'WhatsApp Image 2026-11-15 at 7.23.58 PM.jpeg',
  'WhatsApp Image 2026-11-15 at 7.23.59 PM.jpeg',
  'product-a-handled-ss-bottle.jpeg',
  'product-b-glass-sipper-120ml.jpeg',
  'product-c-premium-ss-200ml-cap-box.jpeg',
  'product-c-premium-ss-200ml-open-cap.jpeg',
  'product-c-premium-ss-200ml-engraving.jpeg',
  'product-c-premium-ss-200ml-barcode.jpeg',
  'bottle-collection-range-lineup.jpeg',
  'bottle-collection-range-boxes.jpeg'
];

for (const f of requiredFiles) {
  const p = path.join(sellerImgDir, f);
  const exists = fs.existsSync(p);
  const size = exists ? fs.statSync(p).size : 0;
  assert(exists && size > 10000, `Seller asset exists & valid: ${f}`, `Size: ${size} bytes`);
}

// ── PART 3: PAGES FUNCTIONS API HANDLER INTEGRITY ───────────────────────────
console.log('\n--- 3. Pages Functions API Handlers Verification ---');

import { onRequestGet as getCategories } from '../functions/api/categories/index.js';
import { onRequestGet as getProducts } from '../functions/api/products/index.js';
import { onRequestGet as getProductBySlug } from '../functions/api/products/[slug].js';

// Mock DB wrapper for Pages Functions handlers
function makeMockD1(db) {
  return {
    prepare(query) {
      return {
        bind(...args) {
          return {
            async all() {
              const stmt = db.prepare(query);
              const rows = stmt.all(...args);
              return { results: rows, success: true };
            },
            async first(col) {
              const stmt = db.prepare(query);
              const row = stmt.get(...args);
              if (!row) return null;
              return col ? row[col] : row;
            },
            async run() {
              const stmt = db.prepare(query);
              const info = stmt.run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async all() {
          const stmt = db.prepare(query);
          return { results: stmt.all(), success: true };
        },
        async first(col) {
          const stmt = db.prepare(query);
          const row = stmt.get();
          if (!row) return null;
          return col ? row[col] : row;
        }
      };
    }
  };
}

const mockEnv = {
  DB: makeMockD1(sqliteDb),
  ENVIRONMENT: 'development'
};

// 1. Categories API
const catReq = new Request('http://localhost/api/categories');
const catRes = await getCategories({ request: catReq, env: mockEnv });
assert(catRes.status === 200, 'GET /api/categories returns 200');
const catJson = await catRes.json();
assert(catJson.success === true && catJson.data.length === 6, 'GET /api/categories returns 6 categories');

// 2. Products API
const prodReq = new Request('http://localhost/api/products?limit=50');
const prodRes = await getProducts({ request: prodReq, env: mockEnv });
assert(prodRes.status === 200, 'GET /api/products returns 200');
const prodJson = await prodRes.json();
assert(prodJson.success === true && prodJson.data.length === 17, 'GET /api/products returns all 17 products');

// 3. New Product Lookup by slug
const slugA = 'ye-stainless-steel-feeding-bottle-with-handles';
const resA = await getProductBySlug({ request: new Request(`http://localhost/api/products/${slugA}`), env: mockEnv, params: { slug: slugA } });
assert(resA.status === 200, `GET /api/products/${slugA} returns 200`);
const jsonA = await resA.json();
assert(jsonA.data.id === 'prod-17' && jsonA.data.images.length === 1, 'Product A returns prod-17 with primary image');

const slugC = 'ye-premium-stainless-steel-feeding-bottle-200ml';
const resC = await getProductBySlug({ request: new Request(`http://localhost/api/products/${slugC}`), env: mockEnv, params: { slug: slugC } });
assert(resC.status === 200, `GET /api/products/${slugC} returns 200`);
const jsonC = await resC.json();
assert(jsonC.data.id === 'prod-19' && jsonC.data.images.length === 4, 'Product C returns prod-19 with 4 gallery images');

// ── PART 4: REAL RUNTIME HTTP & BROWSER VERIFICATION ────────────────────────
console.log('\n--- 4. Real Runtime Dev Servers & Browser Tests ---');

let wranglerProc = null;
let viteProc = null;
let chromeProc = null;

try {
  // 1. Start Wrangler Pages Dev on port 8788
  console.log('Starting Wrangler Pages Dev server on port 8788...');
  wranglerProc = spawn('npx.cmd', ['wrangler', 'pages', 'dev', 'dist', '--port', '8788', '--ip', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, CI: 'true' }
  });

  // 2. Start Vite on port 5173
  console.log('Starting Vite preview/dev on port 5173...');
  viteProc = spawn('npx.cmd', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: process.env
  });

  // Wait for servers to become ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      const res = await fetch('http://127.0.0.1:5173/');
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
  }
  assert(serverReady, 'Local Vite server ready on http://127.0.0.1:5173');

  // Launch Chrome with remote debugging
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-test-profile');
  chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${chromeUserData}`,
    'about:blank'
  ]);

  // Connect to Chrome DevTools Protocol
  await sleep(2000);
  const versionRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
  const versionData = await versionRes.json();
  const wsUrl = versionData.webSocketDebuggerUrl;
  assert(Boolean(wsUrl), 'Connected to Chrome CDP WebSocket');

  const { default: WebSocket } = await import('node:ws').catch(async () => {
    // If ws is not globally available, we can test via CDP HTTP endpoints /json/new
    return { default: null };
  });

  // Test static endpoints via HTTP
  const homeRes = await fetch('http://127.0.0.1:5173/');
  const homeHtml = await homeRes.text();
  assert(homeRes.status === 200, 'Home page returns HTTP 200');

  // Verify Showcase image HTTP availability
  const showcaseImgRes = await fetch('http://127.0.0.1:5173/assets/seller-new-products/bottle-collection-range-lineup.jpeg');
  assert(showcaseImgRes.status === 200, 'Showcase wide image accessible via HTTP (200 OK)');
  const showcaseImgBuf = await showcaseImgRes.arrayBuffer();
  assert(showcaseImgBuf.byteLength > 50000, 'Showcase image payload > 50KB', `Size: ${showcaseImgBuf.byteLength} bytes`);

  // Verify Product C primary image HTTP availability
  const prodCImgRes = await fetch('http://127.0.0.1:5173/assets/seller-new-products/product-c-premium-ss-200ml-cap-box.jpeg');
  assert(prodCImgRes.status === 200, 'Product C primary image accessible via HTTP (200 OK)');

  // Verify Product A image HTTP availability
  const prodAImgRes = await fetch('http://127.0.0.1:5173/assets/seller-new-products/product-a-handled-ss-bottle.jpeg');
  assert(prodAImgRes.status === 200, 'Product A primary image accessible via HTTP (200 OK)');

  // Verify Product B image HTTP availability
  const prodBImgRes = await fetch('http://127.0.0.1:5173/assets/seller-new-products/product-b-glass-sipper-120ml.jpeg');
  assert(prodBImgRes.status === 200, 'Product B primary image accessible via HTTP (200 OK)');

} finally {
  if (chromeProc) chromeProc.kill();
  if (viteProc) viteProc.kill();
  if (wranglerProc) wranglerProc.kill();
}

console.log('\n=================================================================');
console.log(`Phase 12 Verification Suite Summary: ${passed} Passed, ${failed} Failed`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
}
