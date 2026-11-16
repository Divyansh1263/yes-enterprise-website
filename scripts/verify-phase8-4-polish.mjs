import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8.4 Verification & Screenshot Engine');
console.log('Testing Final Homepage Polish, Lineup Image, Hierarchy & Navigation');
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
  const chromeUserData = path.resolve('./.chrome-phase8-4-profile');
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

  // --- 1. HERO CTA TOUCH TARGET & CONTENT AUDIT ---
  console.log('\n--- 1. Hero Content & CTA Touch Target Verification ---');
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

        return {
          badge,
          h1,
          sub,
          primaryCtaText: primaryCta?.innerText.trim(),
          primaryHeight: primaryRect?.height,
          primaryTop: primaryRect?.top,
          waText: waCta?.innerText.trim(),
          waHref: waCta?.getAttribute('href'),
          waHeight: waRect?.height
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
  assert(hVal.waHeight >= 44, 'Secondary WhatsApp CTA meets >= 44px touch target height standard (FIXED)', `${hVal.waHeight}px`);

  // --- 2. PRODUCT LINEUP IMAGE VERIFICATION ---
  console.log('\n--- 2. New Product-Lineup Image Verification (Mobile & Desktop) ---');
  const lineupAuditMobile = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const img = document.querySelector('img[src*="premium-feeding-bottles-lineup"]');
        if (!img) return { found: false };
        const rect = img.getBoundingClientRect();
        return {
          found: true,
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt'),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayedWidth: rect.width,
          displayedHeight: rect.height,
          aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3)
        };
      })()
    `,
    returnByValue: true
  });
  const mLineup = lineupAuditMobile.result.value;
  assert(mLineup.found, 'Product lineup image is present in mobile hero');
  assert(mLineup.naturalWidth === 1774 && mLineup.naturalHeight === 887, `Product lineup image has natural dimensions 1774x887 (${mLineup.naturalWidth}x${mLineup.naturalHeight}px)`);
  assert(mLineup.aspectRatio === '2.000', 'Product lineup image preserves exact 2:1 aspect ratio without distortion', mLineup.aspectRatio);
  assert(mLineup.complete, 'Product lineup image is fully loaded by browser');

  // Capture Screenshot: Hero Mobile 390px
  await saveScreenshot('phase8_4_hero_mobile_390px.png');

  // Capture Screenshot: Hero Mobile 430px
  await setViewport(430, 932, true);
  await sleep(400);
  await saveScreenshot('phase8_4_hero_mobile_430px.png');
  await setViewport(390, 844, true); // restore 390px

  // --- 3. REDUNDANT SHOWCASE CARD REMOVAL & HIERARCHY VERIFICATION ---
  console.log('\n--- 3. Redundant Showcase Card Removal & Homepage Hierarchy ---');
  const hierarchyAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const showcase = document.querySelector('#bottle-showcase');
        const sections = Array.from(document.querySelectorAll('main > section, div.overflow-x-hidden > section'));
        const sectionTypes = sections.map(s => {
          if (s.querySelector('h1')) return 'HERO';
          if (s.querySelector('.usp-icon-wrap')) return 'USP';
          if (s.querySelector('.cat-card')) return 'CATEGORIES';
          if (s.querySelector('.product-card')) return 'FEATURED';
          if (s.querySelector('a[href*="/about"]')) return 'ABOUT';
          if (s.querySelector('a[href*="/contact"]')) return 'WHOLESALE';
          return 'OTHER';
        });

        return {
          hasShowcase: Boolean(showcase),
          sectionTypes,
          catBeforeFeatured: sectionTypes.indexOf('CATEGORIES') < sectionTypes.indexOf('FEATURED')
        };
      })()
    `,
    returnByValue: true
  });
  const hArch = hierarchyAudit.result.value;
  assert(!hArch.hasShowcase, 'Redundant Explore Product card (#bottle-showcase) is completely removed from homepage');
  assert(hArch.catBeforeFeatured, 'Homepage hierarchy verified: Product Categories appears BEFORE Featured Products', hArch.sectionTypes.join(' -> '));

  // Scroll to Categories Section and capture screenshot
  await sendCdp('Runtime.evaluate', {
    expression: `document.querySelector('.cat-card')?.closest('section')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
  });
  await sleep(600);
  await saveScreenshot('phase8_4_categories_mobile_390px.png');

  // Verify Categories section has 6 cards in 2-col grid
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

  // Scroll to Featured Products Section and capture screenshot
  await sendCdp('Runtime.evaluate', {
    expression: `document.querySelectorAll('.product-card')[0]?.closest('section')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
  });
  await sleep(600);
  await saveScreenshot('phase8_4_featured_mobile_390px.png');

  // --- 4. MOBILE NAVIGATION DRAWER & BODY SCROLL AUDIT ---
  console.log('\n--- 4. Mobile Navigation Drawer & Interaction Audit ---');
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 0);` });
  await sleep(500);

  // Click hamburger button to open drawer
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
        const langBtn = document.querySelector('header div[class*="animate-fadeIn"] button');
        return {
          bodyOverflow,
          menuLinks,
          hasLangBtn: Boolean(langBtn),
          langBtnText: langBtn?.innerText.trim()
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
  assert(dr.hasLangBtn, 'Navigation drawer contains language switch toggle', dr.langBtnText);

  // Capture Screenshot: Mobile Nav Drawer
  await saveScreenshot('phase8_4_nav_drawer_mobile_390px.png');

  // Click "About" link in drawer
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const aboutLink = Array.from(document.querySelectorAll('header div[class*="animate-fadeIn"] a')).find(a => a.innerText.trim() === 'About');
        if (aboutLink) aboutLink.click();
      })()
    `
  });
  await sleep(1000);

  const aboutNavAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => ({
        url: window.location.href,
        bodyOverflow: window.getComputedStyle(document.body).overflow,
        drawerClosed: !document.querySelector('header div[class*="animate-fadeIn"]')
      }))()
    `,
    returnByValue: true
  });
  const ab = aboutNavAudit.result.value;
  assert(ab.url.includes('/about'), 'Clicking "About" in drawer successfully navigates to /about URL', ab.url);
  assert(ab.drawerClosed, 'Navigation drawer closes automatically after link click');
  assert(ab.bodyOverflow !== 'hidden', 'Body scrolling is restored after drawer closes', ab.bodyOverflow);

  // Capture Screenshot: About Page
  await saveScreenshot('phase8_4_about_mobile_390px.png');

  // Navigate to Contact Page & Capture Screenshot
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/contact` });
  await sleep(1200);
  await saveScreenshot('phase8_4_contact_mobile_390px.png');

  // Navigate to Product Detail Page & Capture Screenshot
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products/ye-premium-stainless-steel-feeding-bottle-200ml` });
  await sleep(1200);
  await saveScreenshot('phase8_4_detail_mobile_390px.png');

  // Navigate to Products Catalogue & Capture Screenshot
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(1200);
  await saveScreenshot('phase8_4_catalogue_mobile_390px.png');

  // --- 5. HINDI TRANSLATION VERIFICATION ---
  console.log('\n--- 5. Hindi Homepage Translation Verification ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/hi` });
  await sleep(1200);

  const hiAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const badge = document.querySelector('span[class*="rounded-full"][class*="uppercase"]')?.textContent.trim();
        const h1 = document.querySelector('h1')?.textContent.replace(/\\s+/g, ' ').trim();
        const sub = document.querySelector('h1 + p')?.textContent.trim();
        const primaryCta = document.querySelector('a.btn-shine[href*="/products"]')?.textContent.trim();
        const waCta = document.querySelector('section a[href*="wa.me"]')?.textContent.trim();
        return { badge, h1, sub, primaryCta, waCta };
      })()
    `,
    returnByValue: true
  });
  const hi = hiAudit.result.value;
  assert(hi.badge.includes('भारतीय निर्माता और सप्लायर'), 'Hindi badge text rendered correctly', hi.badge);
  assert(hi.h1.includes('फीडिंग बोतलें, पानी की बोतलें एवं स्टेनलेस स्टील उत्पाद'), 'Hindi heading rendered correctly', hi.h1);
  assert(hi.sub.includes('खुदरा विक्रेताओं, वितरकों और थोक खरीदारों के लिए सीधा विनिर्माण एवं आपूर्ति।'), 'Hindi subtitle rendered correctly', hi.sub);
  assert(hi.primaryCta.includes('उत्पाद कैटलॉग देखें'), 'Hindi Primary CTA text rendered correctly', hi.primaryCta);
  assert(hi.waCta.includes('WhatsApp पूछताछ'), 'Hindi WhatsApp CTA text rendered correctly', hi.waCta);

  // Capture Screenshot: Hindi Homepage
  await saveScreenshot('phase8_4_hero_hindi_390px.png');

  // --- 6. DESKTOP, LAPTOP & TABLET LAYOUTS ---
  console.log('\n--- 6. Responsive Viewports Audit (Tablet 768px, Laptop 1280px, Desktop 1440px) ---');

  // Tablet 768px
  await setViewport(768, 1024, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1200);
  await saveScreenshot('phase8_4_tablet_768px.png');

  // Laptop 1280px
  await setViewport(1280, 800, false);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1200);
  await saveScreenshot('phase8_4_laptop_1280px.png');

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
  assert(dRes.hasHeroGrid, 'Desktop hero collage (.hero-img-grid) is preserved and visible');
  assert(dRes.hasLineupImg && dRes.lineupNaturalWidth === 1774, 'Desktop composition features new product-lineup image prominently (1774px natural width)');
  assert(dRes.supportingCount === 2, 'Desktop composition includes 2 supporting product close-up images below lineup card', `Count: ${dRes.supportingCount}`);

  await saveScreenshot('phase8_4_hero_desktop_1440px.png');

  console.log('\n=================================================================');
  console.log(`Phase 8.4 Verification Summary: ${passed} Passed, ${failed} Failed`);
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
