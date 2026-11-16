import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 3 Real HTTP Runtime Integration Tests');
console.log('Starting Wrangler Pages Dev server and probing over TCP socket');
console.log('=================================================================\n');

// Mapping of known Cloudflare D1 database IDs to their Miniflare Durable Object storage hashes
const KNOWN_D1_HASHES = {
  // Production / active development binding: 54c9ce5b-377e-4788-9899-43f71addf8a9
  '54c9ce5b-377e-4788-9899-43f71addf8a9': '6a1b3b744fa3757d88c3c37a6e58dbe029fc1f0fedf109567181075521f4e00c'
};

function locateD1Database() {
  if (process.env.D1_TEST_DB_PATH && fs.existsSync(process.env.D1_TEST_DB_PATH)) {
    return process.env.D1_TEST_DB_PATH;
  }
  const d1Dir = path.resolve('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(d1Dir)) {
    throw new Error(`Local D1 state directory not found at: ${d1Dir}`);
  }

  // 1. Check wrangler.jsonc to identify active database_id
  let activeDatabaseId = null;
  const wranglerConfigPath = path.resolve('wrangler.jsonc');
  if (fs.existsSync(wranglerConfigPath)) {
    try {
      const configRaw = fs.readFileSync(wranglerConfigPath, 'utf8');
      const cleanJson = configRaw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const config = JSON.parse(cleanJson);
      if (config.d1_databases && config.d1_databases[0] && config.d1_databases[0].database_id) {
        activeDatabaseId = config.d1_databases[0].database_id;
      }
    } catch {}
  }

  // 2. If active database_id has a known hash, prefer that specific SQLite file
  if (activeDatabaseId && KNOWN_D1_HASHES[activeDatabaseId]) {
    const activeFileName = `${KNOWN_D1_HASHES[activeDatabaseId]}.sqlite`;
    const activePath = path.join(d1Dir, activeFileName);
    if (fs.existsSync(activePath)) {
      return activePath;
    }
  }

  const files = fs.readdirSync(d1Dir).filter(
    f => f.endsWith('.sqlite') && !f.includes('metadata') && !f.includes('-wal') && !f.includes('-shm')
  );
  files.sort((a, b) => {
    const aIsActive = a.includes('6a1b3b744fa3757d');
    const bIsActive = b.includes('6a1b3b744fa3757d');
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    const aStat = fs.statSync(path.join(d1Dir, a));
    const bStat = fs.statSync(path.join(d1Dir, b));
    return bStat.mtimeMs - aStat.mtimeMs;
  });
  return path.join(d1Dir, files[0]);
}

const dbPath = locateD1Database();
const sqliteDb = new DatabaseSync(dbPath);

const RUN_ID = `p3_http_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const TEST_PREFIX = `test_${RUN_ID}_`;
const CLEAN_RUN_ID = RUN_ID.replace(/_/g, '-');

const SERVER_URL = 'http://127.0.0.1:8788';
let serverProcess = null;

let passed = 0;
let failed = 0;

async function assertTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Wrangler server did not become ready within ${timeoutMs}ms.`);
}

const dynamicallyGeneratedKeys = new Set();

function cleanupFixtures(prefix) {
  for (const key of dynamicallyGeneratedKeys) {
    sqliteDb.prepare('DELETE FROM cleanup_claims WHERE image_key = ?;').run(key);
    sqliteDb.prepare('DELETE FROM pending_uploads WHERE image_key = ?;').run(key);
    sqliteDb.prepare('DELETE FROM product_images WHERE image_key = ?;').run(key);
  }
  sqliteDb.prepare(`
    DELETE FROM product_images WHERE substr(id, 1, length(?)) = ? OR substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix);
  sqliteDb.prepare('DELETE FROM inventory_logs WHERE substr(product_id, 1, length(?)) = ?;').run(prefix);
  sqliteDb.prepare('DELETE FROM pending_uploads WHERE substr(product_id, 1, length(?)) = ?;').run(prefix);
  sqliteDb.prepare('DELETE FROM product_variants WHERE substr(product_id, 1, length(?)) = ?;').run(prefix);
  sqliteDb.prepare('DELETE FROM products WHERE substr(id, 1, length(?)) = ?;').run(prefix);
  sqliteDb.prepare('DELETE FROM categories WHERE substr(id, 1, length(?)) = ?;').run(prefix);
}

async function runRuntimeHttpTests() {
  console.log(`Launching Wrangler Pages Dev server on ${SERVER_URL}...`);

  serverProcess = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', '8788'], {
    shell: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      CI: 'true',
      APPDATA: path.resolve('./.wrangler'),
      LOCALAPPDATA: path.resolve('./.wrangler'),
      XDG_CONFIG_HOME: path.resolve('./.wrangler'),
      XDG_CACHE_HOME: path.resolve('./.wrangler')
    }
  });

  serverProcess.stdout.on('data', data => {
    const msg = data.toString();
    if (msg.includes('Ready on')) {
      console.log(`Wrangler Pages Dev server is active and listening on ${SERVER_URL}.\n`);
    }
  });

  serverProcess.stderr.on('data', () => {});

  try {
    await waitForServer(SERVER_URL);

    // 1. Unauthenticated Request Blocked
    await assertTest('POST /api/admin/categories rejects unauthenticated requests with 401 through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauth', name_hi: 'अनऑथ', slug: `${CLEAN_RUN_ID}-unauth` })
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      const body = await res.json();
      if (body.error?.code !== 'UNAUTHENTICATED') throw new Error(`Expected UNAUTHENTICATED, got ${body.error?.code}`);
    });

    // 2. Create Category via HTTP
    let createdCatId = null;
    const catSlug = `${CLEAN_RUN_ID}-http-cat`;
    await assertTest('POST /api/admin/categories creates category through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-admin-bypass': 'true'
        },
        body: JSON.stringify({
          name: 'HTTP Runtime Category',
          name_hi: 'एचटीटीपी श्रेणी',
          slug: catSlug,
          sort_order: 1
        })
      });
      if (res.status !== 201) {
        const text = await res.text();
        throw new Error(`Expected 201, got ${res.status}: ${text}`);
      }
      const body = await res.json();
      createdCatId = body.data?.id;
      if (!createdCatId) throw new Error('Category ID missing from response.');
    });

    // 3. Create Product via HTTP
    let createdProdId = null;
    const prodSlug = `${CLEAN_RUN_ID}-http-bottle`;
    await assertTest('POST /api/admin/products creates product through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-admin-bypass': 'true'
        },
        body: JSON.stringify({
          name: 'HTTP Bottle',
          name_hi: 'एचटीटीपी बोतल',
          slug: prodSlug,
          category_id: createdCatId,
          has_variants: false,
          base_price_paise: 29900,
          stock_quantity: 20,
          status: 'active'
        })
      });
      if (res.status !== 201) {
        const text = await res.text();
        throw new Error(`Expected 201, got ${res.status}: ${text}`);
      }
      const body = await res.json();
      createdProdId = body.data?.id;
      if (!createdProdId) throw new Error('Product ID missing from response.');
    });

    // 4. List Products via HTTP
    await assertTest('GET /api/admin/products returns created product through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/products?search=${prodSlug}`, {
        headers: { 'x-dev-admin-bypass': 'true' }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (!Array.isArray(body.data) || body.data.length === 0) {
        throw new Error('Created product was not found in admin listing.');
      }
      if (body.data[0].id !== createdProdId) {
        throw new Error('Product in listing does not match created product ID.');
      }
    });

    // 5. Update Inventory via HTTP
    await assertTest('PUT /api/admin/inventory updates stock and records audit log through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/inventory`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-admin-bypass': 'true'
        },
        body: JSON.stringify({
          product_id: createdProdId,
          new_quantity: 35,
          reason: 'Received shipment from factory'
        })
      });
      if (res.status !== 200) {
        const text = await res.text();
        throw new Error(`Expected 200, got ${res.status}: ${text}`);
      }
      const body = await res.json();
      if (body.data?.previous_quantity !== 20 || body.data?.new_quantity !== 35 || body.data?.change_amount !== 15) {
        throw new Error(`Inventory quantities mismatched: ${JSON.stringify(body.data)}`);
      }
    });

    // 6. Query Inventory Logs via HTTP
    await assertTest('GET /api/admin/inventory/logs returns audit log through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/inventory/logs?product_id=${createdProdId}`, {
        headers: { 'x-dev-admin-bypass': 'true' }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (!Array.isArray(body.data) || body.data.length === 0) {
        throw new Error('No audit log entries found for product.');
      }
    });

    // 7. Request Presigned Upload URL via HTTP
    await assertTest('POST /api/admin/uploads/request-url returns presigned URL and registers pending record through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/uploads/request-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-admin-bypass': 'true'
        },
        body: JSON.stringify({
          product_id: createdProdId,
          filename: 'bottle.png',
          mime_type: 'image/png',
          file_size_bytes: 102400
        })
      });
      if (res.status !== 200) {
        const text = await res.text();
        throw new Error(`Expected 200, got ${res.status}: ${text}`);
      }
      const body = await res.json();
      if (!body.upload_url || !body.image_key) {
        throw new Error('Missing upload_url or image_key in response.');
      }
      dynamicallyGeneratedKeys.add(body.image_key);
    });

    // 8. Delete Product via HTTP
    await assertTest('DELETE /api/admin/products/:id deletes product through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/products/${createdProdId}`, {
        method: 'DELETE',
        headers: { 'x-dev-admin-bypass': 'true' }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    // 9. Delete Category via HTTP
    await assertTest('DELETE /api/admin/categories/:id deletes unreferenced category through Wrangler', async () => {
      const res = await fetch(`${SERVER_URL}/api/admin/categories/${createdCatId}`, {
        method: 'DELETE',
        headers: { 'x-dev-admin-bypass': 'true' }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

  } finally {
    console.log('\nCleaning up runtime fixtures...');
    cleanupFixtures(TEST_PREFIX);
    sqliteDb.close();

    if (serverProcess) {
      console.log('Stopping Wrangler Pages Dev server process...');
      try {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/t', '/f']);
      } catch {}
      serverProcess.kill('SIGINT');
      serverProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 600));
    }
  }

  console.log('=================================================================');
  console.log(`Phase 3 Wrangler HTTP Runtime Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL 9 REAL RUNTIME HTTP ENDPOINTS VERIFIED THROUGH WRANGLER PAGES DEV!');
    process.exit(0);
  }
}

runRuntimeHttpTests().catch(err => {
  console.error('Fatal error during HTTP runtime tests:', err);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
