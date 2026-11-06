import { spawn } from 'node:child_process';
import path from 'node:path';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 2 Real HTTP Runtime Integration Tests');
console.log('Starting Wrangler Pages Dev server and probing over TCP socket');
console.log('=================================================================\n');

const PORT = 8788;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRuntimeVerification() {
  console.log(`Launching Wrangler Pages Dev server on ${BASE_URL}...`);

  // Spawn wrangler pages dev dist
  const isWindows = process.platform === 'win32';
  const wranglerCmd = isWindows ? 'npx.cmd' : 'npx';
  const args = ['wrangler', 'pages', 'dev', 'dist', '--port', String(PORT), '--ip', '127.0.0.1'];

  const proc = spawn(wranglerCmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
    env: {
      ...process.env,
      CI: 'true',
      APPDATA: path.resolve('./.wrangler'),
      LOCALAPPDATA: path.resolve('./.wrangler'),
      XDG_CONFIG_HOME: path.resolve('./.wrangler'),
      XDG_CACHE_HOME: path.resolve('./.wrangler')
    }
  });

  let serverReady = false;
  let serverLogs = '';

  proc.stdout.on('data', (d) => {
    const s = d.toString();
    serverLogs += s;
    if (s.includes('Ready on') || s.includes(`http://127.0.0.1:${PORT}`)) {
      serverReady = true;
    }
  });

  proc.stderr.on('data', (d) => {
    const s = d.toString();
    serverLogs += s;
    if (s.includes('Ready on') || s.includes(`http://127.0.0.1:${PORT}`)) {
      serverReady = true;
    }
  });

  // Wait for server to report ready
  const startWait = Date.now();
  while (!serverReady && (Date.now() - startWait < 25000)) {
    await sleep(250);
  }

  if (!serverReady) {
    proc.kill();
    console.error('Server logs before timeout:\n', serverLogs);
    throw new Error('Timed out waiting for Wrangler Pages Dev server to become ready.');
  }

  console.log(`Wrangler Pages Dev server is active and listening on ${BASE_URL}.\n`);

  let passed = 0;
  let failed = 0;

  async function assertHttp(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. GET /api/health
    await assertHttp('GET /api/health over HTTP through Wrangler', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      const json = await res.json();
      if (json.status !== 'ok') throw new Error(`Expected status: 'ok', got ${json.status}`);
      if (json.database?.connected !== true) throw new Error('Database connected is not true');
      if (json.service !== 'yes-enterprises-api') throw new Error('Service mismatch');
    });

    // 2. GET /api/categories
    await assertHttp('GET /api/categories over HTTP through Wrangler', async () => {
      const res = await fetch(`${BASE_URL}/api/categories`);
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      const cc = res.headers.get('Cache-Control');
      if (!cc || !cc.includes('public')) throw new Error('Expected public Cache-Control');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) throw new Error('Expected success true with array data');
    });

    // 3. GET /api/products
    await assertHttp('GET /api/products over HTTP through Wrangler', async () => {
      const res = await fetch(`${BASE_URL}/api/products?limit=10&offset=0`);
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      const cc = res.headers.get('Cache-Control');
      if (!cc || !cc.includes('public')) throw new Error('Expected public Cache-Control');
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) throw new Error('Expected success true with array data');
      if (typeof json.pagination?.total !== 'number') throw new Error('Expected pagination total');
    });

    // 4. GET /api/products/:slug (non-existent 404)
    await assertHttp('GET /api/products/:slug returns 404 for missing product through Wrangler', async () => {
      const res = await fetch(`${BASE_URL}/api/products/non-existent-product-test`);
      if (res.status !== 404) throw new Error(`Expected HTTP 404, got ${res.status}`);
      const json = await res.json();
      if (json.error?.code !== 'PRODUCT_NOT_FOUND') throw new Error(`Expected PRODUCT_NOT_FOUND, got ${json.error?.code}`);
    });

    // 5. GET /api/admin/session (unauthenticated -> 401)
    await assertHttp('GET /api/admin/session rejects unauthenticated requests with 401 through Wrangler', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/session`);
      if (res.status !== 401) throw new Error(`Expected HTTP 401, got ${res.status}`);
      const json = await res.json();
      if (json.error?.code !== 'UNAUTHENTICATED') throw new Error(`Expected UNAUTHENTICATED, got ${json.error?.code}`);
    });

    // 6. GET /api/admin/session (local dev bypass -> 200)
    await assertHttp('GET /api/admin/session accepts local dev bypass on localhost through Wrangler', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/session`, {
        headers: { 'x-dev-admin-bypass': 'true' }
      });
      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      const cc = res.headers.get('Cache-Control');
      if (!cc || !cc.includes('no-store')) throw new Error('Expected no-store Cache-Control on admin session');
      const json = await res.json();
      if (!json.success || !json.data?.authenticated) throw new Error('Expected authenticated true');
      if (json.data.auth_type !== 'development_bypass') throw new Error(`Expected development_bypass, got ${json.data.auth_type}`);
    });

  } finally {
    console.log('\nStopping Wrangler Pages Dev server process...');
    proc.kill('SIGINT');
    proc.kill('SIGTERM');
    await sleep(500);
  }

  console.log('=================================================================');
  console.log(`Wrangler Runtime HTTP Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL REAL RUNTIME HTTP ENDPOINTS VERIFIED THROUGH WRANGLER PAGES DEV!');
    process.exit(0);
  }
}

runRuntimeVerification().catch(err => {
  console.error('Fatal runtime verification error:', err);
  process.exit(1);
});

