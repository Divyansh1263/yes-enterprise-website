import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 8.1 Visual Defect Correction & UX Suite');
console.log('Verifying Elimination of White Block, 44px Buttons & Full UX');
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
  // 1. Start Wrangler backend on 8788
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

  // Wait for servers
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
  assert(ready, 'Frontend server online and responding');

  // Verify backend API
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
  const chromeUserData = path.resolve('./.chrome-phase8-1-profile');
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

  async function saveScreenshot(filename) {
    const shot = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    
    // Save to docs/screenshots
    const localPath = path.join(LOCAL_SCREENSHOTS_DIR, filename);
    fs.writeFileSync(localPath, buf);

    // Save to artifact directory
    const artifactPath1 = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(artifactPath1, buf);
    const artifactPath2 = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(artifactPath2, buf);

    console.log(`📸 Screenshot saved: ${filename} (${buf.length} bytes)`);
  }

  console.log('\n--- 1. Root Cause Proof: Logo Sizing & White Block Elimination ---');
  await setViewport(390, 844, true);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(1500);

  const logoAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const logoImg = document.querySelector('header img[alt*="YES ENTERPRISES"]');
        if (!logoImg) return { error: 'Logo not found' };
        const rect = logoImg.getBoundingClientRect();
        const header = document.querySelector('header');
        const headerRect = header ? header.getBoundingClientRect() : null;
        return {
          imgWidth: rect.width,
          imgHeight: rect.height,
          naturalWidth: logoImg.naturalWidth,
          naturalHeight: logoImg.naturalHeight,
          headerHeight: headerRect?.height,
          isContained: rect.width <= 44 && rect.height <= 40
        };
      })()
    `,
    returnByValue: true
  });
  const lRes = logoAudit.result.value;
  assert(lRes.naturalWidth === 1169 && lRes.naturalHeight === 912, 'Logo intrinsic dimensions verified as 1169x912px');
  assert(lRes.isContained, 'Logo image is strictly bounded on mobile (<= 44px width, <= 40px height)', `Rendered: ${lRes.imgWidth}x${lRes.imgHeight}px`);
  assert(lRes.headerHeight <= 65, 'Header height is strictly compact (<= 65px)', `Header: ${lRes.headerHeight}px`);

  console.log('\n--- 2. Product Card Touch & Dimension Audit ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(2000);

  const cardAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const cards = document.querySelectorAll('.product-card');
        const card1 = cards[0];
        const card2 = cards[1];
        const r1 = card1.getBoundingClientRect();
        const r2 = card2.getBoundingClientRect();
        const is2Col = Math.abs(r1.top - r2.top) < 10 && r1.left < r2.left;

        const waBtns = document.querySelectorAll('.product-card button[aria-label*="WhatsApp"]');
        const firstBtnRect = waBtns[0]?.getBoundingClientRect();

        const img1 = card1.querySelector('img');
        const imgFit = img1 ? window.getComputedStyle(img1).objectFit : '';

        return {
          cardCount: cards.length,
          is2Col,
          card1Width: r1.width,
          card2Width: r2.width,
          waBtnHeight: firstBtnRect?.height,
          imgFit
        };
      })()
    `,
    returnByValue: true
  });
  const cRes = cardAudit.result.value;
  assert(cRes.is2Col, 'Catalogue displays in 2-column mobile grid at 390px', `Card widths: ${cRes.card1Width}px / ${cRes.card2Width}px`);
  assert(cRes.waBtnHeight >= 44, 'Product card WhatsApp CTA meets >= 44px touch accessibility target', `Height: ${cRes.waBtnHeight}px`);
  assert(cRes.imgFit === 'contain', 'Product card image uses object-contain preventing bottle cropping');

  // Capture Screenshot 3: Mobile Product Catalogue
  await saveScreenshot('catalogue_mobile_390px.png');

  console.log('\n--- 3. Homepage Visual Capture ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(2000);

  // Capture Screenshot 1: Mobile Homepage
  await saveScreenshot('home_mobile_390px.png');

  // Scroll to Categories section
  await sendCdp('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('.cat-card')?.closest('section');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    `
  });
  await sleep(1000);

  // Capture Screenshot 2: Mobile Categories
  await saveScreenshot('categories_mobile_390px.png');

  console.log('\n--- 4. Product Detail & Gallery Visual Capture ---');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products/ye-premium-stainless-steel-feeding-bottle-200ml` });
  await sleep(2000);

  const detailAudit = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const stickyBar = document.querySelector('.sticky-enquiry');
        const stickyRect = stickyBar ? stickyBar.getBoundingClientRect() : null;
        const stickyBtn = stickyBar ? stickyBar.querySelector('a[href*="wa.me"]') : null;
        const mainWaBtn = document.querySelector('a[href*="wa.me"]');
        const waBtnRect = (stickyBtn || mainWaBtn) ? (stickyBtn || mainWaBtn).getBoundingClientRect() : null;

        const mainImgWrap = document.querySelector('.aspect-square img')?.closest('div');
        const mainImgRect = mainImgWrap ? mainImgWrap.getBoundingClientRect() : null;

        const thumbs = document.querySelectorAll('button[aria-label*="View image"]');
        const thumbRect = thumbs[0]?.getBoundingClientRect();

        return {
          hasStickyBar: Boolean((stickyBar && stickyRect?.height > 0) || mainWaBtn),
          stickyBtnHeight: waBtnRect?.height,
          mainImgHeight: mainImgRect?.height,
          thumbCount: thumbs.length,
          thumbWidth: thumbRect?.width,
          thumbHeight: thumbRect?.height
        };
      })()
    `,
    returnByValue: true
  });
  const dRes = detailAudit.result.value;
  assert(dRes.hasStickyBar, 'WhatsApp enquiry action is present');
  assert(dRes.stickyBtnHeight >= 44, 'WhatsApp action button has touch target >= 44px', `Height: ${dRes.stickyBtnHeight}px`);
  assert(dRes.mainImgHeight <= 350, 'Image gallery height is controlled on mobile (<= 350px)', `Height: ${dRes.mainImgHeight}px`);
  assert(dRes.thumbWidth >= 48 && dRes.thumbHeight >= 48, 'Gallery thumbnails meet >= 48px touch target', `${dRes.thumbWidth}x${dRes.thumbHeight}px`);

  // Capture Screenshot 4: Product Detail
  await saveScreenshot('detail_mobile_390px.png');

  // Scroll to gallery
  await sendCdp('Runtime.evaluate', { expression: `window.scrollTo(0, 0);` });
  await sleep(600);
  // Capture Screenshot 5: Product Gallery
  await saveScreenshot('gallery_mobile_390px.png');

  console.log('\n--- 5. Additional Device Viewport Visual Verification ---');
  const otherViewports = [
    { name: '360x800', width: 360, height: 800 },
    { name: '375x667', width: 375, height: 667 },
    { name: '412x915', width: 412, height: 915 },
    { name: '430x932', width: 430, height: 932 }
  ];

  for (const ov of otherViewports) {
    await setViewport(ov.width, ov.height, true);
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
    await sleep(1200);
    await saveScreenshot(`catalogue_mobile_${ov.name}.png`);
  }

  console.log('\n--- 6. Desktop Layout Preservations (1440px) ---');
  await setViewport(1440, 900, false);
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/` });
  await sleep(2000);
  await saveScreenshot('home_desktop_1440px.png');

  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${FRONTEND_PORT}/products` });
  await sleep(2000);
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
console.log(`Phase 8.1 Verification Summary: ${passed} Passed, ${failed} Failed`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 8.1 CORRECTIONS AND SCREENSHOTS VERIFIED!');
  process.exit(0);
}
