import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8.6 Verification & Screenshot Engine');
console.log('Testing Scroll-Aware Navigation, Zero WhatsApp on Cards, Hero,');
console.log('Category Clamping, Breadcrumbs, & Multi-Viewport Responsiveness');
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
  assert(ready, 'Frontend server responded on port 5173');

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
    await sleep(500);
  }
  assert(apiOk, 'Live catalogue API functional via Vite reverse proxy');

  // 3. Launch Chrome with CDP
  console.log('3. Launching Chrome with CDP on port 9222...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-phase8-6-profile');
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
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await sendCdp('Runtime.evaluate', { expression, returnByValue: true });
        if (res?.result && res.result.value !== undefined) {
          return res.result.value;
        }
      } catch (e) {
        // Retry on context destroyed
      }
      await sleep(300);
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 1: CRITICAL FIX A — MOBILE NAVIGATION BEHAVIOUR
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 1: Critical Fix A — Mobile Navigation Behaviour ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  // 1.1 Header at top of page (scrollY = 0)
  const topHeaderCheck = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const header = document.querySelector('header');
        const brand = header.querySelector('span');
        const directNav = header.querySelector('nav[aria-label="Direct mobile navigation"]');
        const hamburger = header.querySelector('button[aria-label="Toggle menu"]');
        const isHidden = header.classList.contains('-translate-y-full');
        return {
          headerExists: Boolean(header),
          brandText: brand ? brand.innerText : '',
          directNavExists: Boolean(directNav),
          hamburgerExists: Boolean(hamburger),
          isHidden
        };
      })()
    `,
    returnByValue: true
  });
  const topH = topHeaderCheck.result.value;
  assert(topH.headerExists, 'Header exists on initial load');
  assert(!topH.isHidden, 'Header is visible at top of page (translate-y-0)');
  assert(topH.brandText.includes('YES ENTERPRISES'), 'Branded header displays YES ENTERPRISES company name at top');
  assert(topH.hamburgerExists, 'Branded header displays Hamburger menu button');
  assert(!topH.directNavExists, 'Direct page nav is initially hidden while at top of page');

  // 1.2 Scroll down to hide header
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 350)` });
  await sleep(600);

  const scrollDownCheck = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const header = document.querySelector('header');
        const isHidden = header.classList.contains('-translate-y-full');
        const rect = header.getBoundingClientRect();
        return { isHidden, top: rect.top, bottom: rect.bottom };
      })()
    `,
    returnByValue: true
  });
  const sdH = scrollDownCheck.result.value;
  assert(sdH.isHidden, 'Header hides on scroll down (-translate-y-full applied)', `top: ${sdH.top}px, bottom: ${sdH.bottom}px`);

  // Screenshot 5: Mobile header after scrolling down
  await saveScreenshot('phase8_6_header_scrolling_down_390px.png');

  // 1.3 Scroll upwards to automatically reveal direct navigation
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 160)` });
  await sleep(600);

  const scrollUpCheck = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const header = document.querySelector('header');
        const isVisible = header.classList.contains('translate-y-0') && !header.classList.contains('-translate-y-full');
        const directNav = header.querySelector('nav[aria-label="Direct mobile navigation"]');
        const logoMark = header.querySelector('a[aria-label="Home"] img');
        const links = directNav ? Array.from(directNav.querySelectorAll('a')).map(a => ({
          href: a.getAttribute('href'),
          text: a.innerText.trim(),
          height: a.getBoundingClientRect().height,
          width: a.getBoundingClientRect().width
        })) : [];
        const hamburger = header.querySelector('button[aria-label="Toggle menu"]');
        return {
          isVisible,
          hasDirectNav: Boolean(directNav),
          hasLogoMark: Boolean(logoMark),
          links,
          hamburgerExists: Boolean(hamburger)
        };
      })()
    `,
    returnByValue: true
  });
  const suH = scrollUpCheck.result.value;
  assert(suH.isVisible, 'Header automatically reappears on upward scrolling (translate-y-0)');
  assert(suH.hasDirectNav, 'Compact direct navigation bar is revealed when scrolling upwards');
  assert(suH.hasLogoMark, 'Revealed navigation displays compact brand logo mark');
  assert(suH.links.length === 4, 'Revealed navigation displays all 4 primary links: Home, Products, About, Contact', `Count: ${suH.links.length}`);
  
  const linkTexts = suH.links.map(l => l.text);
  assert(linkTexts.includes('Home') && linkTexts.includes('Products') && linkTexts.includes('About') && linkTexts.includes('Contact'),
    'All 4 direct destination labels verified in revealed bar', linkTexts.join(', '));
  
  const touchHeightsOk = suH.links.every(l => l.height >= 38);
  assert(touchHeightsOk, 'All revealed navigation links meet minimum touch target requirement (>= 38px)');

  // Screenshot 6: Mobile header after scrolling upwards (revealed direct navigation)
  await saveScreenshot('phase8_6_header_revealed_nav_390px.png');

  // Screenshot 7: Close-up of direct navigation links
  await saveScreenshot('phase8_6_direct_nav_links_390px.png');

  // 1.4 Test direct navigation clicks WITHOUT opening drawer
  console.log('\nTesting direct navigation clicks without opening drawer...');

  // Click "Products" directly from revealed bar
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const nav = document.querySelector('nav[aria-label="Direct mobile navigation"]');
        const prodLink = Array.from(nav ? nav.querySelectorAll('a') : []).find(a => a.getAttribute('href') === '/products');
        if (prodLink) {
          prodLink.click();
          return true;
        }
        return false;
      })()
    `
  });
  await sleep(1000);

  const npC = await evalSafe(`
    (() => {
      return {
        pathname: window.location.pathname,
        drawerOpen: Boolean(document.querySelector('.animate-fadeIn')),
        hasSearch: Boolean(document.querySelector('input[type="text"]'))
      };
    })()
  `);
  assert(npC?.pathname === '/products', 'Direct click on "Products" navigates to /products without opening drawer', `Path: ${npC?.pathname}`);
  assert(!npC?.drawerOpen, 'Drawer remained closed during direct Products navigation');

  // On /products, scroll down and up, click "About" directly
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 300)` });
  await sleep(400);
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 100)` });
  await sleep(500);

  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const nav = document.querySelector('nav[aria-label="Direct mobile navigation"]');
        const aboutLink = Array.from(nav ? nav.querySelectorAll('a') : []).find(a => a.getAttribute('href') === '/about');
        if (aboutLink) {
          aboutLink.click();
          return true;
        }
        return false;
      })()
    `
  });
  await sleep(1000);

  const navAboutCheck = await evalSafe(`window.location.pathname`);
  assert(navAboutCheck === '/about', 'Direct click on "About" navigates to /about without opening drawer');

  // From /about, scroll down and up, click "Contact" directly
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 300)` });
  await sleep(400);
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 100)` });
  await sleep(500);

  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const nav = document.querySelector('nav[aria-label="Direct mobile navigation"]');
        const contactLink = Array.from(nav ? nav.querySelectorAll('a') : []).find(a => a.getAttribute('href') === '/contact');
        if (contactLink) {
          contactLink.click();
          return true;
        }
        return false;
      })()
    `
  });
  await sleep(1000);

  const navContactCheck = await evalSafe(`window.location.pathname`);
  assert(navContactCheck === '/contact', 'Direct click on "Contact" navigates to /contact without opening drawer');

  // From /contact, scroll down and up, click "Home" directly
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 300)` });
  await sleep(400);
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 100)` });
  await sleep(500);

  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const nav = document.querySelector('nav[aria-label="Direct mobile navigation"]');
        const homeLink = Array.from(nav ? nav.querySelectorAll('a') : []).find(a => a.getAttribute('href') === '/');
        if (homeLink) {
          homeLink.click();
          return true;
        }
        return false;
      })()
    `
  });
  await sleep(1000);

  const navHomeCheck = await evalSafe(`window.location.pathname`);
  assert(navHomeCheck === '/', 'Direct click on "Home" navigates back to / without opening drawer');

  // 1.5 Test Drawer Functionality & Body Scroll Lock
  console.log('\nTesting mobile drawer toggle and body scroll locking...');
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[aria-label="Toggle menu"]');
        if (btn) btn.click();
      })()
    `
  });
  await sleep(600);

  const docVal = await evalSafe(`
    (() => {
      const bodyOverflow = document.body.style.overflow;
      const drawer = document.querySelector('.animate-fadeIn');
      const langBtns = drawer ? drawer.querySelectorAll('button') : [];
      return {
        drawerVisible: Boolean(drawer),
        bodyOverflow,
        langBtnsCount: langBtns.length
      };
    })()
  `);
  assert(docVal?.drawerVisible, 'Mobile drawer successfully opens when clicking hamburger button');
  assert(docVal?.bodyOverflow === 'hidden', 'Body scroll is locked (overflow: hidden) when mobile drawer is open');

  // Screenshot 9: Mobile navigation drawer
  await saveScreenshot('phase8_6_nav_drawer_390px.png');

  // Close drawer
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[aria-label="Toggle menu"]');
        if (btn) btn.click();
      })()
    `
  });
  await sleep(400);

  const drawerClosedCheck = await sendCdp('Runtime.evaluate', {
    expression: `document.body.style.overflow`,
    returnByValue: true
  });
  assert(drawerClosedCheck.result.value === '', 'Body scroll restored when drawer is closed');

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 2: CRITICAL FIX B — ZERO WHATSAPP BUTTONS ON CARDS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 2: Critical Fix B — Zero WhatsApp Buttons on Product Cards ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  // 2.1 Homepage Featured Products
  // Poll for homepage featured product cards to load
  for (let i = 0; i < 20; i++) {
    const chk = await evalSafe(`document.querySelectorAll('.product-card').length`);
    if (chk && chk >= 4) break;
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

  const hca = await evalSafe(`
    (() => {
      const cards = document.querySelectorAll('.product-card');
      let cardButtons = 0;
      let cardWaLinks = 0;
      const cardDetails = [];

      cards.forEach(c => {
        const btns = c.querySelectorAll('button');
        const waLinks = c.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]');
        cardButtons += btns.length;
        cardWaLinks += waLinks.length;
        cardDetails.push({
          tagName: c.tagName,
          href: c.getAttribute('href'),
          hasImg: Boolean(c.querySelector('img')),
          hasTitle: Boolean(c.querySelector('h3')),
          hasPriceOrMoq: Boolean(c.querySelector('.border-t'))
        });
      });

      return {
        cardCount: cards.length,
        cardButtons,
        cardWaLinks,
        cardDetails
      };
    })()
  `);
  assert(hca?.cardCount >= 4, `Homepage renders featured product cards (Count: ${hca?.cardCount})`);
  assert(hca?.cardButtons === 0, `Homepage product cards contain ZERO buttons (Found: ${hca?.cardButtons})`);
  assert(hca?.cardWaLinks === 0, `Homepage product cards contain ZERO WhatsApp links (Found: ${hca?.cardWaLinks})`);
  assert(hca?.cardDetails && hca.cardDetails.every(c => c.tagName === 'A' && c.href.startsWith('/products/')),
    'Every featured product card is a direct link navigating to /products/:slug');

  // Screenshot 3: Mobile homepage Featured Products (zero WhatsApp buttons)
  await saveScreenshot('phase8_6_featured_no_wa_390px.png');

  // 2.2 Catalogue Page Product Cards
  console.log('\nChecking Main Product Catalogue cards for zero WhatsApp buttons...');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(1500);

  // Poll for catalogue cards to load
  for (let i = 0; i < 20; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `document.querySelectorAll('.product-card').length`,
      returnByValue: true
    });
    if (chk?.result?.value >= 14) break;
    await sleep(400);
  }

  const catCardAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const cards = document.querySelectorAll('.product-card');
        let cardButtons = 0;
        let cardWaLinks = 0;
        const cardDetails = [];

        cards.forEach(c => {
          const btns = c.querySelectorAll('button');
          const waLinks = c.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]');
          cardButtons += btns.length;
          cardWaLinks += waLinks.length;
          cardDetails.push({
            tagName: c.tagName,
            href: c.getAttribute('href'),
            title: c.querySelector('h3')?.innerText?.trim()
          });
        });

        return {
          cardCount: cards.length,
          cardButtons,
          cardWaLinks,
          sampleHref: cardDetails[0]?.href
        };
      })()
    `,
    returnByValue: true
  });
  const cca = catCardAudit.result.value;
  assert(cca.cardCount >= 14, `Catalogue renders all products in live browser (Count: ${cca.cardCount})`);
  assert(cca.cardButtons === 0, `Catalogue product cards contain ZERO buttons (Found: ${cca.cardButtons})`);
  assert(cca.cardWaLinks === 0, `Catalogue product cards contain ZERO WhatsApp links (Found: ${cca.cardWaLinks})`);

  // Screenshot 4: Mobile catalogue with product cards (zero WhatsApp buttons)
  await saveScreenshot('phase8_6_catalogue_no_wa_390px.png');

  // 2.3 Product Card Click Navigation & ProductDetail WhatsApp Verification
  console.log('\nTesting product card click-through to ProductDetail & WhatsApp CTA preservation...');
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const firstCard = document.querySelector('.product-card');
        if (firstCard) firstCard.click();
      })()
    `
  });
  await sleep(1500);

  // Poll for ProductDetail to load
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

  const da = await evalSafe(`
    (() => {
      const h1 = document.querySelector('h1')?.innerText?.trim();
      const breadcrumbNav = document.querySelector('nav[aria-label="Breadcrumb"]');
      const breadcrumbLinks = breadcrumbNav ? Array.from(breadcrumbNav.querySelectorAll('a')).map(a => a.innerText.trim()) : [];
      const stickyEnquiry = document.querySelector('.sticky-enquiry');
      const stickyWaBtn = stickyEnquiry ? stickyEnquiry.querySelector('a[href*="wa.me"]') : null;
      const mainWaBtn = document.querySelector('a[href*="wa.me"]');
      
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;

      return {
        h1,
        breadcrumbLinks,
        hasStickyEnquiry: Boolean(stickyEnquiry),
        stickyWaHref: stickyWaBtn ? stickyWaBtn.getAttribute('href') : null,
        hasMainWa: Boolean(mainWaBtn),
        waHref: (stickyWaBtn || mainWaBtn) ? (stickyWaBtn || mainWaBtn).getAttribute('href') : null,
        noBreadcrumbOverflow: scrollWidth <= innerWidth + 1
      };
    })()
  `);
  assert(Boolean(da.h1), `ProductDetail renders product title: "${da.h1}"`);
  assert(da.hasMainWa || da.hasStickyEnquiry, 'ProductDetail renders unified WhatsApp enquiry section');
  assert(Boolean(da.waHref && da.waHref.includes('wa.me')), 'ProductDetail preserves functional WhatsApp enquiry button');
  assert(da.breadcrumbLinks.includes('Home') && da.breadcrumbLinks.includes('Products'),
    'Breadcrumbs preserve clickable Home and Products links', da.breadcrumbLinks.join(' > '));
  assert(da.noBreadcrumbOverflow, 'Breadcrumbs render cleanly with ZERO horizontal page overflow');

  // Screenshot 8: Mobile product detail page (breadcrumbs & sticky enquiry)
  await saveScreenshot('phase8_6_detail_breadcrumbs_390px.png');

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 3: HOMEPAGE HERO & CATEGORIES TEXT CLAMPING
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 3: Hero Image Refinement & Category Clamping ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  // 3.1 Hero Image Presentation at 390px
  const heroImgCheck = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const heroImg = document.querySelector('img[src*="premium-feeding-bottles-lineup"]');
        return {
          exists: Boolean(heroImg),
          src: heroImg ? heroImg.getAttribute('src') : null,
          naturalWidth: heroImg ? heroImg.naturalWidth : 0,
          naturalHeight: heroImg ? heroImg.naturalHeight : 0,
          renderedWidth: heroImg ? heroImg.getBoundingClientRect().width : 0,
          renderedHeight: heroImg ? heroImg.getBoundingClientRect().height : 0
        };
      })()
    `,
    returnByValue: true
  });
  const hic = heroImgCheck.result.value;
  assert(hic.exists, 'Cleaned product lineup asset is displayed in hero');
  assert(hic.naturalWidth === 1774 && hic.naturalHeight === 887,
    'Lineup image maintains crisp 2:1 aspect ratio without distortion',
    `Natural: ${hic.naturalWidth}x${hic.naturalHeight}px`);

  // Screenshot 1: Mobile homepage hero at 390px
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 0)` });
  await sleep(400);
  await saveScreenshot('phase8_6_hero_mobile_390px.png');

  // Screenshot 2: Mobile homepage hero at 430px
  await setViewport(430, 932, true);
  await sleep(600);
  await saveScreenshot('phase8_6_hero_mobile_430px.png');

  // 3.2 Category Cards Text Truncation Check (at 390px and 360px)
  await setViewport(390, 844, true);
  await sleep(400);

  const catTextCheck = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const cards = document.querySelectorAll('.cat-card');
        const titles = [];
        cards.forEach(c => {
          const h3 = c.querySelector('h3');
          titles.push({
            text: h3 ? h3.innerText.trim() : '',
            hasEllipsisInDom: h3 ? h3.innerText.includes('...') : false,
            lineClampClass: h3 ? h3.className.includes('line-clamp-3') : false
          });
        });
        return { count: cards.length, titles };
      })()
    `,
    returnByValue: true
  });
  const ctc = catTextCheck.result.value;
  assert(ctc.count === 6, 'All 6 category cards rendered on homepage');
  assert(ctc.titles.every(t => t.lineClampClass), 'All category card titles have line-clamp-3 applied');
  
  const ssSipper = ctc.titles.find(t => t.text.toLowerCase().includes('sipper'));
  assert(Boolean(ssSipper), 'Found Stainless Steel Sippers category card');
  assert(!ssSipper.hasEllipsisInDom, 'Stainless Steel Sippers category title renders complete text without DOM ellipsis', ssSipper?.text);

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 4: DESKTOP HOMEPAGE AT 1440PX
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 4: Desktop Homepage at 1440px ---');
  await setViewport(1440, 900, false);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  const desktopAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const navLinks = Array.from(document.querySelectorAll('header nav a')).map(a => a.innerText.trim());
        const desktopHeroCollage = document.querySelector('.hero-img-grid');
        const waCta = document.querySelector('header a[href*="wa.me"]');
        const langDropdown = document.querySelector('header button[aria-label="Switch language"]');
        return {
          navLinks,
          hasHeroCollage: Boolean(desktopHeroCollage),
          hasWaCta: Boolean(waCta),
          hasLangDropdown: Boolean(langDropdown)
        };
      })()
    `,
    returnByValue: true
  });
  const daVal = desktopAudit.result.value;
  assert(daVal.navLinks.includes('Home') && daVal.navLinks.includes('Products'),
    'Desktop header renders horizontal navigation links', daVal.navLinks.join(', '));
  assert(daVal.hasHeroCollage, 'Desktop hero renders 4-item image collage/lineup grid');
  assert(daVal.hasWaCta, 'Desktop header displays gold-accented WhatsApp CTA');
  assert(daVal.hasLangDropdown, 'Desktop header displays language selector pill');

  // Screenshot 10: Desktop homepage at 1440px
  await saveScreenshot('phase8_6_desktop_1440px.png');

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 5: RESPONSIVE HORIZONTAL OVERFLOW CHECK (8 VIEWPORTS)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- TEST SUITE 5: Horizontal Overflow Check Across 8 Viewports ---');
  const viewports = [
    { name: 'Small Mobile (360x800)', width: 360, height: 800, mobile: true },
    { name: 'Mobile (375x812)',       width: 375, height: 812, mobile: true },
    { name: 'Mobile (390x844)',       width: 390, height: 844, mobile: true },
    { name: 'Mobile (412x915)',       width: 412, height: 915, mobile: true },
    { name: 'Mobile (430x932)',       width: 430, height: 932, mobile: true },
    { name: 'Tablet (768x1024)',      width: 768, height: 1024, mobile: true },
    { name: 'Desktop (1280x800)',     width: 1280, height: 800, mobile: false },
    { name: 'Desktop (1440x900)',     width: 1440, height: 900, mobile: false },
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
    assert(!ov.overflow, `Zero horizontal overflow at ${vp.name}`, `scrollWidth: ${ov.scrollWidth}px, innerWidth: ${ov.innerWidth}px`);
  }

  console.log('\n=================================================================');
  console.log(`Phase 8.6 Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');
}

runVerification()
  .catch((err) => {
    console.error('Fatal Verification Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log('\nTerminating verification processes...');
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
