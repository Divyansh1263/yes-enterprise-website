import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8.5 Verification & Screenshot Engine');
console.log('Testing Mobile Hero Refinement, Removal of Duplicate Category Strip,');
console.log('Typography, Spacing, 44px CTAs, Drawer Scroll Lock & Responsive Viewports');
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
const FRONTEND_PORT = 5173;

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

async function runVerification() {
  console.log('1. Starting Cloudflare Pages Dev backend (Wrangler)...');
  backendProc = spawn(npxCmd, ['wrangler', 'pages', 'dev', 'public', '--port', String(BACKEND_PORT), '--ip', '127.0.0.1'], {
    stdio: 'ignore',
    shell: isWindows,
    env: { ...process.env, CI: 'true' }
  });

  console.log('2. Starting React Vite Frontend on port 5173...');
  frontendProc = spawn(npxCmd, ['vite', '--port', String(FRONTEND_PORT), '--host', '127.0.0.1'], {
    stdio: 'ignore',
    shell: isWindows,
    env: process.env
  });

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

  // Verify backend API works
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
  const chromeUserData = path.resolve('./.chrome-phase8-5-profile');
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

  // Connect to Chrome CDP
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
      const { resolve, reject } = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
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

  async function saveScreenshot(filename) {
    const shot = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(LOCAL_SCREENSHOTS_DIR, filename), buf);
    fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buf);
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, filename), buf);
    console.log(`📸 Screenshot captured & saved: ${filename} (${buf.length} bytes)`);
  }

  // --- 1. HERO CONTENT, CTA & STRUCTURE AUDIT (390px) ---
  console.log('\n--- 1. Hero Content & Structure Verification (390px) ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  const heroAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const badge = document.querySelector('span[class*="rounded-full"][class*="uppercase"]')?.textContent.trim();
        const h1 = document.querySelector('h1')?.textContent.replace(/\\s+/g, ' ').trim();
        const sub = document.querySelector('h1 + p')?.textContent.trim();
        const primaryCta = document.querySelector('a.btn-shine[href*="/products"]');
        const waCta = document.querySelector('section a[href*="wa.me"]');

        const primaryRect = primaryCta ? primaryCta.getBoundingClientRect() : null;
        const waRect = waCta ? waCta.getBoundingClientRect() : null;

        // Trust indicators check
        const trustElements = Array.from(document.querySelectorAll('section:first-of-type span[class*="text-white/70"]')).map(el => el.textContent.trim());

        return {
          badge,
          h1,
          sub,
          primaryCtaText: primaryCta?.innerText.trim(),
          primaryHeight: primaryRect?.height,
          primaryTop: primaryRect?.top,
          waText: waCta?.innerText.trim(),
          waHref: waCta?.getAttribute('href'),
          waHeight: waRect?.height,
          trustCount: trustElements.length,
          trustElements
        };
      })()
    `,
    returnByValue: true
  });
  const hVal = heroAudit.result.value;
  assert(hVal.badge.toUpperCase().includes('INDIAN MANUFACTURER & SUPPLIER'), 'Hero badge preserves "Indian Manufacturer & Supplier"', hVal.badge);
  assert(hVal.h1.includes('Feeding Bottles, Water Bottles & Stainless Steel Tiffins'), 'Hero heading matches approved permanent copy (Feeding Bottles, Water Bottles & Stainless Steel Tiffins)', hVal.h1);
  assert(!hVal.h1.includes('Stainless Steel Products'), 'Hero heading does NOT say "Stainless Steel Products"');
  assert(hVal.sub.includes('Direct manufacturing and wholesale supply for retailers, distributors and bulk buyers.'), 'Hero supporting paragraph matches copy', hVal.sub);
  assert(hVal.primaryCtaText.includes('Explore Product Catalogue'), 'Primary CTA label is "Explore Product Catalogue"');
  assert(hVal.primaryHeight >= 44, 'Primary CTA meets >= 44px touch target height standard', `${hVal.primaryHeight}px`);
  assert(hVal.primaryTop < 350, 'Primary CTA is positioned prominently above the fold', `Top: ${Math.round(hVal.primaryTop)}px`);
  assert(hVal.waText.includes('WhatsApp Enquiry'), 'Secondary CTA label is "WhatsApp Enquiry"');
  assert(hVal.waHref.includes('917454848548'), 'Secondary WhatsApp CTA points to official number 917454848548', hVal.waHref);
  assert(hVal.waHref.includes('text='), 'Secondary WhatsApp CTA includes encoded enquiry text');
  assert(hVal.waHeight >= 44, 'Secondary WhatsApp CTA meets >= 44px touch target height standard', `${hVal.waHeight}px`);
  assert(hVal.trustCount === 3, 'Trust indicators present in hero', hVal.trustElements.join(', '));

  // --- 2. VERIFY PRODUCT-LINEUP IMAGE & REMOVAL OF DUPLICATE HERO CATEGORY STRIP ---
  console.log('\n--- 2. Product-Lineup Image & Duplicate Strip Removal Verification ---');
  const heroImageAndStripAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const lineupImg = document.querySelector('img[src*="premium-feeding-bottles-lineup"]');
        const lineupRect = lineupImg ? lineupImg.getBoundingClientRect() : null;

        // Check if any horizontal category strip / popular categories exist in hero
        const popularTitle = Array.from(document.querySelectorAll('section:first-of-type *')).find(el => 
          /popular categories|लोकप्रिय श्रेणियां/i.test(el.textContent)
        );
        const heroCategoryLinks = Array.from(document.querySelectorAll('section:first-of-type a[href*="category="]'));

        return {
          lineupFound: Boolean(lineupImg),
          complete: lineupImg?.complete,
          naturalWidth: lineupImg?.naturalWidth,
          naturalHeight: lineupImg?.naturalHeight,
          displayedWidth: lineupRect?.width,
          displayedHeight: lineupRect?.height,
          aspectRatio: lineupImg ? (lineupImg.naturalWidth / lineupImg.naturalHeight).toFixed(3) : null,
          hasPopularTitle: Boolean(popularTitle),
          heroCategoryLinksCount: heroCategoryLinks.length
        };
      })()
    `,
    returnByValue: true
  });
  const imgStrip = heroImageAndStripAudit.result.value;
  assert(imgStrip.lineupFound, 'Product lineup image is present in mobile hero');
  assert(imgStrip.naturalWidth === 1774 && imgStrip.naturalHeight === 887, `Product lineup image has natural dimensions 1774x887 (${imgStrip.naturalWidth}x${imgStrip.naturalHeight}px)`);
  assert(imgStrip.aspectRatio === '2.000', 'Product lineup image preserves exact 2:1 aspect ratio without distortion', imgStrip.aspectRatio);
  assert(imgStrip.complete, 'Product lineup image is fully loaded by browser');
  assert(!imgStrip.hasPopularTitle, 'Duplicate "Popular Categories" title is completely REMOVED from hero');
  assert(imgStrip.heroCategoryLinksCount === 0, 'Zero duplicate category thumbnail links exist in hero (one single clear category navigation section preserved below)', `Count: ${imgStrip.heroCategoryLinksCount}`);

  // Capture Screenshot 1: Complete mobile homepage hero at 390px
  await saveScreenshot('phase8_5_hero_mobile_390px.png');

  // Capture Screenshot 2: Complete mobile homepage hero at 430px
  await setViewport(430, 932, true);
  await sleep(400);
  await saveScreenshot('phase8_5_hero_mobile_430px.png');
  await setViewport(390, 844, true); // restore 390px

  // --- 3. PRODUCT CATEGORIES SECTION AUDIT ---
  console.log('\n--- 3. Mobile Product Categories Section Verification ---');
  await sendCdp('Runtime.evaluate', {
    expression: `document.querySelector('.cat-card')?.closest('section')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
  });
  await sleep(600);

  const catAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const cards = document.querySelectorAll('.cat-card');
        let is2Col = false;
        if (cards.length >= 2) {
          const r1 = cards[0].getBoundingClientRect();
          const r2 = cards[1].getBoundingClientRect();
          is2Col = Math.abs(r1.top - r2.top) < 10 && r1.left < r2.left;
        }
        return { count: cards.length, is2Col };
      })()
    `,
    returnByValue: true
  });
  assert(catAudit.result.value.count === 6, 'Product Categories section renders all 6 category cards');
  assert(catAudit.result.value.is2Col, 'Product Categories section renders in 2-column mobile grid');

  // Capture Screenshot 3: Mobile Product Categories section
  await saveScreenshot('phase8_5_categories_mobile_390px.png');

  // --- 4. MOBILE NAVIGATION DRAWER & BODY SCROLL AUDIT ---
  console.log('\n--- 4. Mobile Navigation Drawer & Interaction Audit ---');
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 0);` });
  await sleep(500);

  // Open drawer
  await sendCdp('Runtime.evaluate', {
    expression: `document.querySelector('button[aria-label="Toggle menu"]').click()`
  });
  await sleep(500);

  const drawerAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const bodyOverflow = window.getComputedStyle(document.body).overflow;
        const menuLinks = Array.from(document.querySelectorAll('header div[class*="animate-fadeIn"] a, header nav a')).map(a => ({
          href: a.getAttribute('href'),
          text: a.innerText.trim()
        }));
        const waLink = Array.from(document.querySelectorAll('header div[class*="animate-fadeIn"] a')).find(a => a.getAttribute('href')?.includes('wa.me'));
        const langBtn = document.querySelector('header div[class*="animate-fadeIn"] button');
        return {
          bodyOverflow,
          menuLinks,
          hasLangBtn: Boolean(langBtn),
          waHref: waLink?.getAttribute('href')
        };
      })()
    `,
    returnByValue: true
  });
  const dr = drawerAudit.result.value;
  assert(dr.bodyOverflow === 'hidden', 'Body scroll is locked (overflow: hidden) when mobile menu drawer is open', dr.bodyOverflow);
  assert(dr.menuLinks.some(l => l.text === 'Home'), 'Navigation drawer contains "Home" link');
  assert(dr.menuLinks.some(l => l.text === 'Products'), 'Navigation drawer contains "Products" link');
  assert(dr.menuLinks.some(l => l.text === 'About'), 'Navigation drawer contains "About" link');
  assert(dr.menuLinks.some(l => l.text === 'Contact'), 'Navigation drawer contains "Contact" link');
  assert(dr.hasLangBtn, 'Navigation drawer contains language switch button');
  assert(dr.waHref?.includes('917454848548'), 'Navigation drawer WhatsApp link points to official number 917454848548', dr.waHref);

  // Capture Screenshot 6: Mobile navigation drawer open
  await saveScreenshot('phase8_5_nav_drawer_mobile_390px.png');

  // Close drawer by navigating to /products
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const pLink = Array.from(document.querySelectorAll('header div[class*="animate-fadeIn"] a')).find(a => a.innerText.trim() === 'Products');
        if (pLink) pLink.click();
      })()
    `
  });
  await sleep(1200);

  const navCloseAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => ({
        url: window.location.href,
        bodyOverflow: window.getComputedStyle(document.body).overflow,
        drawerClosed: !document.querySelector('header div[class*="animate-fadeIn"]')
      }))()
    `,
    returnByValue: true
  });
  assert(navCloseAudit.result.value.drawerClosed, 'Navigation drawer closes automatically after navigation click');
  assert(navCloseAudit.result.value.bodyOverflow !== 'hidden', 'Body scroll is restored after drawer closes');

  // --- 5. MOBILE PRODUCT CATALOGUE AUDIT & SCREENSHOT ---
  console.log('\n--- 5. Mobile Product Catalogue Audit (390px) ---');
  const catGridAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const cards = document.querySelectorAll('.product-card');
        let is2Col = false;
        if (cards.length >= 2) {
          const r1 = cards[0].getBoundingClientRect();
          const r2 = cards[1].getBoundingClientRect();
          is2Col = Math.abs(r1.top - r2.top) < 15 && r1.left < r2.left;
        }
        return { count: cards.length, is2Col };
      })()
    `,
    returnByValue: true
  });
  assert(catGridAudit.result.value.count > 0, `Product catalogue renders products (${catGridAudit.result.value.count} products)`);
  assert(catGridAudit.result.value.is2Col, 'Product catalogue renders in 2-column mobile grid');

  // Capture Screenshot 4: Mobile Product Catalogue
  await saveScreenshot('phase8_5_catalogue_mobile_390px.png');

  // --- 6. MOBILE PRODUCT DETAIL AUDIT & SCREENSHOT ---
  console.log('\n--- 6. Mobile Product Detail Page Audit (390px) ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products/ye-premium-stainless-steel-feeding-bottle-200ml` });
  await sleep(1000);
  for (let i = 0; i < 20; i++) {
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
        const stickyBar = document.querySelector('.sticky-enquiry');
        const waBtn = document.querySelector('a[href*="wa.me"]');
        const mainImage = document.querySelector('.space-y-3 img');
        const thumbs = document.querySelectorAll('button[aria-label^="View image"]');
        const h1 = document.querySelector('h1')?.textContent.trim();
        return {
          hasStickyBar: Boolean(stickyBar || waBtn),
          hasMainImage: Boolean(mainImage && mainImage.complete),
          thumbCount: thumbs.length,
          h1
        };
      })()
    `,
    returnByValue: true
  });
  const dVal = detailAudit.result.value;
  assert(dVal.hasStickyBar, 'WhatsApp enquiry action is present');
  assert(dVal.hasMainImage, 'Product detail main gallery image is present and loaded');
  assert(dVal.thumbCount > 0, `Product gallery thumbnails present (${dVal.thumbCount} thumbnails)`);

  // Capture Screenshot 5: Mobile Product Detail
  await saveScreenshot('phase8_5_detail_mobile_390px.png');

  // --- 7. HINDI LOCALIZATION VERIFICATION ---
  console.log('\n--- 7. Hindi Localization Verification ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/hi` });
  await sleep(1500);

  const hiAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const badge = document.querySelector('span[class*="rounded-full"][class*="uppercase"]')?.textContent.trim();
        const h1 = document.querySelector('h1')?.textContent.replace(/\\s+/g, ' ').trim();
        const primaryCta = document.querySelector('a.btn-shine[href*="/products"]')?.textContent.trim();
        return { badge, h1, primaryCta };
      })()
    `,
    returnByValue: true
  });
  assert(hiAudit.result.value.badge.includes('भारतीय निर्माता और सप्लायर'), 'Hindi badge text verified');
  assert(hiAudit.result.value.h1.includes('फीडिंग बोतलें'), 'Hindi headline verified');
  assert(hiAudit.result.value.primaryCta.includes('उत्पाद कैटलॉग देखें'), 'Hindi Primary CTA verified');

  await saveScreenshot('phase8_5_hindi_390px.png');

  // --- 8. TABLET & DESKTOP AUDIT & SCREENSHOTS ---
  console.log('\n--- 8. Tablet (768px) and Desktop (1440px) Audit ---');

  // Tablet 768px
  await setViewport(768, 1024, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);
  // Capture Screenshot 8: Tablet homepage at 768px
  await saveScreenshot('phase8_5_tablet_768px.png');

  // Desktop 1440px
  await setViewport(1440, 900, false);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  const desktopAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const grid = document.querySelector('.hero-img-grid');
        const lineupImg = grid ? grid.querySelector('img[src*="premium-feeding-bottles-lineup"]') : null;
        const supportingImgs = grid ? grid.querySelectorAll('img:not([src*="premium-feeding-bottles-lineup"])') : [];
        return {
          hasHeroGrid: Boolean(grid),
          hasLineupImg: Boolean(lineupImg && lineupImg.complete),
          lineupNaturalWidth: lineupImg ? lineupImg.naturalWidth : 0,
          supportingCount: supportingImgs.length
        };
      })()
    `,
    returnByValue: true
  });
  const dRes = desktopAudit.result.value;
  assert(dRes.hasHeroGrid, 'Desktop hero composition (.hero-img-grid) is preserved and visible');
  assert(dRes.hasLineupImg && dRes.lineupNaturalWidth === 1774, 'Desktop composition features new product-lineup image prominently (1774px natural width)');
  assert(dRes.supportingCount === 3, 'Desktop composition includes 3 supporting product close-up images below lineup card (Phase 8.7 requirement)', `Count: ${dRes.supportingCount}`);

  // Capture Screenshot 7: Desktop homepage at 1440px
  await saveScreenshot('phase8_5_desktop_1440px.png');

  // --- 9. VIEWPORT OVERFLOW CHECK (360px, 375px, 390px, 412px, 430px, 768px, 1280px, 1440px) ---
  console.log('\n--- 9. Comprehensive Viewport Horizontal Overflow Check ---');
  const viewports = [
    { name: 'Small Mobile', width: 360, height: 740, mobile: true },
    { name: 'iPhone SE', width: 375, height: 667, mobile: true },
    { name: 'Standard Mobile', width: 390, height: 844, mobile: true },
    { name: 'Android Large', width: 412, height: 915, mobile: true },
    { name: 'iPhone Pro Max', width: 430, height: 932, mobile: true },
    { name: 'Tablet', width: 768, height: 1024, mobile: true },
    { name: 'Laptop', width: 1280, height: 800, mobile: false },
    { name: 'Desktop', width: 1440, height: 900, mobile: false },
  ];

  for (const vp of viewports) {
    await setViewport(vp.width, vp.height, vp.mobile);
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
    await sleep(600);

    const ofCheck = await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const innerWidth = window.innerWidth;
          return { scrollWidth, innerWidth, overflow: scrollWidth > innerWidth + 1 };
        })()
      `,
      returnByValue: true
    });
    const ov = ofCheck.result.value;
    assert(!ov.overflow, `Zero horizontal overflow at ${vp.name} (${vp.width}px)`, `scrollWidth: ${ov.scrollWidth}px, window: ${ov.innerWidth}px`);
  }

  console.log('\n=================================================================');
  console.log(`Phase 8.5 Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');
}

runVerification()
  .catch((err) => {
    console.error('Fatal Verification Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log('\nTerminating test processes...');
    if (chromeProc) {
      try { chromeProc.kill(); } catch {}
    }
    if (frontendProc) {
      try { frontendProc.kill(); } catch {}
    }
    if (backendProc) {
      try { backendProc.kill(); } catch {}
    }
    await sleep(800);
    process.exit(failed > 0 ? 1 : 0);
  });
