import { spawn } from 'node:child_process';
import os from 'node:os';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 13 Full-Stack Local Dev Verification');
console.log('Testing Vite (5173) + Wrangler Pages Dev (8788) Proxy & Mobile LAN');
console.log('=================================================================\n');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const lanIp = getLanIp();
console.log(`Detected LAN IP: ${lanIp}\n`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
  let backendProc = null;
  let frontendProc = null;

  try {
    // 1. Start Wrangler backend on 8788
    console.log('1. Starting Wrangler Pages Functions backend on 127.0.0.1:8788...');
    backendProc = spawn(npxCmd, ['wrangler', 'pages', 'dev', 'public', '--port', '8788', '--ip', '127.0.0.1'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
      env: { ...process.env, CI: 'true' }
    });

    let backendReady = false;
    backendProc.stdout.on('data', d => {
      const s = d.toString();
      if (s.includes('Ready on') || s.includes('http://127.0.0.1:8788')) backendReady = true;
    });
    backendProc.stderr.on('data', d => {
      const s = d.toString();
      if (s.includes('Ready on') || s.includes('http://127.0.0.1:8788')) backendReady = true;
    });

    const bStart = Date.now();
    while (!backendReady && Date.now() - bStart < 20000) {
      await sleep(200);
    }
    if (!backendReady) throw new Error('Wrangler backend failed to start on port 8788 within 20s');
    console.log('✅ Backend is active on http://127.0.0.1:8788\n');

    // 2. Start Vite frontend on 0.0.0.0:5173
    console.log('2. Starting Vite frontend on 0.0.0.0:5173...');
    frontendProc = spawn(npxCmd, ['vite', '--host', '0.0.0.0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
      env: process.env
    });

    let frontendReady = false;
    frontendProc.stdout.on('data', d => {
      const s = d.toString();
      if (s.includes('Local:') || s.includes('5173')) frontendReady = true;
    });
    frontendProc.stderr.on('data', d => {
      const s = d.toString();
      if (s.includes('Local:') || s.includes('5173')) frontendReady = true;
    });

    const fStart = Date.now();
    while (!frontendReady && Date.now() - fStart < 20000) {
      await sleep(200);
    }
    if (!frontendReady) throw new Error('Vite frontend failed to start on port 5173 within 20s');
    console.log('✅ Frontend is active on http://0.0.0.0:5173\n');

    let passed = 0;
    let failed = 0;

    async function assertCheck(name, fn) {
      try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.log(`❌ FAIL: ${name} -> ${err.message}`);
        failed++;
      }
    }

    // Direct Backend Tests
    await assertCheck('Backend direct: GET http://127.0.0.1:8788/api/health returns 200 and healthy DB', async () => {
      const res = await fetch('http://127.0.0.1:8788/api/health');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.status !== 'ok' || json.database?.connected !== true) throw new Error('DB not healthy');
    });

    await assertCheck('Backend direct: GET http://127.0.0.1:8788/api/categories returns 6 categories', async () => {
      const res = await fetch('http://127.0.0.1:8788/api/categories');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json.data) || json.data.length !== 6) throw new Error(`Categories count is ${json.data?.length}`);
    });

    await assertCheck('Backend direct: GET http://127.0.0.1:8788/api/products returns 17 products', async () => {
      const res = await fetch('http://127.0.0.1:8788/api/products');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.pagination?.total !== 17 || json.data?.length !== 17) {
        throw new Error(`Products total is ${json.pagination?.total}, length ${json.data?.length}`);
      }
    });

    // Vite Reverse-Proxy Tests (localhost)
    await assertCheck('Vite reverse-proxy: GET http://127.0.0.1:5173/api/health proxies to Wrangler', async () => {
      const res = await fetch('http://127.0.0.1:5173/api/health');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.status !== 'ok') throw new Error('Status not ok');
    });

    await assertCheck('Vite reverse-proxy: GET http://127.0.0.1:5173/api/categories returns 6 categories', async () => {
      const res = await fetch('http://127.0.0.1:5173/api/categories');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.data?.length !== 6) throw new Error(`Count ${json.data?.length}`);
    });

    await assertCheck('Vite reverse-proxy: GET http://127.0.0.1:5173/api/products returns 17 products without offline error', async () => {
      const res = await fetch('http://127.0.0.1:5173/api/products');
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.pagination?.total !== 17) throw new Error(`Total ${json.pagination?.total}`);
    });

    // Mobile / Network LAN IP Tests (http://<LAN_IP>:5173)
    await assertCheck(`Mobile LAN test: GET http://${lanIp}:5173/api/products proxies to Wrangler and returns 17 products`, async () => {
      const res = await fetch(`http://${lanIp}:5173/api/products`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.pagination?.total !== 17) throw new Error(`Total ${json.pagination?.total}`);
      if (json.data?.[0]?.name !== 'Glass Feeding Bottle — 250 ml (Blue)') throw new Error('First product mismatch');
    });

    await assertCheck(`Mobile LAN test: GET http://${lanIp}:5173/api/categories proxies to Wrangler and returns 6 categories`, async () => {
      const res = await fetch(`http://${lanIp}:5173/api/categories`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.data?.length !== 6) throw new Error(`Categories count ${json.data?.length}`);
    });

    await assertCheck(`Mobile LAN test: GET http://${lanIp}:5173/api/products/ye-premium-stainless-steel-feeding-bottle-200ml returns product C with images`, async () => {
      const res = await fetch(`http://${lanIp}:5173/api/products/ye-premium-stainless-steel-feeding-bottle-200ml`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.data?.id !== 'prod-19') throw new Error(`Expected prod-19, got ${json.data?.id}`);
      if (!Array.isArray(json.data?.images) || json.data.images.length !== 4) {
        throw new Error(`Expected 4 images, got ${json.data?.images?.length}`);
      }
    });

    // Static Asset Verification (Product Images)
    await assertCheck(`Static assets test: GET http://${lanIp}:5173/assets/seller-new-products/product-c-premium-ss-200ml-cap-box.jpeg returns 200 image`, async () => {
      const res = await fetch(`http://${lanIp}:5173/assets/seller-new-products/product-c-premium-ss-200ml-cap-box.jpeg`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const ct = res.headers.get('content-type');
      if (!ct || !ct.includes('image')) throw new Error(`Content-Type ${ct}`);
    });

    console.log(`\n=================================================================`);
    console.log(`Phase 13 Verification Results: ${passed} Passed, ${failed} Failed`);
    console.log(`=================================================================\n`);

    if (failed > 0) process.exit(1);

  } finally {
    console.log('Cleaning up background processes...');
    if (frontendProc) {
      try {
        frontendProc.kill('SIGINT');
        if (isWindows && frontendProc.pid) {
          spawn('taskkill', ['/pid', String(frontendProc.pid), '/f', '/t'], { stdio: 'ignore' });
        }
      } catch {}
    }
    if (backendProc) {
      try {
        backendProc.kill('SIGINT');
        if (isWindows && backendProc.pid) {
          spawn('taskkill', ['/pid', String(backendProc.pid), '/f', '/t'], { stdio: 'ignore' });
        }
      } catch {}
    }
    await sleep(500);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runVerification().catch(err => {
  console.error('Fatal error in verification:', err);
  process.exit(1);
});
