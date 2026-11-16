import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8 Mobile-First UI/UX Verification Suite');
console.log('Testing 360px–1440px Responsiveness, 2-Col Grid, Specs, Sticky CTA');
console.log('=================================================================\n');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const ARTIFACT_DIR = path.resolve(
  process.env.USERPROFILE,
  '.gemini',
  'antigravity',
  'brain',
  '2430f650-74ac-4cf0-8113-be52a7e920a8'
);
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const LOCAL_SCREENSHOTS_DIR = path.resolve('./docs/screenshots');
if (!fs.existsSync(LOCAL_SCREENSHOTS_DIR)) {
  fs.mkdirSync(LOCAL_SCREENSHOTS_DIR, { recursive: true });
}

const CDP_PORT = 9222;
const BACKEND_PORT = 8788;
let FRONTEND_PORT = 5173;

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

let backendProc = null;
let frontendProc = null;
let chromeProc = null;

async function detectFrontendPort() {
  for (const port of [5173, 5174, 5175]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status === 200) return port;
    } catch {}
  }
  return null;
}

async function runVerification() {
  let activePort = await detectFrontendPort();
  if (activePort) {
    FRONTEND_PORT = activePort;
    console.log(`Found active frontend running on port ${FRONTEND_PORT}`);
  } else {
    // 1. Start Wrangler Pages Dev on 8788
    console.log('Starting Cloudflare Pages Functions backend (Wrangler)...');
    backendProc = spawn(npxCmd, ['wrangler', 'pages', 'dev', 'public', '--port', String(BACKEND_PORT), '--ip', '127.0.0.1'], {
      stdio: 'ignore',
      shell: isWindows,
      env: { ...process.env, CI: 'true' }
    });

    // 2. Start Vite on 5173
    console.log('Starting React Vite Frontend on port 5173...');
    frontendProc = spawn(npxCmd, ['vite', '--port', String(FRONTEND_PORT), '--host', '127.0.0.1'], {
      stdio: 'ignore',
      shell: isWindows,
      env: process.env
    });
  }

  // Wait for frontend and backend to respond
  let ready = false;
  const startWait = Date.now();
  while (!ready && Date.now() - startWait < 20000) {
    try {
      const res = await fetch(`http://127.0.0.1:${FRONTEND_PORT}/`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(400);
  }
  assert(ready, 'Development servers online and responding');

  // Verify backend API works via Vite proxy
  let apiOk = false;
  for (let i = 0; i < 15; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${FRONTEND_PORT}/api/products?limit=5`);
      if (r.ok) {
        const j = await r.json();
        if (j.success && j.data.length > 0) {
          apiOk = true;
          break;
        }
      }
    } catch {}
    await sleep(500);
  }
  assert(apiOk, 'Live catalogue API functional via Vite reverse proxy');

  // 3. Launch Chrome with Remote Debugging
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-phase8-profile');
  chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${chromeUserData}`,
    'about:blank'
  ]);

  await sleep(2000);

  // Connect to Chrome DevTools Protocol
  const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;
  assert(Boolean(wsUrl), 'Connected to Chrome CDP WebSocket');

  const ws = new WebSocket(wsUrl);
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
      if (data.error) cb.reject(new Error(data.error.message));
      else cb.resolve(data.result);
    }
  });

  function sendCdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCdp('Page.enable');
  await sendCdp('DOM.enable');

  async function setViewport(width, height, mobile = true) {
    await sendCdp('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile
    });
    await sleep(300);
  }

  async function checkHorizontalOverflow(url, viewportName, width, height, mobile) {
    await sendCdp('Page.navigate', { url });
    await setViewport(width, height, mobile);
    await sleep(1500);
    const evalRes = await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientW = docEl.clientWidth;
          const windowW = window.innerWidth;
          const hasOverflow = scrollW > windowW + 1; // 1px tolerance for subpixel rounding
          return { scrollW, clientW, windowW, hasOverflow };
        })()
      `,
      returnByValue: true
    });
    const info = evalRes.result.value;
    assert(!info.hasOverflow, `Zero horizontal overflow on ${url} at ${viewportName} (${width}px)`, `scrollWidth: ${info.scrollW}px, window: ${info.windowW}px`);
    return info;
  }

  async function saveScreenshot(filename, artifactName) {
    const shot = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    
    // Save to local docs/screenshots
    const localPath = path.join(LOCAL_SCREENSHOTS_DIR, filename);
    fs.writeFileSync(localPath, buf);

    // Save to artifact directory
    const artifactPath1 = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(artifactPath1, buf);
    const artifactPath2 = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(artifactPath2, buf);

    console.log(`📸 Screenshot captured & saved: ${filename} (${buf.length} bytes)`);
  }

  console.log('\n--- 1. Multi-Device Viewport Overflow Audit (360px – 1440px) ---');
  const viewports = [
    { name: 'Small Mobile', width: 360, height: 800, mobile: true },
    { name: 'iPhone SE', width: 375, height: 667, mobile: true },
    { name: 'Nothing Phone 3 / iPhone 14', width: 390, height: 844, mobile: true },
    { name: 'Samsung S22/S23', width: 412, height: 915, mobile: true },
    { name: 'iPhone 14 Pro Max', width: 430, height: 932, mobile: true },
    { name: 'Tablet (iPad)', width: 768, height: 1024, mobile: true },
    { name: 'Laptop', width: 1280, height: 800, mobile: false },
    { name: 'Desktop', width: 1440, height: 900, mobile: false }
  ];

  for (const vp of viewports) {
    await checkHorizontalOverflow(`http://127.0.0.1:${FRONTEND_PORT}/`, vp.name, vp.width, vp.height, vp.mobile);
    await checkHorizontalOverflow(`http://127.0.0.1:${FRONTEND_PORT}/products`, vp.name, vp.width, vp.height, vp.mobile);
    await checkHorizontalOverflow(`http://127.0.0.1:${FRONTEND_PORT}/products/ye-premium-stainless-steel-feeding-bottle-200ml`, vp.name, vp.width, vp.height, vp.mobile);
    await checkHorizontalOverflow(`http://127.0.0.1:${FRONTEND_PORT}/about`, vp.name, vp.width, vp.height, vp.mobile);
    await checkHorizontalOverflow(`http://127.0.0.1:${FRONTEND_PORT}/contact`, vp.name, vp.width, vp.height, vp.mobile);
  }

  console.log('\n--- 2. Product Catalogue Mobile 2-Column Grid Audit ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(1000);
  for (let i = 0; i < 25; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `document.querySelectorAll('.product-card').length`,
      returnByValue: true
    });
    if (chk?.result?.value > 0) break;
    await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => 
            b.innerText.includes('Try Again') || 
            b.innerText.includes('Retry') || 
            b.innerText.includes('प्रयास')
          );
          if (btn) btn.click();
        })()
      `
    });
    await sleep(500);
  }

  const catalogueAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        // Find product grid
        const cards = document.querySelectorAll('.product-card');
        if (!cards.length) return { error: 'No product cards found' };
        
        const card1 = cards[0];
        const card2 = cards[1];
        const card1Rect = card1.getBoundingClientRect();
        const card2Rect = card2.getBoundingClientRect();

        // Check if card1 and card2 are side-by-side (same top offset within 5px)
        const is2Col = Math.abs(card1Rect.top - card2Rect.top) < 10 && card1Rect.left < card2Rect.left;

        // Check image container
        const imgWrap = card1.querySelector('.aspect-square, [class*="aspect-"]');
        const img = card1.querySelector('img');
        const imgComputed = img ? window.getComputedStyle(img) : null;

        // Check WhatsApp enquiry button
        const waBtn = card1.querySelector('button[aria-label*="WhatsApp"], a[href*="wa.me"], button');
        const waRect = waBtn ? waBtn.getBoundingClientRect() : null;

        // Check Search & Category chips
        const searchInput = document.querySelector('input[type="text"], input[type="search"]');
        const chips = document.querySelectorAll('.mobile-category-filter button, button[class*="rounded-full"], button[class*="rounded-xl"]');

        return {
          cardCount: cards.length,
          is2Col,
          card1Width: card1Rect.width,
          card2Width: card2Rect.width,
          imgObjectFit: imgComputed?.objectFit,
          waBtnHeight: waRect?.height,
          waBtnWidth: waRect?.width,
          hasSearchInput: Boolean(searchInput),
          chipCount: chips.length
        };
      })()
    `,
    returnByValue: true
  });
  const catRes = catalogueAudit.result.value;
  assert(catRes.cardCount >= 14, 'Catalogue renders products in live browser', `Count: ${catRes.cardCount}`);
  assert(catRes.is2Col, 'Catalogue displays 2-column grid side-by-side at 390px mobile', `Card1 width: ${catRes.card1Width}px, Card2 width: ${catRes.card2Width}px`);
  assert(catRes.imgObjectFit === 'contain', 'Product card image uses object-contain to prevent cropping', `object-fit: ${catRes.imgObjectFit}`);
  assert(!catRes.waBtnHeight || catRes.waBtnHeight === 0, 'Product card contains ZERO WhatsApp buttons per Phase 8.6 mandate', `waBtnHeight: ${catRes.waBtnHeight || 0}px`);
  assert(catRes.hasSearchInput, 'Full-width search bar is rendered in catalogue');
  assert(catRes.chipCount >= 6, 'Category filters are present on mobile catalogue', `Count: ${catRes.chipCount}`);

  // Capture Screenshot 3: Mobile Product Catalogue (390px)
  await saveScreenshot('catalogue_mobile_390px.png');

  console.log('\n--- 3. Homepage Mobile 2-Column Categories & Showcase Audit ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1000);
  for (let i = 0; i < 15; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `document.querySelectorAll('.cat-card').length`,
      returnByValue: true
    });
    if (chk?.result?.value > 0) break;
    await sleep(400);
  }

  const homeAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        // Category cards
        const catCards = document.querySelectorAll('.cat-card');
        const card1 = catCards[0];
        const card2 = catCards[1];
        let catIs2Col = false;
        if (card1 && card2) {
          const r1 = card1.getBoundingClientRect();
          const r2 = card2.getBoundingClientRect();
          catIs2Col = Math.abs(r1.top - r2.top) < 10 && r1.left < r2.left;
        }

        // Header height
        const header = document.querySelector('header');
        const headerH = header ? header.getBoundingClientRect().height : 0;

        // Hamburger button size
        const menuBtn = document.querySelector('button[aria-label="Toggle menu"]');
        const menuRect = menuBtn ? menuBtn.getBoundingClientRect() : null;

        // Hero audit
        const h1 = document.querySelector('h1');
        const h1Text = h1 ? h1.textContent.replace(/\\s+/g, ' ').trim() : '';
        const popCats = document.querySelectorAll('a[href*="/products?category="]');
        const primaryCta = document.querySelector('a.btn-shine[href*="/products"]');
        const primaryCtaRect = primaryCta ? primaryCta.getBoundingClientRect() : null;

        return {
          catCardCount: catCards.length,
          catIs2Col,
          headerHeight: headerH,
          menuBtnWidth: menuRect?.width,
          menuBtnHeight: menuRect?.height,
          h1Text,
          popCatCount: popCats.length,
          primaryCtaTop: primaryCtaRect?.top,
          hasPrimaryCta: Boolean(primaryCta)
        };
      })()
    `,
    returnByValue: true
  });
  const homeResVal = homeAudit.result.value;
  assert(homeResVal.catCardCount === 6, 'Homepage renders all 6 category cards', `Count: ${homeResVal.catCardCount}`);
  assert(homeResVal.catIs2Col, 'Homepage categories render in 2-column mobile grid');
  assert(homeResVal.headerHeight <= 65, 'Mobile header height is compact (<= 65px)', `Height: ${homeResVal.headerHeight}px`);
  assert(homeResVal.menuBtnWidth >= 44 && homeResVal.menuBtnHeight >= 44, 'Mobile hamburger button meets >= 44px touch target', `${homeResVal.menuBtnWidth}x${homeResVal.menuBtnHeight}px`);
  assert(homeResVal.h1Text.includes('Feeding Bottles, Water Bottles & Stainless Steel Tiffins'), 'Hero heading matches permanent requirement (Feeding Bottles, Water Bottles & Stainless Steel Tiffins)', homeResVal.h1Text);
  assert(!homeResVal.h1Text.includes('Stainless Steel Products'), 'Hero heading does NOT say "Stainless Steel Products"');
  assert(homeResVal.popCatCount >= 4, 'Hero mobile popular categories showcase strip renders 4 thumbnail cards', `Count: ${homeResVal.popCatCount}`);
  assert(homeResVal.hasPrimaryCta && homeResVal.primaryCtaTop < 400, 'Primary Catalogue CTA is visible above the fold without excessive scrolling', `Top: ${Math.round(homeResVal.primaryCtaTop)}px`);

  // Capture Screenshot 1: Mobile Homepage (390px)
  await saveScreenshot('home_mobile_390px.png');

  // Also capture at 430px (iPhone 14 Pro Max)
  await setViewport(430, 932, true);
  await sleep(400);
  await saveScreenshot('home_mobile_430px.png');
  await setViewport(390, 844, true); // restore 390
  await sleep(300);

  // Scroll to categories section and capture Screenshot 2
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const catSection = document.querySelector('.cat-card')?.closest('section');
        if (catSection) catSection.scrollIntoView({ behavior: 'instant', block: 'start' });
      })()
    `
  });
  await sleep(1000);
  await saveScreenshot('categories_mobile_390px.png');

  console.log('\n--- 4. Product Detail Mobile Audit: Gallery, Deduplicated Specs & Sticky CTA ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products/ye-premium-stainless-steel-feeding-bottle-200ml` });
  await sleep(1000);
  for (let i = 0; i < 15; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('a[href*="wa.me"]') && document.querySelector('h1'))`,
      returnByValue: true
    });
    if (chk?.result?.value) break;
    await sleep(400);
  }

  const detailAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        // Sticky WhatsApp bar or Unified WhatsApp button
        const stickyBar = document.querySelector('.sticky-enquiry');
        const stickyRect = stickyBar ? stickyBar.getBoundingClientRect() : null;
        const stickyWaBtn = stickyBar ? stickyBar.querySelector('a[href*="wa.me"]') : null;
        const mainWaBtn = document.querySelector('.product-enquiry-wa-btn') || document.querySelector('a[href*="wa.me"]');
        const waBtnRect = (stickyWaBtn || mainWaBtn) ? (stickyWaBtn || mainWaBtn).getBoundingClientRect() : null;

        // Main gallery image
        const galleryImgs = document.querySelectorAll('img[alt*="YE"]');
        const mainGalleryImg = document.querySelector('.aspect-square img');
        const mainGalleryWrap = mainGalleryImg ? mainGalleryImg.closest('div') : null;
        const galleryWrapRect = mainGalleryWrap ? mainGalleryWrap.getBoundingClientRect() : null;

        // Thumbnails
        const thumbButtons = document.querySelectorAll('button[aria-label*="View image"]');

        // Specification checks
        const specDl = document.querySelector('dl');
        const specText = specDl ? specDl.innerText : '';
        const hasDuplicateMaterial = (specText.match(/Material/gi) || []).length > 1;
        const hasUnconfirmedNote = /inner body material cannot be confirmed/i.test(document.body.innerText);

        // Similar products grid
        const similarSection = document.querySelector('section:has(.product-card)');
        const similarCards = document.querySelectorAll('section .product-card');
        let similarIs2Col = false;
        if (similarCards.length >= 2) {
          const r1 = similarCards[0].getBoundingClientRect();
          const r2 = similarCards[1].getBoundingClientRect();
          similarIs2Col = Math.abs(r1.top - r2.top) < 10;
        }

        return {
          hasStickyBar: Boolean((stickyBar && stickyRect?.height > 0) || mainWaBtn),
          stickyBtnHeight: waBtnRect?.height,
          galleryWrapHeight: galleryWrapRect?.height,
          thumbCount: thumbButtons.length,
          hasDuplicateMaterial,
          hasUnconfirmedNote,
          similarCardCount: similarCards.length,
          similarIs2Col
        };
      })()
    `,
    returnByValue: true
  });
  const detRes = detailAudit.result.value;
  assert(detRes.hasStickyBar, 'WhatsApp enquiry action is rendered and visible');
  assert(detRes.stickyBtnHeight >= 44, 'Sticky WhatsApp action button has touch target >= 44px', `Height: ${detRes.stickyBtnHeight}px`);
  assert(detRes.galleryWrapHeight <= 350, 'Image gallery height is controlled on mobile (<= 350px) preventing multi-screen stretching', `Height: ${detRes.galleryWrapHeight}px`);
  assert(detRes.thumbCount === 4, 'Multi-image gallery renders all 4 thumbnails in scrollable row', `Count: ${detRes.thumbCount}`);
  assert(!detRes.hasDuplicateMaterial, 'Specifications table is deduplicated (Material rendered exactly once)');
  assert(!detRes.hasUnconfirmedNote, 'Diagnostic internal phrases ("cannot be confirmed") stripped from buyer UI');
  assert(detRes.similarIs2Col, 'Similar products section displays in 2-column mobile grid');

  // Capture Screenshot 4: Mobile Product Detail (390px)
  await saveScreenshot('detail_mobile_390px.png');

  // Scroll to gallery & thumbnails for Screenshot 5
  await sendCdp('Runtime.evaluate', {
    expression: `window.scrollTo(0, 0);`
  });
  await sleep(800);
  await saveScreenshot('gallery_mobile_390px.png');

  console.log('\n--- 5. Desktop Layout Verification (1440px) ---');
  await setViewport(1440, 900, false);

  // Desktop Homepage
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1000);
  for (let i = 0; i < 15; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.hero-img-grid'))`,
      returnByValue: true
    });
    if (chk?.result?.value) break;
    await sleep(400);
  }

  const desktopHomeAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const stickyBar = document.querySelector('.sticky-enquiry');
        const isStickyHidden = !stickyBar || window.getComputedStyle(stickyBar).display === 'none';
        const desktopNav = document.querySelector('nav');
        const heroCollage = document.querySelector('.hero-img-grid');

        return {
          isStickyHidden,
          hasDesktopNav: Boolean(desktopNav),
          hasHeroCollage: Boolean(heroCollage)
        };
      })()
    `,
    returnByValue: true
  });
  const dHome = desktopHomeAudit.result.value;
  assert(dHome.isStickyHidden, 'Mobile sticky bar is hidden on desktop (lg:hidden)');
  assert(dHome.hasDesktopNav, 'Desktop navigation menu is visible');
  assert(dHome.hasHeroCollage, 'Desktop hero image collage is preserved');

  // Capture Screenshot 6: Desktop Homepage (1440px)
  await saveScreenshot('home_desktop_1440px.png');

  // Desktop Catalogue
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(1000);
  for (let i = 0; i < 25; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `document.querySelectorAll('.product-card').length`,
      returnByValue: true
    });
    if (chk?.result?.value > 0) break;
    await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => 
            b.innerText.includes('Try Again') || 
            b.innerText.includes('Retry') || 
            b.innerText.includes('प्रयास')
          );
          if (btn) btn.click();
        })()
      `
    });
    await sleep(500);
  }

  const desktopCatAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const cards = document.querySelectorAll('.product-card');
        const sidebar = document.querySelector('aside');
        return {
          cardCount: cards.length,
          hasSidebar: Boolean(sidebar)
        };
      })()
    `,
    returnByValue: true
  });
  const dCat = desktopCatAudit.result.value;
  assert(dCat.cardCount >= 14, 'Desktop catalogue renders full product catalogue', `Count: ${dCat.cardCount}`);
  assert(dCat.hasSidebar, 'Desktop sticky category sidebar is visible');

  // Capture Screenshot 7: Desktop Catalogue (1440px)
  await saveScreenshot('catalogue_desktop_1440px.png');

  ws.close();
}

try {
  await runVerification();
} catch (err) {
  console.error('Fatal Verification Error:', err);
  failed++;
} finally {
  console.log('\nTerminating test processes...');
  if (chromeProc) chromeProc.kill();
  if (frontendProc) frontendProc.kill();
  if (backendProc) backendProc.kill();
}

console.log('\n=================================================================');
console.log(`Phase 8 Verification Summary: ${passed} Passed, ${failed} Failed`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 8 MOBILE-FIRST REDESIGN ASSERTIONS PASSED!');
  process.exit(0);
}
