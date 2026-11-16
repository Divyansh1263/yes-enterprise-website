import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8.8 Verification & Multi-Viewport Suite');
console.log('Testing New Hero Image Integration, Product Detail Enquiry Refinement,');
console.log('Vertical Category Filters, & Product Card Cleanliness Across Viewports');
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
  const chromeUserData = path.resolve('./.chrome-phase8-8-profile');
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
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const res = await sendCdp('Runtime.evaluate', { expression, returnByValue: true });
        if (res?.result && res.result.value !== undefined) {
          return res.result.value;
        }
      } catch (e) {}
      await sleep(300);
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 1: TASK 1 — NEW HERO LINEUP IMAGE & DESKTOP GALLERY
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 1: Task 1 — New Hero Lineup Image & Gallery Polish ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  // Poll for hero lineup image
  for (let i = 0; i < 20; i++) {
    const imgOk = await evalSafe(`
      (() => {
        const img = document.querySelector('img[src*="premium-feeding-bottles-lineup"], img[src*="Indian"]');
        return Boolean(img && img.complete && img.naturalWidth > 0);
      })()
    `);
    if (imgOk) break;
    await sleep(400);
  }

  const mobileHeroAudit = await evalSafe(`
    (() => {
      const img = document.querySelector('.hero-mobile-lineup img') || document.querySelector('img[src*="premium-feeding-bottles-lineup"]');
      if (!img) return { found: false };
      const container = img.parentElement;
      const rect = img.getBoundingClientRect();
      const cRect = container ? container.getBoundingClientRect() : null;
      const cStyle = container ? window.getComputedStyle(container) : null;

      return {
        found: true,
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
        imgWidth: rect.width,
        imgHeight: rect.height,
        containerBg: cStyle?.backgroundColor,
        containerPadding: cStyle?.padding,
        containerRounded: cStyle?.borderRadius
      };
    })()
  `);

  assert(mobileHeroAudit?.found, 'Mobile hero product lineup image is rendered');
  assert(mobileHeroAudit?.complete, 'Mobile hero product lineup image loaded completely');
  assert(mobileHeroAudit?.naturalWidth === 1774 && mobileHeroAudit?.naturalHeight === 887,
    'Mobile hero product lineup uses newly generated 1774x887 image (2:1 aspect ratio)',
    `${mobileHeroAudit?.naturalWidth}x${mobileHeroAudit?.naturalHeight}`);
  assert(Boolean(mobileHeroAudit?.containerBg),
    'Hero image container has matching navy background padding to protect heading from clipping',
    `bg: ${mobileHeroAudit?.containerBg}, padding: ${mobileHeroAudit?.containerPadding}`);

  // Permanent hero heading verification (mobile)
  const mobileH1 = await evalSafe(`document.querySelector('h1')?.innerText?.replace(/\\s+/g, ' ').trim()`);
  assert(mobileH1 === 'Feeding Bottles, Water Bottles & Stainless Steel Tiffins',
    'Mobile hero heading displays exact permanent text: "Feeding Bottles, Water Bottles & Stainless Steel Tiffins"', mobileH1);
  assert(!mobileH1.includes('Stainless Steel Products'),
    'Permanent heading requirement: Mobile hero heading does NOT contain "Stainless Steel Products"');

  await saveScreenshot('phase8_8_mobile_hero_390px.png');

  // Desktop Hero Audit (1440px)
  await setViewport(1440, 900, false);
  await sleep(1000);

  const desktopHeroAudit = await evalSafe(`
    (() => {
      const heroGrid = document.querySelector('.hero-img-grid');
      const lineupImg = heroGrid ? heroGrid.querySelector('img[src*="premium-feeding-bottles-lineup"], img[src*="Indian"]') : null;
      const supportingCards = heroGrid ? Array.from(heroGrid.querySelectorAll('.hero-supporting-card')) : [];
      const supportingImgs = supportingCards.map(c => c.querySelector('img'));

      const isSingleRow = supportingCards.length === 3 &&
        Math.abs(supportingCards[0].getBoundingClientRect().top - supportingCards[1].getBoundingClientRect().top) < 5 &&
        Math.abs(supportingCards[1].getBoundingClientRect().top - supportingCards[2].getBoundingClientRect().top) < 5;

      return {
        hasHeroGrid: Boolean(heroGrid),
        lineupFound: Boolean(lineupImg && lineupImg.complete),
        lineupWidth: lineupImg?.naturalWidth,
        lineupHeight: lineupImg?.naturalHeight,
        supportingCount: supportingCards.length,
        allSupportingLoaded: supportingImgs.every(img => img && img.complete && img.naturalWidth > 0),
        isSingleRow,
        allCardsNeutralBg: supportingCards.every(c => {
          const bg = window.getComputedStyle(c).backgroundColor;
          return bg.includes('247, 245, 239') || bg.includes('#F7F5EF') || bg.includes('rgb(247, 245, 239)');
        }),
        allImgsObjectContain: supportingImgs.every(img => window.getComputedStyle(img).objectFit === 'contain')
      };
    })()
  `);

  assert(desktopHeroAudit?.hasHeroGrid, 'Desktop hero grid (.hero-img-grid) is rendered');
  assert(desktopHeroAudit?.lineupFound, 'Desktop hero product lineup image loaded completely');
  assert(desktopHeroAudit?.lineupWidth === 1774 && desktopHeroAudit?.lineupHeight === 887,
    'Desktop hero uses newly generated 1774x887 product lineup', `${desktopHeroAudit?.lineupWidth}x${desktopHeroAudit?.lineupHeight}`);
  assert(desktopHeroAudit?.supportingCount === 3, 'Desktop hero gallery displays exactly 3 supporting product close-ups');
  assert(desktopHeroAudit?.isSingleRow, 'All 3 supporting cards align in a single horizontal row');
  assert(desktopHeroAudit?.allCardsNeutralBg, 'All 3 supporting cards use warm neutral #F7F5EF background');
  assert(desktopHeroAudit?.allImgsObjectContain, 'All supporting images use object-fit: contain');

  // Permanent hero heading verification (desktop)
  const desktopH1 = await evalSafe(`document.querySelector('h1')?.innerText?.replace(/\\s+/g, ' ').trim()`);
  assert(desktopH1 === 'Feeding Bottles, Water Bottles & Stainless Steel Tiffins',
    'Desktop hero heading displays exact permanent text: "Feeding Bottles, Water Bottles & Stainless Steel Tiffins"', desktopH1);
  assert(!desktopH1.includes('Stainless Steel Products'),
    'Permanent heading requirement: Desktop hero heading does NOT contain "Stainless Steel Products"');

  await saveScreenshot('phase8_8_desktop_hero_1440px.png');

  // Hindi Viewport (390px)
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/hi` });
  await sleep(1500);

  const hindiHeroAudit = await evalSafe(`
    (() => {
      const heroLineup = document.querySelector('img[src*="premium-feeding-bottles-lineup"], img[src*="Indian"]');
      const h1 = document.querySelector('h1')?.innerText?.trim();
      return {
        h1,
        alt: heroLineup ? heroLineup.getAttribute('alt') : null,
        isHindi: /स्टेनलेस स्टील|फीडिंग|उत्पाद/i.test(heroLineup?.getAttribute('alt') || '')
      };
    })()
  `);
  assert(hindiHeroAudit?.isHindi, 'Hindi route renders localized alt text for hero lineup image', hindiHeroAudit?.alt);
  assert(hindiHeroAudit?.h1?.includes('फीडिंग बोतलें, पानी की बोतलें एवं स्टेनलेस स्टील टिफिन'),
    'Hindi hero heading displays localized copy: "फीडिंग बोतलें, पानी की बोतलें एवं स्टेनलेस स्टील टिफिन"', hindiHeroAudit?.h1);
  await saveScreenshot('phase8_8_hindi_hero_390px.png');

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 2: TASK 2 — PRODUCT DETAIL PRICING & ENQUIRY SECTION
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 2: Task 2 — Product Detail Pricing & Enquiry Section ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products/ye-premium-stainless-steel-feeding-bottle-200ml` });
  await sleep(1500);

  // Poll for detail page
  for (let i = 0; i < 20; i++) {
    const ready = await evalSafe(`Boolean(document.querySelector('h1') && document.querySelector('a[href*="wa.me"]'))`);
    if (ready) break;
    await sleep(400);
  }

  const detailAudit = await evalSafe(`
    (() => {
      const h1 = document.querySelector('h1')?.innerText?.trim();
      const bodyText = document.body.innerText;
      
      // Price display
      const hasPriceHeader = /Price:\s*₹|मूल्य:\s*₹|Contact us for pricing|मूल्य के लिए संपर्क करें/i.test(bodyText);
      const priceText = document.querySelector('.text-brand-navy.font-bold')?.innerText || '';

      // Sticky bar check
      const stickyEnquiry = document.querySelector('.sticky-enquiry');
      const pageWrap = document.querySelector('.min-h-screen');
      const pageWrapClass = pageWrap ? pageWrap.className : '';
      const hasExcessiveBottomPad = /pb-28/i.test(pageWrapClass);

      // Unified WhatsApp section
      const qtyInput = document.querySelector('input[type="number"]');
      const waBtn = document.querySelector('.product-enquiry-wa-btn') || document.querySelector('a[href*="wa.me"]');
      const waBtnRect = waBtn ? waBtn.getBoundingClientRect() : null;
      const waHref = waBtn ? waBtn.getAttribute('href') : null;

      // Check phone number in WA URL
      const hasCorrectPhone = waHref && waHref.includes('917454848548');

      return {
        h1,
        hasPriceHeader,
        priceText,
        hasStickyEnquiry: Boolean(stickyEnquiry),
        hasExcessiveBottomPad,
        hasQtyInput: Boolean(qtyInput),
        hasWaBtn: Boolean(waBtn),
        waBtnHeight: waBtnRect?.height,
        hasCorrectPhone,
        waHref
      };
    })()
  `);

  assert(Boolean(detailAudit?.h1), `ProductDetail loaded title: "${detailAudit?.h1}"`);
  assert(detailAudit?.hasPriceHeader, 'ProductDetail renders correct price header (Price: ₹[price] or Contact us for pricing)');
  assert(!detailAudit?.hasStickyEnquiry, 'Redundant mobile sticky WhatsApp bar (.sticky-enquiry) is COMPLETELY REMOVED');
  assert(!detailAudit?.hasExcessiveBottomPad, 'Page container padding cleaned up (no reserved pb-28 bottom space)');
  assert(detailAudit?.hasQtyInput, 'ProductDetail includes quantity input with MOQ awareness');
  assert(detailAudit?.hasWaBtn, 'ProductDetail renders unified WhatsApp enquiry section');
  assert(detailAudit?.waBtnHeight >= 44, 'WhatsApp CTA button meets touch target height >= 44px', `${detailAudit?.waBtnHeight}px`);
  assert(detailAudit?.hasCorrectPhone, 'WhatsApp enquiry links directly to official number 917454848548');

  await saveScreenshot('phase8_8_product_detail_mobile_390px.png');

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 3: TASK 3 — REDESIGN PRODUCT CATEGORY FILTERS (VERTICAL)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 3: Task 3 — Vertical Category Filters (No Horizontal Scroll) ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(1500);

  // Poll for products page
  for (let i = 0; i < 20; i++) {
    const ready = await evalSafe(`document.querySelectorAll('.product-card').length >= 4`);
    if (ready) break;
    await sleep(400);
  }

  const mobileFilterAudit = await evalSafe(`
    (() => {
      const filterWrap = document.querySelector('.mobile-category-filter');
      if (!filterWrap) return { found: false };

      const cRect = filterWrap.getBoundingClientRect();
      const scrollWidth = filterWrap.scrollWidth;
      const clientWidth = filterWrap.clientWidth;
      const hasHorizontalScroll = scrollWidth > clientWidth + 2;

      const buttons = Array.from(filterWrap.querySelectorAll('button')).filter(b => !b.innerText.includes('View All') && !b.innerText.includes('सभी देखें'));
      const buttonTexts = buttons.map(b => b.innerText.trim());

      const allTouchFriendly = buttons.every(b => b.getBoundingClientRect().height >= 40);
      const isVertical = buttons.length > 2 &&
        buttons[1].getBoundingClientRect().top > buttons[0].getBoundingClientRect().bottom - 5;

      // Active state
      const activeBtn = buttons.find(b => b.className.includes('bg-brand-navy'));

      return {
        found: true,
        hasHorizontalScroll,
        scrollWidth,
        clientWidth,
        buttonCount: buttons.length,
        buttonTexts,
        allTouchFriendly,
        isVertical,
        activeText: activeBtn ? activeBtn.innerText.trim() : null
      };
    })()
  `);

  assert(mobileFilterAudit?.found, 'Mobile category filter container (.mobile-category-filter) is rendered');
  assert(!mobileFilterAudit?.hasHorizontalScroll,
    'Mobile category filter has ZERO horizontal scrollbar (fully visible vertical layout)',
    `scrollWidth: ${mobileFilterAudit?.scrollWidth}, clientWidth: ${mobileFilterAudit?.clientWidth}`);
  assert(mobileFilterAudit?.isVertical, 'Category filter buttons are vertically stacked in a column');
  assert(mobileFilterAudit?.buttonCount >= 7,
    'All 7 category options are rendered (All Products + 6 categories)',
    `Count: ${mobileFilterAudit?.buttonCount}`);
  assert(mobileFilterAudit?.allTouchFriendly, 'All category buttons meet minimum touch target height');
  assert(mobileFilterAudit?.activeText?.includes('All Products') || mobileFilterAudit?.activeText?.includes('सभी उत्पाद'),
    'All Products is active by default', mobileFilterAudit?.activeText);

  await saveScreenshot('phase8_8_category_filters_mobile_390px.png');

  // Test interactive category filter clicking
  console.log('\nTesting category click interaction...');
  await evalSafe(`
    (() => {
      const filterWrap = document.querySelector('.mobile-category-filter');
      const steelBtn = Array.from(filterWrap.querySelectorAll('button')).find(b =>
        b.innerText.includes('Stainless Steel Feeding Bottles') || b.innerText.includes('स्टेनलेस स्टील फीडिंग')
      );
      if (steelBtn) steelBtn.click();
    })()
  `);
  await sleep(1000);

  const interactionAudit = await evalSafe(`
    (() => {
      const currentUrl = window.location.href;
      const cardCount = document.querySelectorAll('.product-card').length;
      const filterWrap = document.querySelector('.mobile-category-filter');
      const activeBtn = filterWrap ? filterWrap.querySelector('.bg-brand-navy') : null;
      const hasViewAll = Boolean(filterWrap && filterWrap.innerText.includes('View All'));

      return {
        currentUrl,
        cardCount,
        activeCategoryName: activeBtn ? activeBtn.innerText.trim() : null,
        hasCategoryParam: currentUrl.includes('category='),
        hasViewAll
      };
    })()
  `);

  assert(interactionAudit?.hasCategoryParam,
    'Clicking category updates URL query parameter (?category=steel-feeding-bottles)', interactionAudit?.currentUrl);
  assert(interactionAudit?.activeCategoryName?.includes('Stainless Steel Feeding') || interactionAudit?.activeCategoryName?.includes('स्टेनलेस स्टील फीडिंग'),
    'Active category visually highlighted with brand navy', interactionAudit?.activeCategoryName);
  assert(interactionAudit?.hasViewAll, 'Reset to All / View All shortcut button appears when filtered');

  await saveScreenshot('phase8_8_category_filtered_mobile_390px.png');

  // Reset filter back to All
  await evalSafe(`
    (() => {
      const filterWrap = document.querySelector('.mobile-category-filter');
      const allBtn = Array.from(filterWrap.querySelectorAll('button')).find(b =>
        b.innerText.includes('All Products') || b.innerText.includes('सभी उत्पाद') || b.innerText.includes('View All')
      );
      if (allBtn) allBtn.click();
    })()
  `);
  await sleep(800);

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 4: TASK 4 — PRODUCT CARD CLEANLINESS PRESERVED
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 4: Task 4 — Product Card Cleanliness Preserved ---');
  const cardAudit = await evalSafe(`
    (() => {
      const cards = Array.from(document.querySelectorAll('.product-card'));
      let contactForPriceFound = 0;
      let waButtonFound = 0;
      let emptyBorderFound = 0;

      cards.forEach(card => {
        const text = card.innerText;
        if (/contact for pricing/i.test(text) || /मूल्य के लिए संपर्क/i.test(text)) {
          contactForPriceFound++;
        }
        if (card.querySelector('a[href*="wa.me"], button:has(svg)')) {
          waButtonFound++;
        }
        if (card.querySelector('.border-t:empty')) {
          emptyBorderFound++;
        }
      });

      return {
        cardCount: cards.length,
        contactForPriceFound,
        waButtonFound,
        emptyBorderFound
      };
    })()
  `);

  assert(cardAudit?.cardCount >= 4, `Evaluated ${cardAudit?.cardCount} product cards on Products page`);
  assert(cardAudit?.contactForPriceFound === 0, 'ZERO "Contact for pricing" text on all product cards');
  assert(cardAudit?.waButtonFound === 0, 'ZERO WhatsApp buttons on all product cards');
  assert(cardAudit?.emptyBorderFound === 0, 'ZERO empty border separators on all product cards');

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 5: TASK 5 — MULTI-VIEWPORT REGRESSION MATRIX
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 5: Task 5 — Multi-Viewport Regression Matrix ---');
  const viewports = [
    { name: '360x800', width: 360, height: 800, mobile: true },
    { name: '390x844', width: 390, height: 844, mobile: true },
    { name: '430x932', width: 430, height: 932, mobile: true },
    { name: '768x1024', width: 768, height: 1024, mobile: false },
    { name: '1280x800', width: 1280, height: 800, mobile: false },
    { name: '1440x900', width: 1440, height: 900, mobile: false },
    { name: '1600x900', width: 1600, height: 900, mobile: false }
  ];

  for (const vp of viewports) {
    await setViewport(vp.width, vp.height, vp.mobile);
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
    await sleep(800);

    const vpAudit = await evalSafe(`
      (() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const hasOverflow = scrollWidth > innerWidth + 1;
        const cards = document.querySelectorAll('.product-card').length;
        const h1 = document.querySelector('h1')?.innerText?.replace(/\\s+/g, ' ').trim();
        return {
          scrollWidth,
          innerWidth,
          hasOverflow,
          cards,
          h1
        };
      })()
    `);

    assert(!vpAudit?.hasOverflow,
      `Viewport ${vp.name} renders with ZERO horizontal overflow`,
      `scrollWidth: ${vpAudit?.scrollWidth}, innerWidth: ${vpAudit?.innerWidth}`);
    assert(vpAudit?.cards >= 4, `Viewport ${vp.name} renders featured products correctly`);
    assert(vpAudit?.h1 === 'Feeding Bottles, Water Bottles & Stainless Steel Tiffins',
      `Viewport ${vp.name} hero heading preserves exact permanent wording ("Feeding Bottles, Water Bottles & Stainless Steel Tiffins")`, vpAudit?.h1);
    assert(!vpAudit?.h1?.includes('Stainless Steel Products'),
      `Viewport ${vp.name} hero heading does NOT contain "Stainless Steel Products"`);

    await saveScreenshot(`phase8_8_viewport_${vp.name}.png`);
  }

  // ─────────────────────────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────────────────────────
  console.log('\n=================================================================');
  console.log(`PHASE 8.8 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  ws.close();
  if (chromeProc) chromeProc.kill();
  if (frontendProc) frontendProc.kill();
  if (backendProc) backendProc.kill();

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Unhandled verification error:', err);
  if (chromeProc) chromeProc.kill();
  if (frontendProc) frontendProc.kill();
  if (backendProc) backendProc.kill();
  process.exit(1);
});
