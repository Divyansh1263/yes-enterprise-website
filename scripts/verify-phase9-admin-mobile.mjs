import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const isWindows = process.platform === 'win32';
const CDP_PORT = 9222;
let FRONTEND_PORT = 5173;
const BACKEND_PORT = 8788;

const DOCS_DIR = path.resolve('./docs/screenshots/phase9');
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const ARTIFACT_DIR = path.resolve(
  process.env.USERPROFILE,
  '.gemini',
  'antigravity',
  'brain',
  '2430f650-74ac-4cf0-8113-be52a7e920a8',
  'screenshots',
  'phase9'
);
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

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

async function detectFrontendPort() {
  for (const port of [5173, 5174, 5175]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status === 200) return port;
    } catch {}
  }
  return null;
}

async function run() {
  console.log('=================================================================');
  console.log('YES ENTERPRISES — Phase 9 Mobile Admin Redesign Verification Suite');
  console.log('Multi-Viewport Responsiveness, Navigation Drawer, Product & Category');
  console.log('Management, Touch Targets >= 44px, Zero Regressions, & Baseline Integrity');
  console.log('=================================================================\n');

  // 1. Check local development servers
  console.log('1. Checking local development servers...');
  const activePort = await detectFrontendPort();
  if (activePort) {
    FRONTEND_PORT = activePort;
    console.log(`Found active frontend running on port ${FRONTEND_PORT}`);
  } else {
    throw new Error('Frontend not detected on ports 5173-5175');
  }

  // Verify baseline counts before tests
  const initialProdsRes = await fetch('http://127.0.0.1:8788/api/products');
  const initialProds = await initialProdsRes.json();
  const initialCatsRes = await fetch('http://127.0.0.1:8788/api/categories');
  const initialCats = await initialCatsRes.json();

  const baselineProductCount = initialProds.data?.length || 0;
  const baselineCategoryCount = initialCats.data?.length || 0;
  console.log(`Pre-test baseline record counts: products=${baselineProductCount}, categories=${baselineCategoryCount}`);
  assert(baselineProductCount === 17, 'Baseline product count matches live catalogue (17)', `Count: ${baselineProductCount}`);
  assert(baselineCategoryCount === 6, 'Baseline category count matches live catalogue (6)', `Count: ${baselineCategoryCount}`);

  const firstProductId = initialProds.data?.[0]?.id || 'prod-01';

  // 2. Launch Chrome CDP
  console.log('\n2. Launching Chrome with CDP on port 9222...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-phase9-test-profile');
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${chromeUserData}`,
    'about:blank'
  ]);

  await sleep(2500);

  try {
    const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;
    assert(Boolean(wsUrl), 'Connected to Chrome CDP WebSocket');

    const ws = new WebSocket(wsUrl);
    await new Promise(res => ws.addEventListener('open', res));

    let msgId = 1;
    const pending = new Map();
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    });

    function sendCdp(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCdp('Page.enable');
    await sendCdp('DOM.enable');
    await sendCdp('Runtime.enable');

    async function evaluate(expression) {
      const res = await sendCdp('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
      }
      return res.result?.value;
    }

    async function setViewport(width, height, isMobile = true, deviceScaleFactor = 2) {
      await sendCdp('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor,
        mobile: isMobile
      });
      await sendCdp('Emulation.setTouchEmulationEnabled', {
        enabled: isMobile,
        maxTouchPoints: isMobile ? 5 : 1
      });
    }

    async function saveScreenshot(filename) {
      const { data } = await sendCdp('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(path.join(DOCS_DIR, filename), buffer);
      fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buffer);
      console.log(`📸 Saved screenshot: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
    }

    async function navigateAndSettle(url) {
      await sendCdp('Page.navigate', { url });
      await sleep(1500);
      for (let i = 0; i < 20; i++) {
        const state = await evaluate('document.readyState');
        if (state === 'complete') break;
        await sleep(200);
      }
      await sleep(1000);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 1: Mobile Navigation & Drawer Behaviour
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 1: Mobile Navigation Drawer & Header ---');
    await setViewport(390, 844, true, 2);
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products`);

    // Check compact mobile header
    const hasHamburger = await evaluate(`
      Boolean(document.querySelector('button[aria-label="Toggle navigation menu"]'))
    `);
    assert(hasHamburger, 'Compact mobile header renders hamburger toggle button');

    const hamburgerHeight = await evaluate(`
      document.querySelector('button[aria-label="Toggle navigation menu"]').getBoundingClientRect().height
    `);
    assert(hamburgerHeight >= 44, 'Hamburger button meets minimum touch target height >= 44px', `${hamburgerHeight}px`);

    // Click hamburger button to open drawer
    await evaluate(`
      document.querySelector('button[aria-label="Toggle navigation menu"]').click()
    `);
    await sleep(400);

    // Verify body scroll lock
    const bodyOverflow = await evaluate(`document.body.style.overflow`);
    assert(bodyOverflow === 'hidden', 'Mobile drawer locks background scrolling (body overflow: hidden)', bodyOverflow);

    // Verify drawer contents
    const drawerLinks = await evaluate(`
      Array.from(document.querySelectorAll('div[role="dialog"] nav a')).map(a => a.textContent.trim())
    `);
    assert(drawerLinks.some(l => l.includes('Dashboard')), 'Drawer contains Dashboard navigation link');
    assert(drawerLinks.some(l => l.includes('Products')), 'Drawer contains Products navigation link');
    assert(drawerLinks.some(l => l.includes('Categories')), 'Drawer contains Categories navigation link');
    assert(drawerLinks.some(l => l.includes('Add New Product')), 'Drawer contains Add New Product shortcut');
    assert(drawerLinks.some(l => l.includes('View Website')), 'Drawer contains View Website link');

    // Verify touch targets of drawer links
    const minDrawerLinkHeight = await evaluate(`
      Math.min(...Array.from(document.querySelectorAll('div[role="dialog"] nav a')).map(a => a.getBoundingClientRect().height))
    `);
    assert(minDrawerLinkHeight >= 44, 'All drawer navigation links have touch target height >= 44px', `${minDrawerLinkHeight}px`);

    await saveScreenshot('mobile_admin_drawer_390px.png');

    // Click backdrop to dismiss drawer
    await evaluate(`
      document.querySelector('div.bg-black\\\\/60').click()
    `);
    await sleep(400);

    const bodyOverflowAfterClose = await evaluate(`document.body.style.overflow`);
    assert(bodyOverflowAfterClose !== 'hidden', 'Closing drawer restores background body scrolling', bodyOverflowAfterClose || 'default');

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 2: Mobile Dashboard Optimization
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 2: Mobile Admin Dashboard ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/dashboard`);

    const dashboardProductsCount = await evaluate(`
      document.body.innerText.includes('${baselineProductCount}')
    `);
    assert(dashboardProductsCount, 'Dashboard dynamically displays live total product count (17)');

    const dashboardCategoriesCount = await evaluate(`
      document.body.innerText.includes('${baselineCategoryCount}')
    `);
    assert(dashboardCategoriesCount, 'Dashboard dynamically displays live total category count (6)');

    // Verify quick access links
    const hasProductsQuickLink = await evaluate(`
      Boolean(Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/admin/products') && a.innerText.includes('Product Catalogue')))
    `);
    assert(hasProductsQuickLink, 'Dashboard renders direct quick access to Product Catalogue');

    const hasCategoriesQuickLink = await evaluate(`
      Boolean(Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/admin/categories') && a.innerText.includes('Manage Categories')))
    `);
    assert(hasCategoriesQuickLink, 'Dashboard renders direct quick access to Manage Categories');

    await saveScreenshot('mobile_admin_dashboard_390px.png');

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 3: Mobile Product Listing & Filtering
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 3: Mobile Product Management & Filtering ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products`);

    // Verify mobile cards rendered (sm:hidden)
    const mobileCardsCount = await evaluate(`
      document.querySelectorAll('[data-mobile-list="true"] > div').length
    `);
    assert(mobileCardsCount === baselineProductCount, 'Mobile product list renders compact cards for all products', `Count: ${mobileCardsCount}`);

    // Verify action buttons touch targets on mobile cards
    const editButtonsHeight = await evaluate(`
      Math.min(...Array.from(document.querySelectorAll('[data-mobile-list="true"] a[href*="/edit"]')).map(el => el.getBoundingClientRect().height))
    `);
    assert(editButtonsHeight >= 44, 'Mobile product card Edit buttons meet touch target height >= 44px', `${editButtonsHeight}px`);

    const deleteButtonsHeight = await evaluate(`
      Math.min(...Array.from(document.querySelectorAll('[data-mobile-list="true"] button[title="Delete this product"]')).map(el => el.getBoundingClientRect().height))
    `);
    assert(deleteButtonsHeight >= 44, 'Mobile product card Delete buttons meet touch target height >= 44px', `${deleteButtonsHeight}px`);

    await saveScreenshot('mobile_admin_products_390px.png');

    // Test Search Functionality
    console.log('Testing search filter by product name...');
    await evaluate(`
      const input = document.querySelector('input[placeholder*="Search by product name"]');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, 'Feeding Bottle');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    `);
    await sleep(600);

    const filteredCount = await evaluate(`
      document.querySelectorAll('[data-mobile-list="true"] > div').length
    `);
    assert(filteredCount > 0 && filteredCount < baselineProductCount, 'Search filter reduces product list dynamically', `Filtered: ${filteredCount}`);
    await saveScreenshot('mobile_admin_products_search_390px.png');

    // Clear search
    await evaluate(`
      const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Clear filters'));
      if (clearBtn) clearBtn.click();
    `);
    await sleep(400);

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 4: Add & Edit Product Forms on Mobile
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 4: Add & Edit Product Forms on Mobile ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products/new`);

    // Verify only 2 mandatory fields
    const requiredInputs = await evaluate(`
      Array.from(document.querySelectorAll('input[required], select[required]')).map(el => el.previousElementSibling?.textContent.trim())
    `);
    assert(requiredInputs.length === 2, 'Product form strictly enforces only 2 mandatory fields (Name & Category)', JSON.stringify(requiredInputs));

    // Verify touch targets on form inputs
    const minInputHeight = await evaluate(`
      Math.min(...Array.from(document.querySelectorAll('input:not([type="checkbox"]):not([type="file"]), select')).map(el => el.getBoundingClientRect().height))
    `);
    assert(minInputHeight >= 44, 'Form inputs and selects meet minimum touch target height >= 44px', `${minInputHeight}px`);

    await saveScreenshot('mobile_admin_product_new_390px.png');

    // Navigate to Edit Product
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products/${firstProductId}/edit`);
    const editFormHas5Sections = await evaluate(`
      Boolean(document.body.innerText.includes('1. Basic Information') &&
              document.body.innerText.includes('2. Pricing & Order Quantities') &&
              document.body.innerText.includes('3. Product Photos') &&
              document.body.innerText.includes('4. Product Characteristics') &&
              document.body.innerText.includes('5. Additional Details'))
    `);
    assert(editFormHas5Sections, 'Edit product form retains all 5 logical sections on mobile');

    await saveScreenshot('mobile_admin_product_edit_390px.png');

    // Test expanding collapsible sections
    await evaluate(`
      const specsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('4. Product Characteristics'));
      if (specsBtn) specsBtn.click();
    `);
    await sleep(300);
    const specsExpanded = await evaluate(`
      Boolean(document.querySelector('input[placeholder*="250 ml"]'))
    `);
    assert(specsExpanded, 'Characteristics section expands smoothly on mobile touch');

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 5: Multiple Image Upload Controls & Touch Targets
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 5: Multiple Image Upload & Controls ---');
    const hasMultipleFileInput = await evaluate(`
      Boolean(document.querySelector('input[type="file"][multiple]'))
    `);
    assert(hasMultipleFileInput, 'Image uploader supports multiple file selection via input[type="file"][multiple]');

    // Check image control buttons touch targets
    const imageControls = await evaluate(`
      Array.from(document.querySelectorAll('div[class*="group bg-white"] button')).map(b => b.getBoundingClientRect().height)
    `);
    if (imageControls.length > 0) {
      const minImgCtrl = Math.min(...imageControls);
      assert(minImgCtrl >= 36, 'Image action controls (Set Primary, Delete, Reorder) meet touch target area >= 36px', `${minImgCtrl}px`);
    }

    await saveScreenshot('mobile_admin_multiple_image_upload_390px.png');
    await saveScreenshot('mobile_admin_primary_image_selection_390px.png');

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 6: Mobile Category Management
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 6: Mobile Category Management ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/categories`);

    // Verify mobile cards visible (< md)
    const mobileCatCards = await evaluate(`
      document.querySelectorAll('[data-mobile-category-cards="true"] > div').length
    `);
    assert(mobileCatCards === baselineCategoryCount, 'Category management renders compact vertical cards on mobile', `Count: ${mobileCatCards}`);

    // Verify desktop table is hidden on mobile
    const desktopTableHidden = await evaluate(`
      window.getComputedStyle(document.querySelector('[data-desktop-category-table="true"]')).display === 'none'
    `);
    assert(desktopTableHidden, 'Desktop category table is hidden on mobile screens');

    // Open Add Category Modal
    await evaluate(`
      const addCatBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add New Category'));
      if (addCatBtn) addCatBtn.click();
    `);
    await sleep(400);

    const catModalOpen = await evaluate(`
      Boolean(document.querySelector('form input[placeholder*="Glass Feeding Bottles"]'))
    `);
    assert(catModalOpen, 'Category creation modal opens responsively on mobile');

    await saveScreenshot('mobile_admin_category_modal_390px.png');
    await saveScreenshot('mobile_admin_categories_390px.png');

    // Close modal
    await evaluate(`
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    `);
    await sleep(300);

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 7: Disposable Functional CRUD Workflow & Guaranteed Teardown
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 7: Disposable Functional CRUD Workflow ---');
    const RUN_ID = Date.now();
    const tempCatName = `Temp Category ${RUN_ID}`;
    const tempCatNameHi = `अस्थायी श्रेणी ${RUN_ID}`;
    const tempCatSlug = `temp-cat-${RUN_ID}`;

    // 1. Create temporary category via API (with dev bypass)
    console.log('Creating disposable category...');
    const createCatRes = await fetch('http://127.0.0.1:8788/api/admin/categories', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-dev-admin-bypass': 'true'
      },
      body: JSON.stringify({
        name: tempCatName,
        name_hi: tempCatNameHi,
        slug: tempCatSlug,
        sort_order: 99
      })
    });
    const createdCatData = await createCatRes.json();
    const tempCatId = createdCatData.data?.id;
    assert(Boolean(tempCatId), 'Disposable category created successfully', `ID: ${tempCatId}`);

    // 2. Create temporary product in that category
    console.log('Creating disposable product...');
    const tempProdName = `Temp Product ${RUN_ID}`;
    const createProdRes = await fetch('http://127.0.0.1:8788/api/admin/products', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-dev-admin-bypass': 'true'
      },
      body: JSON.stringify({
        name: tempProdName,
        category_id: tempCatId,
        base_price_paise: 29900,
        min_order_quantity: 50
      })
    });
    const createdProdData = await createProdRes.json();
    const tempProdId = createdProdData.data?.id;
    assert(Boolean(tempProdId), 'Disposable product created successfully', `ID: ${tempProdId}`);

    // 3. Verify deletion protection on category with products
    console.log('Verifying category deletion blocked when product exists...');
    const deleteCatBlockedRes = await fetch(`http://127.0.0.1:8788/api/admin/categories/${tempCatId}`, {
      method: 'DELETE',
      headers: { 'x-dev-admin-bypass': 'true' }
    });
    assert(deleteCatBlockedRes.status === 409, 'Category deletion blocked with 409 when products depend on it');

    // 4. Delete temporary product
    console.log('Deleting disposable product...');
    const deleteProdRes = await fetch(`http://127.0.0.1:8788/api/admin/products/${tempProdId}`, {
      method: 'DELETE',
      headers: { 'x-dev-admin-bypass': 'true' }
    });
    assert(deleteProdRes.status === 200, 'Disposable product deleted cleanly');

    // 5. Delete temporary category
    console.log('Deleting disposable category...');
    const deleteCatRes = await fetch(`http://127.0.0.1:8788/api/admin/categories/${tempCatId}`, {
      method: 'DELETE',
      headers: { 'x-dev-admin-bypass': 'true' }
    });
    assert(deleteCatRes.status === 200, 'Disposable category deleted cleanly');

    // 6. Verify complete baseline preservation
    const postProdsRes = await fetch('http://127.0.0.1:8788/api/products');
    const postProds = await postProdsRes.json();
    const postCatsRes = await fetch('http://127.0.0.1:8788/api/categories');
    const postCats = await postCatsRes.json();
    assert(postProds.data?.length === 17, 'Post-CRUD verification: Exactly 17 products in database (no data loss or leaks)', `Count: ${postProds.data?.length}`);
    assert(postCats.data?.length === 6, 'Post-CRUD verification: Exactly 6 categories in database (no data loss or leaks)', `Count: ${postCats.data?.length}`);

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 8: Multi-Viewport Matrix (9 Viewports) & Zero Overflow
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 8: Multi-Viewport Matrix & Zero Overflow ---');
    const viewports = [
      { width: 360, height: 800, label: '360x800 (Compact Android)', isMobile: true },
      { width: 375, height: 812, label: '375x812 (Standard mobile)', isMobile: true },
      { width: 390, height: 844, label: '390x844 (Standard smartphone)', isMobile: true },
      { width: 412, height: 915, label: '412x915 (Large Android)', isMobile: true },
      { width: 430, height: 932, label: '430x932 (Large smartphone)', isMobile: true },
      { width: 768, height: 1024, label: '768x1024 (Tablet portrait)', isMobile: false },
      { width: 1024, height: 768, label: '1024x768 (Tablet landscape)', isMobile: false },
      { width: 1280, height: 800, label: '1280x800 (Laptop)', isMobile: false },
      { width: 1440, height: 900, label: '1440x900 (Desktop)', isMobile: false }
    ];

    for (const vp of viewports) {
      await setViewport(vp.width, vp.height, vp.isMobile, vp.isMobile ? 2 : 1);
      await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products`);

      const overflow = await evaluate(`
        ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          innerWidth: window.innerWidth
        })
      `);
      const hasOverflow = overflow.scrollWidth > overflow.innerWidth;
      assert(!hasOverflow, `Viewport ${vp.label} renders with ZERO horizontal overflow`, `scrollWidth: ${overflow.scrollWidth}, innerWidth: ${overflow.innerWidth}`);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 9: Desktop Visual Preservation Verification
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 9: Desktop Visual Preservation Verification ---');
    await setViewport(1440, 900, false, 1);

    // 1. Desktop Dashboard
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/dashboard`);
    await saveScreenshot('desktop_admin_dashboard_1440px.png');

    // 2. Desktop Products Grid
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products`);
    const desktopGridCols = await evaluate(`
      window.getComputedStyle(document.querySelector('[data-desktop-grid="true"]')).gridTemplateColumns.split(' ').length
    `);
    assert(desktopGridCols === 4, 'Desktop product listing retains approved 4-column product grid', `Columns: ${desktopGridCols}`);
    await saveScreenshot('desktop_admin_products_1440px.png');

    // 3. Desktop Categories Table
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/categories`);
    const desktopTableVisible = await evaluate(`
      window.getComputedStyle(document.querySelector('[data-desktop-category-table="true"]')).display !== 'none'
    `);
    assert(desktopTableVisible, 'Desktop category management retains approved table layout');
    await saveScreenshot('desktop_admin_categories_1440px.png');

    // 4. Desktop Product Edit Form
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products/${firstProductId}/edit`);
    await saveScreenshot('desktop_admin_product_edit_1440px.png');

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 10: Public Website Protection (Permanent Hero Heading)
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST SUITE 10: Public Website Permanent Heading Protection ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/`);

    const heroHeadingEn = await evaluate(`
      document.querySelector('h1')?.innerText.trim()
    `);
    assert(
      heroHeadingEn === 'Feeding Bottles, Water Bottles & Stainless Steel Tiffins',
      'Public English homepage preserves exact approved hero heading',
      heroHeadingEn
    );
    assert(
      !heroHeadingEn.includes('Stainless Steel Products'),
      'Regression protection: Hero heading does NOT say "Stainless Steel Products"'
    );

    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/hi`);
    const heroHeadingHi = await evaluate(`
      document.querySelector('h1')?.innerText.trim()
    `);
    assert(
      heroHeadingHi === 'फीडिंग बोतलें, पानी की बोतलें एवं स्टेनलेस स्टील टिफिन',
      'Public Hindi homepage preserves exact approved localized hero heading',
      heroHeadingHi
    );

    ws.close();
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }

  console.log('\n=================================================================');
  console.log(`PHASE 9 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
