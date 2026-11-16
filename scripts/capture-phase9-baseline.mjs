import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const isWindows = process.platform === 'win32';
const CDP_PORT = 9222;
let FRONTEND_PORT = 5173;

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
  console.log('Capturing Phase 9 Desktop Baselines...');
  const port = await detectFrontendPort();
  if (port) FRONTEND_PORT = port;
  console.log(`Frontend active on port ${FRONTEND_PORT}`);

  // Fetch first product ID from live catalogue
  const prodsRes = await fetch('http://127.0.0.1:8788/api/products');
  const prodsData = await prodsRes.json();
  const firstProductId = prodsData.data?.[0]?.id || '1';
  console.log('Using first product ID for edit baseline:', firstProductId);

  // Launch Chrome CDP
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-phase9-baseline-profile');
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

    async function setDesktopViewport() {
      await sendCdp('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });
      await sendCdp('Emulation.setTouchEmulationEnabled', {
        enabled: false,
        maxTouchPoints: 1
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
        const state = await sendCdp('Runtime.evaluate', { expression: 'document.readyState' });
        if (state.result.value === 'complete') break;
        await sleep(200);
      }
      await sleep(1000);
    }

    await setDesktopViewport();

    // 1. Admin Product List
    console.log('\n--- Capturing Desktop Baseline: Admin Products ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products`);
    await saveScreenshot('desktop_baseline_products_1440px.png');

    // 2. Admin Categories
    console.log('\n--- Capturing Desktop Baseline: Admin Categories ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/categories`);
    await saveScreenshot('desktop_baseline_categories_1440px.png');

    // 3. Admin Product Edit
    console.log('\n--- Capturing Desktop Baseline: Admin Product Edit ---');
    await navigateAndSettle(`http://127.0.0.1:${FRONTEND_PORT}/admin/products/${firstProductId}/edit`);
    await saveScreenshot('desktop_baseline_product_edit_1440px.png');

    ws.close();
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
  console.log('\nBaseline capture complete.');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
