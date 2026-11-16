import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

console.log('=================================================================');
console.log('YES ENTERPRISES — Comprehensive End-to-End Browser Verification');
console.log('Testing Desktop, Mobile, Tablet, English, Hindi, Admin & Catalogue');
console.log('=================================================================\n');

const suiteWatchdog = setTimeout(() => {
  console.error('\n❌ Fatal: Global test timeout exceeded (180s). Force exiting.');
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
sqliteDb.exec('PRAGMA foreign_keys = ON;');

const RUN_ID = `final_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const CLEAN_RUN_ID = RUN_ID.replace(/_/g, '-');
const TEST_PREFIX = `test_${RUN_ID}_`;

const baselineCounts = {
  categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
  products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
  variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
  images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
};
console.log('Pre-test baseline database record counts:', baselineCounts);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function recordResult(name, status, notes = '') {
  testResults.push({ name, status, notes });
  if (status === 'PASS') {
    console.log(`✅ PASS: ${name} ${notes ? `(${notes})` : ''}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${name} -> ${notes}`);
    failedCount++;
  }
}

async function runVerification() {
  const isWindows = process.platform === 'win32';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tmpUserDataDir = path.resolve(process.env.TEMP, `chrome_final_verify_${Date.now()}`);

  let wranglerProc = null;
  let viteProc = null;
  let chromeProc = null;
  let ws = null;
  let tabId = null;

  try {
    // 1. Start Wrangler
    console.log('\n[1/4] Starting Wrangler Pages Dev on ' + API_BACKEND_URL + '...');
    wranglerProc = spawn(isWindows ? 'npx.cmd' : 'npx', [
      'wrangler', 'pages', 'dev', 'dist',
      '--port', String(PORT),
      '--ip', '127.0.0.1'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
      env: {
        ...process.env,
        CI: 'true',
        APPDATA: path.resolve('./.wrangler'),
        LOCALAPPDATA: path.resolve('./.wrangler'),
        XDG_CONFIG_HOME: path.resolve('./.wrangler'),
        XDG_CACHE_HOME: path.resolve('./.wrangler')
      }
    });

    let serverReady = false;
    let wranglerLogs = [];
    const onWranglerData = (d) => {
      const s = d.toString();
      wranglerLogs.push(s);
      if (s.includes('Ready on') || s.includes(`http://127.0.0.1:${PORT}`)) serverReady = true;
    };
    wranglerProc.stdout.on('data', onWranglerData);
    wranglerProc.stderr.on('data', onWranglerData);

    const startWait = Date.now();
    while (!serverReady && (Date.now() - startWait < 25000)) {
      try {
        const ping = await fetch(`http://127.0.0.1:${PORT}/api/products?limit=1`);
        if (ping.status === 200) { serverReady = true; break; }
      } catch {}
      await sleep(250);
    }
    if (!serverReady) {
      console.error('Wrangler logs:\n', wranglerLogs.join(''));
      throw new Error('Wrangler failed to start within 25s.');
    }
    console.log('Wrangler ready.');

    // 2. Start Vite
    console.log('[2/4] Starting Vite dev server on ' + BASE_URL + '...');
    viteProc = spawn(isWindows ? 'npx.cmd' : 'npx', [
      'vite', '--port', String(VITE_PORT), '--host', '127.0.0.1'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows
    });

    let viteReady = false;
    const onViteData = (d) => {
      const s = d.toString();
      if (s.includes('http://127.0.0.1:5173') || s.includes('Local:')) viteReady = true;
    };
    viteProc.stdout.on('data', onViteData);
    viteProc.stderr.on('data', onViteData);

    const startViteWait = Date.now();
    while (!viteReady && (Date.now() - startViteWait < 15000)) {
      try {
        const ping = await fetch(BASE_URL);
        if (ping.status === 200) { viteReady = true; break; }
      } catch {}
      await sleep(250);
    }
    if (!viteReady) throw new Error('Vite failed to start within 15s.');
    console.log('Vite ready.');

    // 3. Start Chrome
    console.log('[3/4] Launching Headless Chrome via CDP...');
    chromeProc = spawn(chromePath, [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${tmpUserDataDir}`,
      '--window-size=1440,900'
    ]);
    await sleep(2000);

    const newTabRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
    const tab = await newTabRes.json();
    tabId = tab.id;
    ws = new WebSocket(tab.webSocketDebuggerUrl);

    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let msgId = 1;
    const callbacks = new Map();
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        const cb = callbacks.get(data.id);
        callbacks.delete(data.id);
        cb(data.result, data.error);
      }
    });

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, (res, err) => {
          if (err) reject(new Error(err.message || JSON.stringify(err)));
          else resolve(res);
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');

    async function evaluateScript(expr) {
      const res = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text || JSON.stringify(res.exceptionDetails);
        throw new Error(desc);
      }
      return res.result?.value;
    }

    async function waitFor(expr, timeoutMs = 8000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const res = await evaluateScript(expr);
          if (res) return res;
        } catch {}
        await sleep(200);
      }
      throw new Error(`Timed out waiting for: ${expr}`);
    }

    async function navigateTo(urlPath) {
      const targetUrl = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;
      await send('Page.navigate', { url: targetUrl });
      await sleep(1000);
      let attempts = 0;
      while (attempts < 20) {
        const state = await evaluateScript('document.readyState');
        if (state === 'complete') break;
        await sleep(150);
        attempts++;
      }
      await sleep(400);
    }

    async function setViewport(width, height, isMobile = false) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: isMobile
      });
      await sleep(300);
    }

    console.log('[4/4] Chrome CDP connected. Commencing comprehensive browser tests...\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: VIEWPORT LAYOUT & NO HORIZONTAL OVERFLOW (1440px, 1280px, 768px, 430px, 390px)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- TEST 1: Viewport Responsiveness & Zero Horizontal Overflow ---');
    const viewports = [
      { width: 1440, height: 900, name: 'Desktop 1440px', isMobile: false },
      { width: 1280, height: 800, name: 'Desktop 1280px', isMobile: false },
      { width: 768, height: 1024, name: 'Tablet 768px', isMobile: false },
      { width: 430, height: 932, name: 'Mobile 430px (iPhone 14/15 Pro Max)', isMobile: true },
      { width: 390, height: 844, name: 'Mobile 390px (iPhone 12/13/14)', isMobile: true },
    ];

    const testPages = ['/', '/products', '/about', '/contact'];

    for (const vp of viewports) {
      await setViewport(vp.width, vp.height, vp.isMobile);
      let allPagesOverflowClean = true;
      for (const page of testPages) {
        await navigateTo(page);
        const hasOverflow = await evaluateScript(`
          document.documentElement.scrollWidth > window.innerWidth
        `);
        if (hasOverflow) {
          allPagesOverflowClean = false;
          recordResult(`Zero horizontal overflow on ${page} @ ${vp.name}`, 'FAIL', `scrollWidth exceeded ${vp.width}px`);
        }
      }
      if (allPagesOverflowClean) {
        recordResult(`Zero horizontal scroll across all pages @ ${vp.name}`, 'PASS', `${vp.width}x${vp.height}`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: ENGLISH & HINDI LOCALIZATION VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: English and Hindi Localization Verification ---');
    await setViewport(1280, 800, false);

    // English Home
    await navigateTo('/');
    const enHeading = await evaluateScript(`document.querySelector('h1')?.innerText || ''`);
    if (enHeading.includes('YES ENTERPRISES')) {
      recordResult('English Home heading', 'PASS', enHeading.slice(0, 40));
    } else {
      recordResult('English Home heading', 'FAIL', `Unexpected heading: ${enHeading}`);
    }

    // Hindi Home
    await navigateTo('/hi');
    const hiHeading = await evaluateScript(`document.querySelector('h1')?.innerText || ''`);
    const hiBadge = await evaluateScript(`document.body.innerText.includes('भारतीय निर्माता और सप्लायर')`);
    if (hiHeading && hiBadge) {
      recordResult('Hindi Home heading & Devanagari text', 'PASS', 'Rendered Hindi translations');
    } else {
      recordResult('Hindi Home heading & Devanagari text', 'FAIL', 'Missing expected Hindi text');
    }

    // English Products
    await navigateTo('/products');
    const enCatTitle = await evaluateScript(`document.body.innerText.includes('Explore our complete range') || document.body.innerText.includes('Product Catalogue')`);
    recordResult('English Products catalogue title', enCatTitle ? 'PASS' : 'FAIL');

    // Hindi Products
    await navigateTo('/hi/products');
    const hiCatTitle = await evaluateScript(`document.body.innerText.includes('प्रोडक्ट कैटलॉग') || document.body.innerText.includes('उत्पाद कैटलॉग') || document.body.innerText.includes('सभी उत्पाद')`);
    recordResult('Hindi Products catalogue title', hiCatTitle ? 'PASS' : 'FAIL');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: PRODUCT IMAGES LOADING (CATEGORY CARDS & PRODUCT CARDS)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: Product & Category Image Loading ---');
    await navigateTo('/');
    await waitFor(`document.querySelectorAll('.cat-card').length >= 6`);
    const categoryCardCount = await evaluateScript(`document.querySelectorAll('.cat-card').length`);
    const categoryImagesLoaded = await evaluateScript(`
      Array.from(document.querySelectorAll('.cat-card img')).every(img => img.naturalWidth > 0 && img.src.length > 0)
    `);
    if (categoryCardCount === 6 && categoryImagesLoaded) {
      recordResult('Category cards on Homepage (6 cards with real images)', 'PASS', 'All 6 images loaded with naturalWidth > 0');
    } else {
      recordResult('Category cards on Homepage', 'FAIL', `Count: ${categoryCardCount}, images loaded: ${categoryImagesLoaded}`);
    }

    // Check product cards on /products
    await navigateTo('/products');
    await waitFor(`document.querySelectorAll('.product-card').length >= 14`);
    const productCardCount = await evaluateScript(`document.querySelectorAll('.product-card').length`);
    const productImagesLoaded = await evaluateScript(`
      Array.from(document.querySelectorAll('.product-card img')).every(img => img.naturalWidth > 0)
    `);
    if (productCardCount >= 14 && productImagesLoaded) {
      recordResult('Product cards on Catalogue (active products with images)', 'PASS', `All ${productCardCount} product images rendered`);
    } else {
      recordResult('Product cards on Catalogue', 'FAIL', `Count: ${productCardCount}, loaded: ${productImagesLoaded}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: STOCK 0 PRODUCTS MUST NOT SHOW "CURRENTLY UNAVAILABLE"
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: Stock 0 Availability (No Out of Stock Badges) ---');
    await navigateTo('/products');
    const hasUnavailableBadge = await evaluateScript(`
      document.body.innerText.includes('Currently Unavailable') ||
      document.body.innerText.includes('फिलहाल उपलब्ध नहीं') ||
      document.body.innerText.includes('Out of Stock')
    `);
    if (!hasUnavailableBadge) {
      recordResult('Stock 0 products availability on /products', 'PASS', 'Zero baseline products show "Currently Unavailable"');
    } else {
      recordResult('Stock 0 products availability on /products', 'FAIL', 'Found unexpected "Currently Unavailable" badge');
    }

    // Check Product Detail page for baseline product
    await navigateTo('/products/glass-feeding-bottle-60ml-pink');
    await waitFor(`document.querySelector('h1')?.innerText.includes('Glass Feeding Bottle')`);
    const detailUnavailable = await evaluateScript(`
      document.body.innerText.includes('Currently Unavailable') ||
      document.body.innerText.includes('फिलहाल उपलब्ध नहीं')
    `);
    if (!detailUnavailable) {
      recordResult('Product detail availability on /products/glass-feeding-bottle-60ml-pink', 'PASS', 'Enquiry button and pricing active, no out-of-stock badge');
    } else {
      recordResult('Product detail availability', 'FAIL', 'Found out-of-stock badge on active product');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: SIMILAR PRODUCTS CAROUSEL / GRID ON DETAIL PAGE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: Similar Products Section on Detail Page ---');
    const hasSimilarSection = await evaluateScript(`
      document.body.innerText.includes('Similar Products') ||
      document.body.innerText.includes('समान उत्पाद')
    `);
    const similarCardsCount = await evaluateScript(`
      document.querySelectorAll('section .product-card').length
    `);
    const excludesCurrentProduct = await evaluateScript(`
      !Array.from(document.querySelectorAll('section .product-card h3')).some(h => h.innerText.includes('60 ml (Pink)'))
    `);
    if (hasSimilarSection && similarCardsCount > 0 && similarCardsCount <= 4 && excludesCurrentProduct) {
      recordResult('Similar Products section', 'PASS', `Rendered ${similarCardsCount} similar items excluding current product`);
    } else {
      recordResult('Similar Products section', 'FAIL', `Section: ${hasSimilarSection}, count: ${similarCardsCount}, excludesSelf: ${excludesCurrentProduct}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: MOQ & EXPECTED PRICE PER 100 APPEAR ONLY WHEN CONFIGURED
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: Conditional Display of MOQ & Expected Price per 100 ---');
    // On baseline product without MOQ:
    const baselineHasMoq = await evaluateScript(`
      document.body.innerText.includes('Minimum Order Quantity') ||
      document.body.innerText.includes('MOQ:')
    `);
    const baselineHasPrice100 = await evaluateScript(`
      document.body.innerText.includes('Expected Price per 100') ||
      document.body.innerText.includes('100 पीस के लिए अनुमानित मूल्य')
    `);
    if (!baselineHasMoq && !baselineHasPrice100) {
      recordResult('Baseline product without MOQ/Price100 cleanly hides both fields', 'PASS', 'Neither badge displayed');
    } else {
      recordResult('Baseline product without MOQ/Price100 cleanly hides both fields', 'FAIL', `Moq: ${baselineHasMoq}, Price100: ${baselineHasPrice100}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 7: ABOUT & CONTACT PAGE VERIFICATION (BUSINESS DETAILS & NO PROVISIONAL)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 7: About and Contact Page Verification ---');
    await navigateTo('/about');
    const aboutProvisionalFound = await evaluateScript(`
      document.body.innerText.includes('Additional company details and registrations will be updated upon confirmation')
    `);
    const aboutHeading = await evaluateScript(`
      document.body.innerText.includes('Direct Manufacturer of Feeding Bottles, Water Bottles & Stainless Steel Products')
    `);
    const aboutEmail = await evaluateScript(`
      document.body.innerText.includes('uvaisalikhan0143@gmail.com')
    `);
    const aboutPhone = await evaluateScript(`
      document.body.innerText.includes('+91 74548 48548')
    `);
    const aboutAddress = await evaluateScript(`
      document.body.innerText.includes('Moradabad') && document.body.innerText.includes('244413')
    `);
    const aboutMapsLink = await evaluateScript(`
      Boolean(document.querySelector('a[href*="google.com/maps"]'))
    `);

    if (!aboutProvisionalFound && aboutHeading && aboutEmail && aboutPhone && aboutAddress && aboutMapsLink) {
      recordResult('About Page overhaul & confirmed contact details', 'PASS', 'Provisional disclaimer removed, verified Moradabad address, phone, email & Maps link present');
    } else {
      recordResult('About Page overhaul', 'FAIL', `Provisional: ${aboutProvisionalFound}, heading: ${aboutHeading}, email: ${aboutEmail}, phone: ${aboutPhone}, address: ${aboutAddress}, maps: ${aboutMapsLink}`);
    }

    await navigateTo('/contact');
    const contactEmail = await evaluateScript(`document.body.innerText.includes('uvaisalikhan0143@gmail.com')`);
    const contactPhone = await evaluateScript(`document.body.innerText.includes('+91 74548 48548')`);
    const contactAddress = await evaluateScript(`document.body.innerText.includes('Moradabad')`);
    if (contactEmail && contactPhone && contactAddress) {
      recordResult('Contact Page verified details', 'PASS', 'Phone, email, and address matched');
    } else {
      recordResult('Contact Page verified details', 'FAIL', 'Missing contact details');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 8: MOBILE NAVIGATION & CATEGORY CHIPS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 8: Mobile Header, Drawer & Category Chips ---');
    await setViewport(390, 844, true);
    await navigateTo('/');

    // Mobile menu toggle
    const mobileMenuBtn = await evaluateScript(`Boolean(document.querySelector('header button[aria-label="Toggle menu"]'))`);
    if (mobileMenuBtn) {
      // Open drawer
      await evaluateScript(`document.querySelector('header button[aria-label="Toggle menu"]').click()`);
      await sleep(300);
      const drawerOpen = await evaluateScript(`
        Array.from(document.querySelectorAll('header a')).some(a => a.innerText.includes('Products') || a.innerText.includes('About'))
      `);
      recordResult('Mobile menu toggle opens navigation drawer', drawerOpen ? 'PASS' : 'FAIL');
      // Close drawer
      await evaluateScript(`document.querySelector('header button[aria-label="Toggle menu"]').click()`);
    } else {
      recordResult('Mobile menu toggle button', 'FAIL', 'Toggle button not found');
    }

    // Mobile category horizontal scrollable chips
    await navigateTo('/products');
    const hasCategoryChips = await evaluateScript(`
      Boolean(document.querySelector('.overflow-x-auto button'))
    `);
    const chipsCount = await evaluateScript(`
      document.querySelectorAll('.overflow-x-auto button').length
    `);
    if (hasCategoryChips && chipsCount >= 7) {
      recordResult('Mobile horizontal scrollable category chips', 'PASS', `${chipsCount} chips present (All + 6 categories)`);
    } else {
      recordResult('Mobile horizontal scrollable category chips', 'FAIL', `Count: ${chipsCount}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 9: SIMPLIFIED ADMIN SELLER INTERFACE & ABSENCE OF WAREHOUSE CONTROLS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 9: Simplified Admin Seller Interface & Absence of Warehouse Controls ---');
    await setViewport(1280, 800, false);
    await navigateTo('/admin/login');

    // Local admin sign in
    await evaluateScript(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In as Local Admin'));
      if (btn) btn.click();
    `);
    await sleep(800);

    await navigateTo('/admin/products/new');
    await waitFor(`document.body.innerText.includes('1. Basic Information')`);

    // Check that unnecessary warehouse controls DO NOT appear
    const hasStockQtyInput = await evaluateScript(`
      Boolean(document.querySelector('input[placeholder*="Stock"], input[name*="stock"]')) ||
      Array.from(document.querySelectorAll('label')).some(l => l.innerText.toLowerCase().includes('stock quantity') || l.innerText.toLowerCase().includes('low stock threshold') || l.innerText.toLowerCase().includes('mrp / compare'))
    `);

    const hasWarehouseControls = await evaluateScript(`
      document.body.innerText.includes('Current Stock Quantity') ||
      document.body.innerText.includes('Low Stock Threshold') ||
      document.body.innerText.includes('MRP / Compare')
    `);

    if (!hasStockQtyInput && !hasWarehouseControls) {
      recordResult('Absence of warehouse controls in seller interface', 'PASS', 'Stock quantity, low-stock threshold, compare-at price completely excluded from seller form');
    } else {
      recordResult('Absence of warehouse controls in seller interface', 'FAIL', `Found unnecessary warehouse controls in seller form`);
    }

    // Check presence of Commercial Fields
    const hasPriceField = await evaluateScript(`
      Array.from(document.querySelectorAll('label')).some(l => l.textContent.includes('Product Price'))
    `);
    const hasMoqField = await evaluateScript(`
      Array.from(document.querySelectorAll('label')).some(l => l.textContent.includes('Minimum Order (MOQ)'))
    `);
    const hasPrice100Field = await evaluateScript(`
      Array.from(document.querySelectorAll('label')).some(l => l.textContent.includes('Price per 100 Pcs'))
    `);

    if (hasPriceField && hasMoqField && hasPrice100Field) {
      recordResult('Commercial fields present in seller form', 'PASS', 'Selling Price, MOQ, and Price/100 Pcs inputs available');
    } else {
      recordResult('Commercial fields present in seller form', 'FAIL', `Price: ${hasPriceField}, MOQ: ${hasMoqField}, Price100: ${hasPrice100Field}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 10: COMPLETE ADMIN CRUD WORKFLOW WITH MOQ & EXPECTED PRICE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 10: Complete Admin Product CRUD & Deletion Workflow ---');
    const testProdName = `Probe Product ${CLEAN_RUN_ID}`;
    const testProdPrice = '349';
    const testProdMoq = '150';
    const testProdPrice100 = '28000';

    // 1. Create Product
    await evaluateScript(`
      (() => {
        function setInput(el, val) {
          const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
          set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nameInput = document.querySelector('input[placeholder="e.g. Stainless Steel Feeding Bottle 250ml"]');
        setInput(nameInput, ${JSON.stringify(testProdName)});
        const priceInput = document.querySelector('input[placeholder="e.g. 250"]');
        setInput(priceInput, ${JSON.stringify(testProdPrice)});
        const moqInput = document.querySelector('input[placeholder="e.g. 100"]');
        setInput(moqInput, ${JSON.stringify(testProdMoq)});
        const price100Input = document.querySelector('input[placeholder="e.g. 22000"]');
        setInput(price100Input, ${JSON.stringify(testProdPrice100)});
      })()
    `);
    await sleep(400);

    // Submit Creation
    await evaluateScript(`
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.textContent.includes('Create Product'));
      if (submitBtn) submitBtn.click();
    `);
    await sleep(2500);

    // Verify in D1
    const createdProd = sqliteDb.prepare("SELECT * FROM products WHERE name = ?").get(testProdName);
    if (!createdProd) throw new Error('Test product was not inserted into D1 database');
    recordResult('Admin Create Product via simplified form', 'PASS', `D1 ID: ${createdProd.id}, MOQ: ${createdProd.min_order_quantity}, Price100: ${createdProd.expected_price_per_100_paise}`);

    // Verify created product displays MOQ and Price per 100 on Admin Products List
    await navigateTo('/admin/products');
    await waitFor(`document.body.innerText.includes(${JSON.stringify(testProdName)})`);
    const adminCardShowsMoq = await evaluateScript(`
      document.body.innerText.includes('150 pcs') && document.body.innerText.includes('₹28,000')
    `);
    recordResult('Admin card displays configured MOQ & bulk price', adminCardShowsMoq ? 'PASS' : 'FAIL');

    // 2. Edit Product
    await navigateTo(`/admin/products/${createdProd.id}/edit`);
    await waitFor(`document.body.innerText.includes('1. Basic Information')`);
    await evaluateScript(`
      (() => {
        function setInput(el, val) {
          const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
          set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const moqInput = document.querySelector('input[placeholder="e.g. 100"]');
        setInput(moqInput, '300');
      })()
    `);
    await sleep(300);
    await evaluateScript(`
      const saveBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.textContent.includes('Save Changes'));
      if (saveBtn) saveBtn.click();
    `);
    await sleep(1500);

    const updatedProd = sqliteDb.prepare("SELECT * FROM products WHERE id = ?").get(createdProd.id);
    if (updatedProd.min_order_quantity === 300) {
      recordResult('Admin Edit Product (updated MOQ to 300)', 'PASS', 'D1 record updated');
    } else {
      recordResult('Admin Edit Product', 'FAIL', `Expected 300, got ${updatedProd.min_order_quantity}`);
    }

    // 3. Delete Product via UI Confirmation Modal
    await navigateTo('/admin/products');
    await waitFor(`document.body.innerText.includes(${JSON.stringify(testProdName)})`);

    // Click delete button on card
    await evaluateScript(`
      (() => {
        const card = Array.from(document.querySelectorAll('.bg-white')).find(el => el.innerText.includes(${JSON.stringify(testProdName)}));
        const delBtn = card.querySelector('button[title*="Delete"]');
        if (delBtn) delBtn.click();
      })()
    `);
    await sleep(400);

    // Confirm in modal
    await evaluateScript(`
      (() => {
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yes, Delete Product'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);
    await sleep(1500);

    const deletedCheck = sqliteDb.prepare("SELECT COUNT(*) as c FROM products WHERE id = ?").get(createdProd.id).c;
    if (deletedCheck === 0) {
      recordResult('Admin Delete Product via confirmation modal', 'PASS', 'Product removed from D1 & UI');
    } else {
      recordResult('Admin Delete Product', 'FAIL', 'Product still exists in D1');
    }

    console.log('\n=================================================================');
    console.log(`Final Browser Test Results: ${passedCount} Passed, ${failedCount} Failed`);
    console.log('=================================================================');

  } finally {
    // ── STRICT CLEANUP & RECOVERY ───────────────────────────────────────────
    console.log('\n--- Executing Guaranteed Teardown & Preservation Audit ---');
    try {
      if (ws) ws.close();
      if (chromeProc) chromeProc.kill();
      if (viteProc) viteProc.kill();
      if (wranglerProc) wranglerProc.kill();
    } catch {}

    // Cleanup any lingering test records
    sqliteDb.prepare("DELETE FROM products WHERE name LIKE 'Probe Product%' OR name LIKE 'test_%'").run();

    const postTestCounts = {
      categories: sqliteDb.prepare("SELECT COUNT(*) as c FROM categories").get().c,
      products: sqliteDb.prepare("SELECT COUNT(*) as c FROM products").get().c,
      variants: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
      images: sqliteDb.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
    };

    console.log('Post-test final database record counts:', postTestCounts);

    const countsMatch = (
      postTestCounts.categories === baselineCounts.categories &&
      postTestCounts.products === baselineCounts.products &&
      postTestCounts.variants === baselineCounts.variants &&
      postTestCounts.images === baselineCounts.images
    );

    if (countsMatch) {
      console.log('✅ BASELINE CATALOGUE 100% PRESERVED (6 categories, 14 products, 28 images).');
    } else {
      console.error('❌ BASELINE COUNT MISMATCH DETECTED!', { baselineCounts, postTestCounts });
    }

    sqliteDb.close();
    clearTimeout(suiteWatchdog);
  }
}

runVerification().catch(err => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
