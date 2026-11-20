import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const isWindows = process.platform === 'win32';
const CDP_PORT = 9222;
let FRONTEND_PORT = 5173;

const DOCS_DIR = path.resolve('./docs/screenshots/footer-credit');
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${message}${details ? ` (${details})` : ''}`);
  } else {
    failed++;
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
  console.log('YES ENTERPRISES — Footer Developer Credit Verification Suite');
  console.log('Testing Exact Text, Styling, Placement, Responsiveness & Links');
  console.log('=================================================================\n');

  let activePort = await detectFrontendPort();
  let viteProc = null;
  if (activePort) {
    FRONTEND_PORT = activePort;
    console.log(`Found active frontend on port ${FRONTEND_PORT}`);
  } else {
    console.log('Starting Vite server...');
    const viteBin = path.resolve('./node_modules/vite/bin/vite.js');
    viteProc = spawn(process.execPath, [viteBin, '--port', '5173', '--host', '127.0.0.1'], {
      stdio: 'ignore',
      env: process.env
    });
    let ready = false;
    for (let i = 0; i < 30; i++) {
      activePort = await detectFrontendPort();
      if (activePort) {
        FRONTEND_PORT = activePort;
        ready = true;
        break;
      }
      await sleep(300);
    }
    if (!ready) throw new Error('Vite dev server failed to start');
    console.log(`Vite dev server ready on port ${FRONTEND_PORT}`);
  }

  // Launch headless Chrome
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-footer-test-profile');
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

    async function setViewport(width, height, isMobile = false) {
      await sendCdp('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: isMobile ? 2 : 1,
        mobile: isMobile
      });
      await sendCdp('Emulation.setTouchEmulationEnabled', {
        enabled: isMobile,
        maxTouchPoints: isMobile ? 5 : 1
      });
    }

    async function navigateAndSettle(url) {
      await sendCdp('Page.navigate', { url });
      await sleep(1000);
      for (let i = 0; i < 20; i++) {
        const state = await evaluate('document.readyState');
        if (state === 'complete') break;
        await sleep(200);
      }
      await sleep(500);
    }

    async function saveScreenshot(filename) {
      const { data } = await sendCdp('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(path.join(DOCS_DIR, filename), buffer);
      console.log(`📸 Saved screenshot: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
    }

    // --- TEST 1: Check Footer on Desktop (1440px) ---
    console.log('\n--- 1. Desktop Footer Verification (1440x900) ---');
    await setViewport(1440, 900, false);
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/`);

    // Scroll to bottom
    await evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(400);

    const footerText = await evaluate(`document.querySelector('footer').innerText`);
    assert(footerText.includes('Designed & Developed by Divyansh Tyagi'), 'Footer contains exact credit text: "Designed & Developed by Divyansh Tyagi"');
    assert(footerText.includes('YES ENTERPRISES. All rights reserved.'), 'Footer retains copyright notice');
    assert(footerText.includes('Made in India'), 'Footer retains "Made in India" label');
    assert(footerText.includes('Admin'), 'Footer retains "Admin" link text');

    // Check highlighted styling
    const highlightedStyle = await evaluate(`
      (() => {
        const span = Array.from(document.querySelectorAll('footer span')).find(s => s.textContent.trim() === 'Divyansh Tyagi');
        if (!span) return null;
        const color = window.getComputedStyle(span).color;
        const className = span.className;
        return { color, className };
      })()
    `);
    assert(Boolean(highlightedStyle), 'Divyansh Tyagi span element is found in footer');
    assert(highlightedStyle?.className.includes('text-brand-amber'), 'Divyansh Tyagi has text-brand-amber class for gold/yellow accent');

    // Check Admin link works and has correct href
    const adminHref = await evaluate(`
      (() => {
        const link = Array.from(document.querySelectorAll('footer a')).find(a => a.textContent.trim() === 'Admin');
        return link ? link.getAttribute('href') : null;
      })()
    `);
    assert(adminHref === '/admin', 'Admin link points to /admin', adminHref);

    await saveScreenshot('footer_desktop_1440px.png');

    // --- TEST 2: Check Footer on Mobile (390px) ---
    console.log('\n--- 2. Mobile Footer Verification (390x844) ---');
    await setViewport(390, 844, true);
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/`);
    await evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(400);

    const mobileOverflow = await evaluate(`
      ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      })
    `);
    assert(mobileOverflow.scrollWidth <= mobileOverflow.innerWidth, 'Mobile footer renders with ZERO horizontal overflow', `scrollWidth: ${mobileOverflow.scrollWidth}, innerWidth: ${mobileOverflow.innerWidth}`);

    const mobileFooterText = await evaluate(`document.querySelector('footer').innerText`);
    assert(mobileFooterText.includes('Designed & Developed by Divyansh Tyagi'), 'Mobile footer contains exact credit text');

    await saveScreenshot('footer_mobile_390px.png');

    // --- TEST 3: Check Footer on Compact Mobile (360px) ---
    console.log('\n--- 3. Compact Mobile Footer Verification (360x800) ---');
    await setViewport(360, 800, true);
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/`);
    await evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(400);

    const compactOverflow = await evaluate(`
      ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      })
    `);
    assert(compactOverflow.scrollWidth <= compactOverflow.innerWidth, 'Compact 360px viewport renders with ZERO horizontal overflow', `scrollWidth: ${compactOverflow.scrollWidth}, innerWidth: ${compactOverflow.innerWidth}`);
    await saveScreenshot('footer_mobile_360px.png');

    // --- TEST 4: Verify Presence across All Public Routes ---
    console.log('\n--- 4. Verify Across All Public Pages ---');
    const routesToTest = ['/products', '/about', '/contact', '/hi', '/hi/products'];
    for (const route of routesToTest) {
      await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}${route}`);
      const pageFooterText = await evaluate(`document.querySelector('footer')?.innerText || ''`);
      const hasCredit = pageFooterText.includes('Designed & Developed by Divyansh Tyagi');
      assert(hasCredit, `Footer developer credit present on ${route}`);
    }

    // --- TEST 5: Verify Admin Link Navigation ---
    console.log('\n--- 5. Verify Admin Link Navigation ---');
    await evaluate(`
      (() => {
        const link = Array.from(document.querySelectorAll('footer a')).find(a => a.textContent.trim() === 'Admin');
        if (link) link.click();
      })()
    `);
    await sleep(1000);
    const currentUrl = await evaluate(`window.location.pathname`);
    assert(currentUrl.startsWith('/admin'), 'Clicking Admin footer link navigates to /admin', currentUrl);

    ws.close();
  } finally {
    try { chromeProc.kill(); } catch {}
    if (viteProc) {
      try { viteProc.kill(); } catch {}
    }
  }

  console.log('\n=================================================================');
  console.log(`FOOTER CREDIT VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
