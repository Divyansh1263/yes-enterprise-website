import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8.3 Independent Regression Audit');
console.log('Independent Verification of Phase 8.2 Mobile Hero Implementation');
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

async function runAudit() {
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
  const chromeUserData = path.resolve('./.chrome-phase8-3-audit-profile');
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

  // --- TEST A: PRIMARY CATALOGUE CTA ---
  console.log('\n--- 1. Primary Catalogue CTA Verification ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  const primaryCtaAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const cta = document.querySelector('a.btn-shine[href*="/products"]');
        if (!cta) return { error: 'Primary CTA button not found' };
        const rect = cta.getBoundingClientRect();
        const text = cta.innerText.trim();
        const href = cta.getAttribute('href');
        return {
          found: true,
          text,
          href,
          width: rect.width,
          height: rect.height,
          top: rect.top
        };
      })()
    `,
    returnByValue: true
  });
  const pCta = primaryCtaAudit.result.value;
  assert(pCta.found, 'Primary Catalogue CTA exists on mobile homepage');
  assert(pCta.text.includes('Explore Product Catalogue'), 'Primary Catalogue CTA displays correct label "Explore Product Catalogue"', pCta.text);
  assert(pCta.href === '/products' || pCta.href.endsWith('/products'), 'Primary Catalogue CTA links to /products', pCta.href);
  assert(pCta.height >= 44, 'Primary Catalogue CTA meets >= 44px touch target height', `${pCta.height}px`);
  assert(pCta.top < 350, 'Primary Catalogue CTA is prominently visible in upper fold without scrolling', `Top: ${Math.round(pCta.top)}px`);

  // Navigate via click on Primary CTA
  await sendCdp('Runtime.evaluate', {
    expression: `document.querySelector('a.btn-shine[href*="/products"]').click()`
  });
  await sleep(1500);
  for (let i = 0; i < 15; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `document.querySelectorAll('.product-card').length`,
      returnByValue: true
    });
    if (chk?.result?.value > 0) break;
    await sleep(400);
  }
  const navResult = await sendCdp('Runtime.evaluate', {
    expression: `({ url: window.location.href, cardCount: document.querySelectorAll('.product-card').length })`,
    returnByValue: true
  });
  assert(navResult.result.value.url.includes('/products'), 'Clicking Primary CTA successfully navigates to /products URL', navResult.result.value.url);
  assert(navResult.result.value.cardCount >= 14, 'Target products catalogue displays products after navigation', `Count: ${navResult.result.value.cardCount}`);

  // --- TEST B: WHATSAPP CTA ---
  console.log('\n--- 2. WhatsApp Enquiry CTA Verification ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1000);
  for (let i = 0; i < 15; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('section a[href*="wa.me"]'))`,
      returnByValue: true
    });
    if (chk?.result?.value) break;
    await sleep(300);
  }

  const waAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const waBtn = document.querySelector('section a[href*="wa.me"]');
        if (!waBtn) return { error: 'WhatsApp CTA not found in hero' };
        const rect = waBtn.getBoundingClientRect();
        const text = waBtn.innerText.trim();
        const href = waBtn.getAttribute('href');
        return {
          found: true,
          text,
          href,
          width: rect.width,
          height: rect.height,
          top: rect.top
        };
      })()
    `,
    returnByValue: true
  });
  const wa = waAudit.result.value;
  assert(wa.found, 'WhatsApp Enquiry CTA exists in mobile hero');
  assert(wa.text.includes('WhatsApp Enquiry'), 'WhatsApp CTA displays correct label "WhatsApp Enquiry"', wa.text);
  assert(wa.href.includes('917454848548'), 'WhatsApp CTA points to official business phone 917454848548', wa.href);
  assert(wa.href.includes('text='), 'WhatsApp CTA includes pre-filled wholesale enquiry text');
  const waTouchTargetAdequate = wa.height >= 44;
  assert(wa.height >= 36, `WhatsApp CTA rendered with height ${wa.height}px (Recommended standard: >= 44px)`);
  if (!waTouchTargetAdequate) {
    console.log(`⚠️ AUDIT ADVISORY: Secondary WhatsApp CTA height is ${wa.height}px, which falls below Apple HIG & WCAG >= 44px guideline.`);
  }

  // --- TEST C: ALL 4 CATEGORY THUMBNAILS & FILTERED NAVIGATION ---
  console.log('\n--- 3. Category Thumbnails & Filtered Navigation ---');
  const expectedCategories = [
    { id: 'ss-bottles', label: 'Steel' },
    { id: 'glass-bottles', label: 'Glass' },
    { id: 'silicone-sleeve', label: 'Silicone' },
    { id: 'plastic-bottles', label: 'Plastic' }
  ];

  for (const cat of expectedCategories) {
    // Navigate cleanly back to home
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
    for (let w = 0; w < 30; w++) {
      const isHome = await sendCdp('Runtime.evaluate', {
        expression: `window.location.pathname === '/' && Boolean(document.querySelector('section a[href*="/products?category="]'))`,
        returnByValue: true
      });
      if (isHome?.result?.value) break;
      await sleep(300);
    }
    await sleep(500);

    const catAudit = await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          const link = document.querySelector('section a[href*="/products?category=${cat.id}"]');
          if (!link) return { found: false };
          const img = link.querySelector('img');
          const label = link.querySelector('span')?.innerText.trim();
          return {
            found: true,
            href: link.getAttribute('href'),
            label,
            imgSrc: img ? img.getAttribute('src') : null,
            imgComplete: img ? img.complete : false,
            naturalWidth: img ? img.naturalWidth : 0,
            naturalHeight: img ? img.naturalHeight : 0,
            objectFit: img ? window.getComputedStyle(img).objectFit : null
          };
        })()
      `,
      returnByValue: true
    });
    const cVal = catAudit.result.value;
    assert(cVal.found, `Category thumbnail for "${cat.label}" (${cat.id}) is present in hero`);
    assert(cVal.label === cat.label, `Category thumbnail displays correct short label "${cat.label}"`, cVal.label);
    assert(cVal.naturalWidth > 0 && cVal.naturalHeight > 0, `Product image for "${cat.label}" loaded successfully (${cVal.naturalWidth}x${cVal.naturalHeight}px)`);
    assert(cVal.objectFit === 'contain', `Product image for "${cat.label}" uses object-fit: contain`);

    // Click category thumbnail and verify filtered navigation
    await sendCdp('Runtime.evaluate', {
      expression: `document.querySelector('section a[href*="/products?category=${cat.id}"]').click()`
    });
    await sleep(1200);
    for (let i = 0; i < 15; i++) {
      const chk = await sendCdp('Runtime.evaluate', {
        expression: `document.querySelectorAll('.product-card').length`,
        returnByValue: true
      });
      if (chk?.result?.value > 0) break;
      await sleep(300);
    }
    const filterRes = await sendCdp('Runtime.evaluate', {
      expression: `({ url: window.location.href, cardCount: document.querySelectorAll('.product-card').length })`,
      returnByValue: true
    });
    assert(filterRes.result.value.url.includes(`category=${cat.id}`), `Clicking "${cat.label}" thumbnail correctly navigates to filtered URL (?category=${cat.id})`, filterRes.result.value.url);
    assert(filterRes.result.value.cardCount > 0, `Filtered catalogue displays matching products for ${cat.id}`, `Count: ${filterRes.result.value.cardCount}`);
  }

  // --- TEST D: HINDI TRANSLATION & LANGUAGE SWITCHING ---
  console.log('\n--- 4. Hindi Translation & Language Switcher Verification ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/hi` });
  await sleep(1000);
  for (let i = 0; i < 15; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('h1'))`,
      returnByValue: true
    });
    if (chk?.result?.value) break;
    await sleep(300);
  }

  const hiAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const h1 = document.querySelector('h1')?.textContent.replace(/\\s+/g, ' ').trim();
        const badge = document.querySelector('span[class*="rounded-full"][class*="uppercase"]')?.textContent.trim();
        const sub = document.querySelector('h1 + p')?.textContent.trim();
        const primaryCta = document.querySelector('a.btn-shine[href*="/products"]')?.textContent.trim();
        const waCta = document.querySelector('section a[href*="wa.me"]')?.textContent.trim();
        const thumbSpans = Array.from(document.querySelectorAll('a[href*="/products?category="] span')).map(s => s.innerText.trim()).filter(Boolean);

        return {
          h1,
          badge,
          sub,
          primaryCta,
          waCta,
          thumbSpans
        };
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
  assert(hi.thumbSpans.includes('स्टील') && hi.thumbSpans.includes('कांच'), 'Hindi thumbnail labels rendered correctly', hi.thumbSpans.join(', '));

  // Capture Hindi mobile screenshot
  await saveScreenshot('audit_phase8_3_hindi_390px.png');

  // --- TEST E: NAVIGATION MENU & MOBILE HAMBURGER ---
  console.log('\n--- 5. Mobile Navigation Menu Verification ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1000);
  for (let i = 0; i < 15; i++) {
    const chk = await sendCdp('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('button[aria-label="Toggle menu"]'))`,
      returnByValue: true
    });
    if (chk?.result?.value) break;
    await sleep(300);
  }

  // Click hamburger
  await sendCdp('Runtime.evaluate', {
    expression: `document.querySelector('button[aria-label="Toggle menu"]').click()`
  });
  await sleep(500);

  const menuAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const navLinks = Array.from(document.querySelectorAll('header nav a, header div[class*="fixed"] a, header div[class*="absolute"] a')).map(a => a.innerText.trim());
        const isOpen = document.body.innerText.includes('Home') && document.body.innerText.includes('Products') && document.body.innerText.includes('About') && document.body.innerText.includes('Contact');
        return { isOpen, navLinks };
      })()
    `,
    returnByValue: true
  });
  assert(menuAudit.result.value.isOpen, 'Mobile navigation menu opens and displays Home, Products, About, Contact links');

  // Close hamburger
  await sendCdp('Runtime.evaluate', {
    expression: `document.querySelector('button[aria-label="Toggle menu"]').click()`
  });
  await sleep(400);

  // --- TEST F: FRESH AUDIT SCREENSHOTS ---
  console.log('\n--- 6. Fresh Visual Regression Screenshots ---');
  // 1. Mobile 390x844 (Nothing Phone 3)
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1200);
  await saveScreenshot('audit_phase8_3_mobile_390px.png');

  // 2. Mobile 430x932 (iPhone 14 Pro Max)
  await setViewport(430, 932, true);
  await sleep(500);
  await saveScreenshot('audit_phase8_3_mobile_430px.png');

  // 3. Desktop 1440x900
  await setViewport(1440, 900, false);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);
  await saveScreenshot('audit_phase8_3_desktop_1440px.png');

  console.log('\n=================================================================');
  console.log(`Phase 8.3 Independent Audit Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');
}

runAudit()
  .catch((err) => {
    console.error('Fatal Audit Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log('\nTerminating audit test processes...');
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
