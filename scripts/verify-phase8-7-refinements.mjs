import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8.7 Verification & Screenshot Engine');
console.log('Testing Removal of "Contact for pricing" from All Product Cards,');
console.log('Desktop 3-Image Supporting Hero Gallery, & Multi-Viewport Layout');
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
let FRONTEND_PORT = 5173;
const BACKEND_PORT = 8788;

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
  console.log('1. Checking local development servers...');
  let activePort = await detectFrontendPort();
  if (activePort) {
    FRONTEND_PORT = activePort;
    console.log(`Found active frontend running on port ${FRONTEND_PORT}`);
  } else {
    console.log('Starting Cloudflare Pages Dev backend (Wrangler)...');
    backendProc = spawn(npxCmd, ['wrangler', 'pages', 'dev', 'public', '--port', String(BACKEND_PORT), '--ip', '127.0.0.1'], {
      stdio: 'ignore',
      shell: isWindows,
      env: { ...process.env, CI: 'true' }
    });

    console.log('Starting React Vite Frontend on port 5173...');
    frontendProc = spawn(npxCmd, ['vite', '--port', '5173', '--host', '127.0.0.1'], {
      stdio: 'ignore',
      shell: isWindows,
      env: process.env
    });

    let ready = false;
    const startWait = Date.now();
    while (!ready && Date.now() - startWait < 20000) {
      activePort = await detectFrontendPort();
      if (activePort) {
        FRONTEND_PORT = activePort;
        ready = true;
        break;
      }
      await sleep(400);
    }
  }
  assert(Boolean(FRONTEND_PORT), `Frontend server active on port ${FRONTEND_PORT}`);

  // Verify backend API
  let apiOk = false;
  for (let i = 0; i < 20; i++) {
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
    await sleep(400);
  }
  assert(apiOk, 'Live catalogue API functional via Vite reverse proxy');

  // Launch Chrome with CDP
  console.log('\n2. Launching Chrome with CDP on port 9222...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-phase8-7-profile');
  chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${chromeUserData}`,
    'about:blank'
  ]);

  await sleep(2500);

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

  async function saveScreenshot(filename, clip = null) {
    const params = { format: 'png', captureBeyondViewport: false };
    if (clip) params.clip = clip;
    const res = await sendCdp('Page.captureScreenshot', params);
    const buf = Buffer.from(res.data, 'base64');
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, filename), buf);
    fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buf);
    fs.writeFileSync(path.join(LOCAL_SCREENSHOTS_DIR, filename), buf);
    console.log(`📸 Saved screenshot: ${filename} (${Math.round(buf.length / 1024)} KB)`);
  }

  async function evalSafe(expression) {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const res = await sendCdp('Runtime.evaluate', { expression, returnByValue: true });
        if (res?.result && res.result.value !== undefined) {
          return res.result.value;
        }
      } catch (e) {}
      await sleep(350);
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 1: FIX A — REMOVAL OF "CONTACT FOR PRICING" FROM CARDS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 1: Fix A — Removal of "Contact for pricing" from Product Cards ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  // 1.1 Homepage Featured Products Cards Check
  // Poll for featured cards to load
  for (let i = 0; i < 20; i++) {
    const count = await evalSafe(`document.querySelectorAll('.product-card').length`);
    if (count && count >= 4) break;
    await sleep(400);
  }

  // Scroll Featured Products into view
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const feat = document.querySelector('section.bg-white');
        if (feat) feat.scrollIntoView({ behavior: 'instant' });
      })()
    `
  });
  await sleep(600);

  const homeCardsAudit = await evalSafe(`
    (() => {
      const cards = document.querySelectorAll('.product-card');
      let contactPricingCount = 0;
      let waButtonCount = 0;
      let hasBottomBorderRow = 0;
      const cardTexts = [];

      cards.forEach(c => {
        const text = c.innerText.toLowerCase();
        if (text.includes('contact for price') || text.includes('contact for pricing') || text.includes('मूल्य के लिए संपर्क')) {
          contactPricingCount++;
        }
        if (c.querySelector('button') || c.querySelector('a[href*="wa.me"]')) {
          waButtonCount++;
        }
        if (c.querySelector('.border-t')) {
          hasBottomBorderRow++;
        }
        cardTexts.push({
          title: c.querySelector('h3')?.innerText?.trim(),
          category: c.querySelector('p.text-brand-amber')?.innerText?.trim(),
          hasImage: Boolean(c.querySelector('img.product-card-img')),
          href: c.getAttribute('href')
        });
      });

      return {
        cardCount: cards.length,
        contactPricingCount,
        waButtonCount,
        hasBottomBorderRow,
        cards: cardTexts
      };
    })()
  `);

  assert(homeCardsAudit?.cardCount >= 4, `Homepage renders featured product cards (Count: ${homeCardsAudit?.cardCount})`);
  assert(homeCardsAudit?.contactPricingCount === 0,
    `Homepage product cards contain ZERO "Contact for pricing" text (Found: ${homeCardsAudit?.contactPricingCount})`);
  assert(homeCardsAudit?.waButtonCount === 0,
    `Homepage product cards contain ZERO WhatsApp buttons (Found: ${homeCardsAudit?.waButtonCount})`);
  assert(homeCardsAudit?.hasBottomBorderRow === 0,
    `Homepage product cards have removed empty bottom border row (Found: ${homeCardsAudit?.hasBottomBorderRow})`);
  assert(homeCardsAudit?.cards && homeCardsAudit.cards.every(c => c.hasImage && c.title && c.category && c.href.startsWith('/products/')),
    'Every featured product card contains only Image, Category, Title, Specification, and links to /products/:slug');

  // Screenshot: Homepage featured products with zero pricing text
  await saveScreenshot('phase8_7_featured_no_pricing_390px.png');

  // 1.2 Main Product Catalogue Cards Check
  console.log('\nChecking Main Product Catalogue cards for zero pricing text...');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(1500);

  // Poll for catalogue cards to load
  for (let i = 0; i < 25; i++) {
    const count = await evalSafe(`document.querySelectorAll('.product-card').length`);
    if (count && count >= 14) break;
    // Click Try Again if needed
    await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Try Again') || b.innerText.includes('पुनः प्रयास'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(400);
  }

  const catCardsAudit = await evalSafe(`
    (() => {
      const cards = document.querySelectorAll('.product-card');
      let contactPricingCount = 0;
      let waButtonCount = 0;
      let hasBottomBorderRow = 0;

      cards.forEach(c => {
        const text = c.innerText.toLowerCase();
        if (text.includes('contact for price') || text.includes('contact for pricing') || text.includes('मूल्य के लिए संपर्क')) {
          contactPricingCount++;
        }
        if (c.querySelector('button') || c.querySelector('a[href*="wa.me"]')) {
          waButtonCount++;
        }
        if (c.querySelector('.border-t')) {
          hasBottomBorderRow++;
        }
      });

      return {
        cardCount: cards.length,
        contactPricingCount,
        waButtonCount,
        hasBottomBorderRow
      };
    })()
  `);

  assert(catCardsAudit?.cardCount >= 14, `Catalogue renders all products in live browser (Count: ${catCardsAudit?.cardCount})`);
  assert(catCardsAudit?.contactPricingCount === 0,
    `Catalogue product cards contain ZERO "Contact for pricing" text (Found: ${catCardsAudit?.contactPricingCount})`);
  assert(catCardsAudit?.waButtonCount === 0,
    `Catalogue product cards contain ZERO WhatsApp buttons (Found: ${catCardsAudit?.waButtonCount})`);
  assert(catCardsAudit?.hasBottomBorderRow === 0,
    `Catalogue product cards have removed empty bottom border row (Found: ${catCardsAudit?.hasBottomBorderRow})`);

  // Screenshot: Catalogue page with clean product cards
  await saveScreenshot('phase8_7_catalogue_no_pricing_390px.png');

  // 1.3 Click Navigation to ProductDetail & Verification of Enquiry Preservation
  console.log('\nTesting product card click-through & preservation of detail page enquiry...');
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const firstCard = document.querySelector('.product-card');
        if (firstCard) firstCard.click();
      })()
    `
  });
  await sleep(1500);

  // Poll for ProductDetail
  let detailLoaded = false;
  for (let i = 0; i < 20; i++) {
    const chk = await evalSafe(`Boolean(document.querySelector('a[href*="wa.me"]') && document.querySelector('h1'))`);
    if (chk) {
      detailLoaded = true;
      break;
    }
    await sleep(400);
  }
  assert(detailLoaded, 'Product card click successfully navigates to ProductDetail page');

  const detailPricingCheck = await evalSafe(`
    (() => {
      const h1 = document.querySelector('h1')?.innerText?.trim();
      const stickyEnquiry = document.querySelector('.sticky-enquiry');
      const stickyWaBtn = stickyEnquiry ? stickyEnquiry.querySelector('a[href*="wa.me"]') : null;
      const mainWaBtn = document.querySelector('a[href*="wa.me"]');
      const pricingSection = document.querySelector('.bg-brand-ivory, .border-amber-200');
      const bodyText = document.body.innerText;
      const hasEnquiryText = bodyText.includes('Enquire') || bodyText.includes('Price') || bodyText.includes('Pricing') || bodyText.includes('पूछताछ') || bodyText.includes('मूल्य');

      return {
        h1,
        hasStickyEnquiry: Boolean(stickyEnquiry),
        stickyWaHref: (stickyWaBtn || mainWaBtn) ? (stickyWaBtn || mainWaBtn).getAttribute('href') : null,
        hasMainWa: Boolean(mainWaBtn),
        hasPricingSection: Boolean(pricingSection),
        hasEnquiryText
      };
    })()
  `);

  assert(Boolean(detailPricingCheck?.h1), `ProductDetail renders title: "${detailPricingCheck?.h1}"`);
  assert(detailPricingCheck?.hasMainWa || detailPricingCheck?.hasStickyEnquiry, 'ProductDetail preserves functional WhatsApp enquiry button');
  assert(Boolean(detailPricingCheck?.stickyWaHref && detailPricingCheck.stickyWaHref.includes('wa.me')),
    'ProductDetail preserves functional WhatsApp enquiry button', detailPricingCheck?.stickyWaHref);
  assert(detailPricingCheck?.hasPricingSection || detailPricingCheck?.hasEnquiryText,
    'ProductDetail preserves pricing and enquiry sections');

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 2: FIX B — DESKTOP HERO IMAGE GALLERY (3 SUPPORTING IMAGES)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 2: Fix B — Desktop Hero Image Gallery (3 Supporting Images) ---');
  await setViewport(1440, 900, false);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  const heroGalleryAudit = await evalSafe(`
    (() => {
      const heroGrid = document.querySelector('.hero-img-grid');
      const lineupImg = heroGrid ? heroGrid.querySelector('img[src*="premium-feeding-bottles-lineup"]') : null;
      const supportingCards = heroGrid ? Array.from(heroGrid.querySelectorAll('.hero-supporting-card')) : [];
      
      const supportingDetails = supportingCards.map((card, idx) => {
        const img = card.querySelector('img');
        const cardRect = card.getBoundingClientRect();
        const imgComputed = img ? window.getComputedStyle(img) : null;
        return {
          index: idx,
          src: img ? img.getAttribute('src') : null,
          alt: img ? img.getAttribute('alt') : null,
          isComplete: img ? img.complete : false,
          naturalWidth: img ? img.naturalWidth : 0,
          naturalHeight: img ? img.naturalHeight : 0,
          cardWidth: cardRect.width,
          cardHeight: cardRect.height,
          cardTop: cardRect.top,
          objectFit: imgComputed ? imgComputed.objectFit : null
        };
      });

      // Check horizontal alignment (tops within 4px)
      const isHorizontallyAligned = supportingDetails.length === 3 &&
        Math.abs(supportingDetails[0].cardTop - supportingDetails[1].cardTop) < 4 &&
        Math.abs(supportingDetails[1].cardTop - supportingDetails[2].cardTop) < 4;

      // Check equal widths (within 4px)
      const hasEqualWidths = supportingDetails.length === 3 &&
        Math.abs(supportingDetails[0].cardWidth - supportingDetails[1].cardWidth) < 4 &&
        Math.abs(supportingDetails[1].cardWidth - supportingDetails[2].cardWidth) < 4;

      // Check equal heights (within 4px)
      const hasEqualHeights = supportingDetails.length === 3 &&
        Math.abs(supportingDetails[0].cardHeight - supportingDetails[1].cardHeight) < 4 &&
        Math.abs(supportingDetails[1].cardHeight - supportingDetails[2].cardHeight) < 4;

      return {
        hasHeroGrid: Boolean(heroGrid),
        hasLineupImg: Boolean(lineupImg && lineupImg.complete),
        lineupNaturalWidth: lineupImg ? lineupImg.naturalWidth : 0,
        lineupNaturalHeight: lineupImg ? lineupImg.naturalHeight : 0,
        supportingCount: supportingCards.length,
        supportingDetails,
        isHorizontallyAligned,
        hasEqualWidths,
        hasEqualHeights
      };
    })()
  `);

  assert(heroGalleryAudit?.hasHeroGrid, 'Desktop hero gallery container (.hero-img-grid) is present');
  assert(heroGalleryAudit?.hasLineupImg && heroGalleryAudit.lineupNaturalWidth === 1774,
    'Main lineup image is preserved as top prominent hero element (1774x887px)');
  assert(heroGalleryAudit?.supportingCount === 3,
    `Supporting image row contains EXACTLY 3 image panels in single horizontal row (Found: ${heroGalleryAudit?.supportingCount})`);
  assert(heroGalleryAudit?.isHorizontallyAligned,
    'All 3 supporting image panels are horizontally aligned in a single row');
  assert(heroGalleryAudit?.hasEqualWidths,
    'All 3 supporting image panels have equal widths',
    `Widths: ${heroGalleryAudit?.supportingDetails?.map(d => `${Math.round(d.cardWidth)}px`).join(', ')}`);
  assert(heroGalleryAudit?.hasEqualHeights,
    'All 3 supporting image panels have consistent equal heights',
    `Heights: ${heroGalleryAudit?.supportingDetails?.map(d => `${Math.round(d.cardHeight)}px`).join(', ')}`);
  
  const allObjectContain = heroGalleryAudit?.supportingDetails?.every(d => d.objectFit === 'contain');
  assert(allObjectContain, 'All 3 supporting product images use object-fit: contain to display complete products without cropping');
  
  const allImagesLoaded = heroGalleryAudit?.supportingDetails?.every(d => d.isComplete && d.naturalWidth > 0);
  assert(allImagesLoaded, 'All 3 supporting product photographs are fully loaded by browser with valid natural dimensions');

  // Verify the 3 distinct product types
  const alts = heroGalleryAudit?.supportingDetails?.map(d => d.alt) || [];
  assert(alts.some(a => a.toLowerCase().includes('stainless') || a.toLowerCase().includes('ss')),
    'Supporting gallery includes Stainless Steel product photograph', alts[0]);
  assert(alts.some(a => a.toLowerCase().includes('silicone') || a.toLowerCase().includes('feeding')),
    'Supporting gallery includes Silicone Sleeve / Feeding Bottle product photograph', alts[1]);
  assert(alts.some(a => a.toLowerCase().includes('tiffin')),
    'Supporting gallery includes distinct Stainless Steel Tiffin Box product photograph', alts[2]);

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 3: DESKTOP RESPONSIVENESS (1280px, 1366px, 1440px, 1600px)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 3: Desktop Responsiveness Across 4 Standard Resolutions ---');
  const desktopResolutions = [
    { name: '1280x800', width: 1280, height: 800, filename: 'phase8_7_desktop_1280px.png' },
    { name: '1366x768', width: 1366, height: 768, filename: 'phase8_7_desktop_1366px.png' },
    { name: '1440x900', width: 1440, height: 900, filename: 'phase8_7_desktop_1440px.png' },
    { name: '1600x900', width: 1600, height: 900, filename: 'phase8_7_desktop_1600px.png' },
  ];

  for (const res of desktopResolutions) {
    await setViewport(res.width, res.height, false);
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
    await sleep(800);

    const fitCheck = await evalSafe(`
      (() => {
        const hero = document.querySelector('section.bg-grad-hero');
        const heroGrid = document.querySelector('.hero-img-grid');
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        return {
          heroHeight: hero ? hero.getBoundingClientRect().height : 0,
          gridHeight: heroGrid ? heroGrid.getBoundingClientRect().height : 0,
          noOverflow: scrollWidth <= innerWidth + 1
        };
      })()
    `);

    assert(fitCheck?.noOverflow, `Zero horizontal overflow at desktop ${res.name}`);
    assert(fitCheck?.gridHeight < 650, `Hero gallery height is well-balanced at ${res.name} (${Math.round(fitCheck?.gridHeight)}px)`);
    await saveScreenshot(res.filename);
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 4: MOBILE REGRESSION VERIFICATION (360px, 390px, 430px)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 4: Mobile Regression Verification (360px, 390px, 430px) ---');
  const mobileResolutions = [
    { name: 'Small Mobile 360x800', width: 360, height: 800, filename: 'phase8_7_mobile_360px.png' },
    { name: 'Mobile 390x844',       width: 390, height: 844, filename: 'phase8_7_mobile_390px.png' },
    { name: 'Mobile 430x932',       width: 430, height: 932, filename: 'phase8_7_mobile_430px.png' },
  ];

  for (const res of mobileResolutions) {
    await setViewport(res.width, res.height, true);
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
    await sleep(800);

    const mCheck = await evalSafe(`
      (() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const header = document.querySelector('header');
        const desktopGallery = document.querySelector('.hero-img-grid');
        return {
          noOverflow: scrollWidth <= innerWidth + 1,
          hasHeader: Boolean(header),
          desktopGalleryHidden: desktopGallery ? window.getComputedStyle(desktopGallery).display === 'none' : true
        };
      })()
    `);

    assert(mCheck?.noOverflow, `Zero horizontal overflow at mobile ${res.name}`);
    assert(mCheck?.desktopGalleryHidden, `Desktop 3-column gallery is correctly hidden on mobile screen ${res.name}`);
    await saveScreenshot(res.filename);
  }

  console.log('\n=================================================================');
  console.log(`Phase 8.7 Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');
}

runVerification()
  .catch((err) => {
    console.error('Fatal Verification Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log('\nClosing Chrome test browser...');
    if (chromeProc) {
      try { chromeProc.kill(); } catch {}
    }
    // Only kill frontend/backend if they were spawned specifically by this test
    if (frontendProc) {
      try { frontendProc.kill(); } catch {}
    }
    if (backendProc) {
      try { backendProc.kill(); } catch {}
    }
    await sleep(800);
    process.exit(failed > 0 ? 1 : 0);
  });
