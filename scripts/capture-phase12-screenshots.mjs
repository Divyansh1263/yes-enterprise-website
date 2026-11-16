import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOTS_DIR = path.resolve(
  process.env.USERPROFILE,
  '.gemini',
  'antigravity',
  'brain',
  '2430f650-74ac-4cf0-8113-be52a7e920a8',
  'screenshots'
);
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const CDP_PORT = 9222;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function capture() {
  console.log('Starting Vite server...');
  const viteProc = spawn('npx.cmd', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
    stdio: 'ignore',
    shell: true,
    env: process.env
  });

  // Wait for Vite to become ready
  let viteReady = false;
  const startWait = Date.now();
  while (!viteReady && Date.now() - startWait < 15000) {
    try {
      const ping = await fetch('http://127.0.0.1:5173/');
      if (ping.status === 200) {
        viteReady = true;
        break;
      }
    } catch {}
    await sleep(300);
  }
  if (!viteReady) throw new Error('Vite server failed to start within 15s');
  console.log('Vite server ready.');

  // Launch Chrome
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeUserData = path.resolve('./.chrome-screenshot-profile');
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${chromeUserData}`,
    'about:blank'
  ]);

  try {
    await sleep(2000);
    // Get CDP WebSocket URL
    const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;

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

    // 1. Desktop Screenshot: Homepage Bottle Collection Showcase
    await sendCdp('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await sendCdp('Page.navigate', { url: 'http://127.0.0.1:5173/' });
    await sleep(2000);

    // Scroll to showcase section
    await sendCdp('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('bottle-showcase');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      `
    });
    await sleep(1500);

    const shot1 = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const shot1Path = path.join(SCREENSHOTS_DIR, 'phase12_homepage_bottle_showcase.png');
    fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'));
    console.log(`Saved screenshot: ${shot1Path}`);

    // 2. Mobile Screenshot: Homepage Bottle Collection Showcase @ 390px
    await sendCdp('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(800);
    await sendCdp('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('bottle-showcase');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
        } else {
          window.scrollTo(0, 1800);
        }
      `
    });
    await sleep(1500);

    const shot2 = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const shot2Path = path.join(SCREENSHOTS_DIR, 'phase12_homepage_showcase_mobile_390px.png');
    fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
    console.log(`Saved screenshot: ${shot2Path}`);

    // 2b. Mobile Screenshot: Product C Detail Page @ 390px
    await sendCdp('Page.navigate', { url: 'http://127.0.0.1:5173/products/ye-premium-stainless-steel-feeding-bottle-200ml' });
    await sleep(2000);
    const shot2b = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const shot2bPath = path.join(SCREENSHOTS_DIR, 'phase12_product_c_gallery_mobile_390px.png');
    fs.writeFileSync(shot2bPath, Buffer.from(shot2b.data, 'base64'));
    console.log(`Saved screenshot: ${shot2bPath}`);

    // 3. Desktop Screenshot: Product C Detail Page (Multi-image gallery)
    await sendCdp('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sendCdp('Page.navigate', { url: 'http://127.0.0.1:5173/products/ye-premium-stainless-steel-feeding-bottle-200ml' });
    await sleep(2000);

    const shot3 = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const shot3Path = path.join(SCREENSHOTS_DIR, 'phase12_product_c_gallery_desktop.png');
    fs.writeFileSync(shot3Path, Buffer.from(shot3.data, 'base64'));
    console.log(`Saved screenshot: ${shot3Path}`);

    // 4. Desktop Screenshot: Catalogue with 17 products
    await sendCdp('Page.navigate', { url: 'http://127.0.0.1:5173/products' });
    await sleep(2000);

    const shot4 = await sendCdp('Page.captureScreenshot', { format: 'png' });
    const shot4Path = path.join(SCREENSHOTS_DIR, 'phase12_catalogue_expanded_17_products.png');
    fs.writeFileSync(shot4Path, Buffer.from(shot4.data, 'base64'));
    console.log(`Saved screenshot: ${shot4Path}`);

    ws.close();
  } finally {
    chromeProc.kill();
    viteProc.kill();
  }
}

capture().then(() => console.log('Screenshots capture complete!')).catch(e => {
  console.error('Screenshot error:', e);
  process.exit(1);
});
