import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 1 D1 Schema & Integrity Test Suite');
console.log('Testing against local Cloudflare D1 emulator database');
console.log('=================================================================\n');

// ── 1. DETERMINISTIC INTENDED D1 DATABASE LOCATOR ────────────────────────────
function locateIntendedD1Database() {
  if (process.env.D1_TEST_DB_PATH && fs.existsSync(process.env.D1_TEST_DB_PATH)) {
    console.log(`Using explicit database path from D1_TEST_DB_PATH: ${process.env.D1_TEST_DB_PATH}`);
    return process.env.D1_TEST_DB_PATH;
  }

  // Parse wrangler.jsonc to identify target database name
  let targetDbName = 'yes_enterprises_db';
  const wranglerConfigPath = path.resolve('wrangler.jsonc');
  if (fs.existsSync(wranglerConfigPath)) {
    try {
      const configRaw = fs.readFileSync(wranglerConfigPath, 'utf8');
      const cleanJson = configRaw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const config = JSON.parse(cleanJson);
      if (config.d1_databases && config.d1_databases[0] && config.d1_databases[0].database_name) {
        targetDbName = config.d1_databases[0].database_name;
      }
    } catch {
      // fallback to default
    }
  }

  const d1Dir = path.resolve('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(d1Dir)) {
    throw new Error(`Local D1 state directory not found at: ${d1Dir}\nRun "npm run d1:migrate:local" first.`);
  }

  const candidateFiles = fs.readdirSync(d1Dir).filter(
    f => f.endsWith('.sqlite') && !f.includes('metadata') && !f.includes('-wal') && !f.includes('-shm')
  );

  if (candidateFiles.length === 0) {
    throw new Error(`No SQLite database files found in ${d1Dir}. Run migrations first.`);
  }

  const requiredTables = [
    'categories',
    'products',
    'product_variants',
    'product_images',
    'pending_uploads',
    'cleanup_claims',
    'inventory_logs',
    'site_settings'
  ];

  let matchedPath = null;
  for (const file of candidateFiles) {
    const candidatePath = path.join(d1Dir, file);
    try {
      const inspectDb = new DatabaseSync(candidatePath);
      const migCheck = inspectDb.prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='d1_migrations'"
      ).get();

      if (migCheck && migCheck.count > 0) {
        const initialMig = inspectDb.prepare(
          "SELECT id, name FROM d1_migrations WHERE name = '0001_initial_schema.sql'"
        ).get();

        if (initialMig) {
          const tables = inspectDb.prepare(
            "SELECT name FROM sqlite_master WHERE type='table'"
          ).all().map(r => r.name);

          const hasAllTables = requiredTables.every(t => tables.includes(t));
          if (hasAllTables) {
            matchedPath = candidatePath;
            inspectDb.close();
            break;
          }
        }
      }
      inspectDb.close();
    } catch {
      // Continue checking next candidate
    }
  }

  if (!matchedPath) {
    throw new Error(
      `Could not locate intended D1 database for "${targetDbName}" with applied "0001_initial_schema.sql" migration.`
    );
  }

  return matchedPath;
}

const dbPath = locateIntendedD1Database();
console.log(`Connecting to intended local D1 emulator database:\n  ${dbPath}\n`);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

let passed = 0;
let failed = 0;

function assertTest(name, fn, expectedSuccess, errorMatch) {
  try {
    fn();
    if (expectedSuccess) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name} (Expected error containing "${errorMatch}", but statement succeeded)`);
      failed++;
    }
  } catch (err) {
    if (!expectedSuccess) {
      const msg = err.message || '';
      if (!errorMatch || msg.toLowerCase().includes(errorMatch.toLowerCase())) {
        console.log(`✅ PASS: ${name} [Expected error caught: ${msg}]`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${name} (Expected error containing "${errorMatch}", got: ${msg})`);
        failed++;
      }
    } else {
      console.log(`❌ FAIL: ${name} (Unexpected error: ${err.message})`);
      failed++;
    }
  }
}

// ── UNIQUE RUN IDENTIFIER FOR NON-DESTRUCTIVE ISOLATION ──────────────────────
// Unique to this exact execution: avoids collisions with existing or future data.
const RUN_ID = `p1_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const TEST_PREFIX = `test_${RUN_ID}_`;
const CTRL_PREFIX = `ctrl_${RUN_ID}_`;

// Test fixture identifiers
const CAT_BOTTLES_ID = `${TEST_PREFIX}cat_bottles`;
const CAT_STEEL_ID = `${TEST_PREFIX}cat_steel`;
const PROD_VALID_ID = `${TEST_PREFIX}prod_valid`;
const PROD_NULL_ID = `${TEST_PREFIX}prod_null`;
const PROD_B_ID = `${TEST_PREFIX}prod_b`;
const VAR_VALID_ID = `${TEST_PREFIX}var_valid`;
const VAR_B1_ID = `${TEST_PREFIX}var_b1`;

// Control record identifiers (representing pre-existing unrelated data)
const CTRL_CAT_ID = `${CTRL_PREFIX}cat`;
const CTRL_PROD_ID = `${CTRL_PREFIX}prod`;
const CTRL_VAR_ID = `${CTRL_PREFIX}var`;
const CTRL_IMG_ID = `${CTRL_PREFIX}img`;
const CTRL_SETTING_KEY = `${CTRL_PREFIX}setting`;
const CTRL_PROD_SKU = `CTRL-${RUN_ID.toUpperCase()}-01`;
const CTRL_VAR_SKU = `CTRL-${RUN_ID.toUpperCase()}-V1`;

// ── TRANSACTION SIMULATION HELPER (SQLITE LEVEL) ─────────────────────────────
// NOTE: This helper simulates multi-statement transaction atomicity and rollback
// behavior at the local SQLite engine level using SAVEPOINT/ROLLBACK.
// It is an accurate database-level transaction simulation. Full end-to-end
// integration testing of Cloudflare's runtime `env.DB.batch()` API will be
// performed during the Phase 2 API implementation.
function executeSqliteTransactionSimulation(db, statements) {
  db.exec('SAVEPOINT sim_batch;');
  try {
    const results = [];
    for (const stmt of statements) {
      if (typeof stmt === 'string') {
        results.push(db.exec(stmt));
      } else {
        results.push(db.prepare(stmt.sql).run(...(stmt.params || [])));
      }
    }
    db.exec('RELEASE SAVEPOINT sim_batch;');
    return { success: true, results };
  } catch (err) {
    db.exec('ROLLBACK TO SAVEPOINT sim_batch; RELEASE SAVEPOINT sim_batch;');
    throw err;
  }
}

// ── PARAMETERIZED LITERAL PREFIX CLEANUP (ZERO LIKE WILDCARD RISKS) ──────────
// Uses exact substr(col, 1, length(?)) = ? with parameterized prefix values.
// Treats all characters (including underscores) as literal exact characters.
function cleanupFixturesByExactPrefix(db, prefix) {
  db.prepare(`
    DELETE FROM product_images 
    WHERE substr(id, 1, length(?)) = ? 
       OR substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix, prefix, prefix);

  db.prepare(`
    DELETE FROM inventory_logs 
    WHERE substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix);

  db.prepare(`
    DELETE FROM cleanup_claims 
    WHERE substr(image_key, 1, length(?)) = ?;
  `).run(prefix, prefix);

  db.prepare(`
    DELETE FROM pending_uploads 
    WHERE substr(image_key, 1, length(?)) = ? 
       OR substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix, prefix, prefix);

  db.prepare(`
    DELETE FROM product_variants 
    WHERE substr(id, 1, length(?)) = ? 
       OR substr(product_id, 1, length(?)) = ?;
  `).run(prefix, prefix, prefix, prefix);

  db.prepare(`
    DELETE FROM products 
    WHERE substr(id, 1, length(?)) = ?;
  `).run(prefix, prefix);

  db.prepare(`
    DELETE FROM categories 
    WHERE substr(id, 1, length(?)) = ?;
  `).run(prefix, prefix);
}

function cleanupControlFixtures(db, catId, prodId, varId, imgId, settingKey) {
  db.prepare(`DELETE FROM product_images WHERE id = ?;`).run(imgId);
  db.prepare(`DELETE FROM inventory_logs WHERE product_id = ?;`).run(prodId);
  db.prepare(`DELETE FROM product_variants WHERE id = ?;`).run(varId);
  db.prepare(`DELETE FROM products WHERE id = ?;`).run(prodId);
  db.prepare(`DELETE FROM categories WHERE id = ?;`).run(catId);
  db.prepare(`DELETE FROM site_settings WHERE key = ?;`).run(settingKey);
}

// ── 0. RECORD BASELINE STATE & SEED UNIQUE CONTROL RECORDS ────────────────────
console.log('--- 0. Seeding Unique Unrelated Control Records ---');

// Record pre-test baseline counts of existing data
const baselineCounts = {
  categories: db.prepare("SELECT COUNT(*) as c FROM categories").get().c,
  products: db.prepare("SELECT COUNT(*) as c FROM products").get().c,
  variants: db.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
  images: db.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
  inventoryLogs: db.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
  siteSettings: db.prepare("SELECT COUNT(*) as c FROM site_settings").get().c
};

console.log(`Baseline database counts before test run: categories=${baselineCounts.categories}, products=${baselineCounts.products}`);

// Verify generated control IDs do not exist before inserting (NEVER delete to make room)
const collisionCheck = db.prepare(`
  SELECT 1 FROM categories WHERE id = ?
  UNION ALL SELECT 1 FROM products WHERE id = ?
  UNION ALL SELECT 1 FROM product_variants WHERE id = ?
  UNION ALL SELECT 1 FROM product_images WHERE id = ?
  UNION ALL SELECT 1 FROM site_settings WHERE key = ?;
`).get(CTRL_CAT_ID, CTRL_PROD_ID, CTRL_VAR_ID, CTRL_IMG_ID, CTRL_SETTING_KEY);

if (collisionCheck) {
  throw new Error(`Fatal: ID collision detected for newly generated control IDs (${RUN_ID}). Aborting.`);
}

let controlSeeded = false;

try {
  // Insert unique control records representing pre-existing unrelated data
  db.prepare(`
    INSERT INTO categories (id, name, name_hi, slug, sort_order) VALUES (?, ?, ?, ?, ?);
  `).run(CTRL_CAT_ID, 'Pre-existing Unrelated Category', 'असंबंधित श्रेणी', `ctrl-cat-slug-${RUN_ID}`, 99);

  db.prepare(`
    INSERT INTO products (id, name, name_hi, slug, category_id, sku, status) VALUES (?, ?, ?, ?, ?, ?, ?);
  `).run(CTRL_PROD_ID, 'Pre-existing Unrelated Bottle', 'मौजूदा बोतल', `ctrl-prod-slug-${RUN_ID}`, CTRL_CAT_ID, CTRL_PROD_SKU, 'active');

  db.prepare(`
    INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES (?, ?, ?, ?, ?);
  `).run(CTRL_VAR_ID, CTRL_PROD_ID, CTRL_VAR_SKU, '500ml Silver', '500 मिली सिल्वर');

  db.prepare(`
    INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?);
  `).run(CTRL_IMG_ID, CTRL_PROD_ID, CTRL_VAR_ID, `images/${CTRL_PREFIX}preexisting.webp`, 'image/webp', 4096, 1);

  db.prepare(`
    INSERT INTO inventory_logs (product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?);
  `).run(CTRL_PROD_ID, CTRL_VAR_ID, 0, 100, 100, 'Initial inventory seed', 'admin-seed');

  db.prepare(`
    INSERT INTO site_settings (key, value_json, description) VALUES (?, ?, ?);
  `).run(CTRL_SETTING_KEY, '{"company":"YES ENTERPRISES","established":2005}', 'Site information');

  controlSeeded = true;
  console.log(`Unrelated control records established with run prefix: "${CTRL_PREFIX}".\n`);

  // Initialize scoped test fixtures for this test run
  db.prepare(`
    INSERT INTO categories (id, name, name_hi, slug, sort_order) VALUES 
    (?, 'Feeding Bottles', 'फीडिंग बोतलें', ?, 1),
    (?, 'Steel Products', 'स्टील प्रोडक्ट्स', ?, 2);
  `).run(CAT_BOTTLES_ID, `test-bottles-${RUN_ID}`, CAT_STEEL_ID, `test-steel-${RUN_ID}`);

  console.log(`Scoped test fixtures initialized with prefix: "${TEST_PREFIX}".\n`);

  // ── 1. SKU NORMALIZATION & INVALID SKU REJECTION ────────────────────────────
  console.log('--- 1. SKU Normalization & Constraint Tests ---');

  assertTest(
    'Reject lowercase SKU on products',
    () => db.exec(`INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES ('${TEST_PREFIX}p_low', 'P1', 'P1', '${TEST_PREFIX}slug_low', '${CAT_BOTTLES_ID}', 'sku-lowercase');`),
    false,
    'CHECK constraint failed'
  );

  assertTest(
    'Reject untrimmed SKU on products',
    () => db.exec(`INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES ('${TEST_PREFIX}p_trim', 'P2', 'P2', '${TEST_PREFIX}slug_trim', '${CAT_BOTTLES_ID}', ' SKU-001 ');`),
    false,
    'CHECK constraint failed'
  );

  assertTest(
    'Reject empty string SKU on products',
    () => db.exec(`INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES ('${TEST_PREFIX}p_empty', 'P3', 'P3', '${TEST_PREFIX}slug_empty', '${CAT_BOTTLES_ID}', '');`),
    false,
    'CHECK constraint failed'
  );

  assertTest(
    'Accept valid uppercase trimmed SKU on products',
    () => db.exec(`INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES ('${PROD_VALID_ID}', 'P Valid', 'P Valid', '${TEST_PREFIX}slug_valid', '${CAT_BOTTLES_ID}', 'SKU-PROD-01');`),
    true
  );

  assertTest(
    'Accept NULL SKU on products',
    () => db.exec(`INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES ('${PROD_NULL_ID}', 'P Null', 'P Null', '${TEST_PREFIX}slug_null', '${CAT_BOTTLES_ID}', NULL);`),
    true
  );

  assertTest(
    'Reject lowercase SKU on product_variants',
    () => db.exec(`INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES ('${TEST_PREFIX}var_low', '${PROD_NULL_ID}', 'var-low', 'V1', 'V1');`),
    false,
    'CHECK constraint failed'
  );

  assertTest(
    'Reject untrimmed SKU on product_variants',
    () => db.exec(`INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES ('${TEST_PREFIX}var_trim', '${PROD_NULL_ID}', ' VAR-01 ', 'V1', 'V1');`),
    false,
    'CHECK constraint failed'
  );

  assertTest(
    'Accept valid uppercase trimmed SKU on product_variants',
    () => db.exec(`INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES ('${VAR_VALID_ID}', '${PROD_NULL_ID}', 'SKU-VAR-01', 'V1', 'V1');`),
    true
  );

  // ── 2. DUPLICATE SKUS WITHIN SAME TABLE ─────────────────────────────────────
  console.log('\n--- 2. Duplicate SKU Within Same Table ---');

  assertTest(
    'Reject duplicate SKU within products table',
    () => db.exec(`INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES ('${TEST_PREFIX}p_dup', 'P Dup', 'P Dup', '${TEST_PREFIX}slug_dup', '${CAT_BOTTLES_ID}', 'SKU-PROD-01');`),
    false,
    'UNIQUE constraint failed'
  );

  assertTest(
    'Reject duplicate SKU within product_variants table',
    () => db.exec(`INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES ('${TEST_PREFIX}var_dup', '${PROD_NULL_ID}', 'SKU-VAR-01', 'V2', 'V2');`),
    false,
    'UNIQUE constraint failed'
  );

  // ── 3. CROSS-TABLE SKU COLLISION TESTS ──────────────────────────────────────
  console.log('\n--- 3. Cross-Table SKU Collisions (Normalized Triggers) ---');

  assertTest(
    'Trigger blocks product from using existing variant SKU',
    () => db.exec(`INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES ('${TEST_PREFIX}p_cross', 'P Cross', 'P Cross', '${TEST_PREFIX}slug_cross', '${CAT_BOTTLES_ID}', 'SKU-VAR-01');`),
    false,
    'SKU collision'
  );

  assertTest(
    'Trigger blocks product update to existing variant SKU',
    () => db.exec(`UPDATE products SET sku = 'SKU-VAR-01' WHERE id = '${PROD_VALID_ID}';`),
    false,
    'SKU collision'
  );

  assertTest(
    'Trigger blocks variant from using existing product SKU',
    () => db.exec(`INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES ('${TEST_PREFIX}var_cross', '${PROD_NULL_ID}', 'SKU-PROD-01', 'V Cross', 'V Cross');`),
    false,
    'SKU collision'
  );

  assertTest(
    'Trigger blocks variant update to existing product SKU',
    () => db.exec(`UPDATE product_variants SET sku = 'SKU-PROD-01' WHERE id = '${VAR_VALID_ID}';`),
    false,
    'SKU collision'
  );

  // ── 4. IMAGE-TO-VARIANT OWNERSHIP INTEGRITY ─────────────────────────────────
  console.log('\n--- 4. Image-to-Variant Ownership Integrity ---');

  db.exec(`
    INSERT INTO products (id, name, name_hi, slug, category_id) VALUES 
    ('${PROD_B_ID}', 'Product B', 'Product B', '${TEST_PREFIX}slug_prod_b', '${CAT_STEEL_ID}');

    INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES 
    ('${VAR_B1_ID}', '${PROD_B_ID}', 'SKU-VAR-B1', 'Variant B1', 'Variant B1');
  `);

  assertTest(
    'Trigger blocks image linked to variant of a different product',
    () => db.exec(`INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes) VALUES ('${TEST_PREFIX}img_mismatch', '${PROD_VALID_ID}', '${VAR_B1_ID}', '${TEST_PREFIX}key_1', 'image/webp', 1024);`),
    false,
    'variant_id does not belong to product_id'
  );

  assertTest(
    'Trigger allows image linked to matching product and variant',
    () => db.exec(`INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary) VALUES ('${TEST_PREFIX}img_match', '${PROD_B_ID}', '${VAR_B1_ID}', '${TEST_PREFIX}key_valid', 'image/webp', 1024, 1);`),
    true
  );

  assertTest(
    'Trigger blocks update of variant_id to a mismatched product',
    () => db.exec(`UPDATE product_images SET variant_id = '${VAR_VALID_ID}' WHERE id = '${TEST_PREFIX}img_match';`),
    false,
    'variant_id does not belong to product_id'
  );

  // ── 5. VARIANT PRODUCT_ID IMMUTABILITY ──────────────────────────────────────
  console.log('\n--- 5. Variant product_id Immutability ---');

  assertTest(
    'Trigger blocks changing product_id on an existing variant',
    () => db.exec(`UPDATE product_variants SET product_id = '${PROD_VALID_ID}' WHERE id = '${VAR_B1_ID}';`),
    false,
    'product_id on product_variants is immutable once created'
  );

  // ── 6. PRIMARY IMAGE UNIQUENESS (AT-MOST-ONE PRIMARY) ───────────────────────
  console.log('\n--- 6. Primary Image At-Most-One Constraints ---');

  assertTest(
    'Insert initial primary image for simple product',
    () => db.exec(`INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary) VALUES ('${TEST_PREFIX}img_p1', '${PROD_VALID_ID}', NULL, '${TEST_PREFIX}key_p1', 'image/webp', 1024, 1);`),
    true
  );

  assertTest(
    'Reject second primary image for same simple product',
    () => db.exec(`INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary) VALUES ('${TEST_PREFIX}img_p2', '${PROD_VALID_ID}', NULL, '${TEST_PREFIX}key_p2', 'image/webp', 1024, 1);`),
    false,
    'UNIQUE constraint failed'
  );

  assertTest(
    'Allow second non-primary image for same simple product',
    () => db.exec(`INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary) VALUES ('${TEST_PREFIX}img_p3', '${PROD_VALID_ID}', NULL, '${TEST_PREFIX}key_p3', 'image/webp', 1024, 0);`),
    true
  );

  assertTest(
    'Reject second primary image for same variant',
    () => db.exec(`INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary) VALUES ('${TEST_PREFIX}img_var_dup', '${PROD_B_ID}', '${VAR_B1_ID}', '${TEST_PREFIX}key_var_dup', 'image/webp', 1024, 1);`),
    false,
    'UNIQUE constraint failed'
  );

  assertTest(
    'Allow non-primary image for same variant',
    () => db.exec(`INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes, is_primary) VALUES ('${TEST_PREFIX}img_var_ok', '${PROD_B_ID}', '${VAR_B1_ID}', '${TEST_PREFIX}key_var_ok', 'image/webp', 1024, 0);`),
    true
  );

  // ── 7. FOREIGN KEY INTEGRITY & CASCADE RULES ───────────────────────────────
  console.log('\n--- 7. Foreign Key Integrity & Cascade Rules ---');

  assertTest(
    'Reject category deletion when referenced by a product (ON DELETE RESTRICT)',
    () => db.exec(`DELETE FROM categories WHERE id = '${CAT_BOTTLES_ID}';`),
    false,
    'FOREIGN KEY constraint failed'
  );

  assertTest(
    'Variant deletion cascades to variant-specific images',
    () => {
      db.exec(`DELETE FROM product_variants WHERE id = '${VAR_B1_ID}';`);
      const count = db.prepare(`SELECT COUNT(*) as c FROM product_images WHERE id = '${TEST_PREFIX}img_match';`).get();
      if (count.c !== 0) throw new Error('Image was not cascade deleted with variant');
    },
    true
  );

  assertTest(
    'Inventory log preserves history with variant_id set to NULL on variant deletion',
    () => {
      db.exec(`
        INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES 
        ('${TEST_PREFIX}var_audit', '${PROD_VALID_ID}', 'SKU-AUDIT-1', 'V Audit', 'V Audit');

        INSERT INTO inventory_logs (product_id, variant_id, previous_quantity, new_quantity, change_amount, reason, updated_by) VALUES
        ('${PROD_VALID_ID}', '${TEST_PREFIX}var_audit', 0, 10, 10, 'Initial stock', 'seller');
      `);

      db.exec(`DELETE FROM product_variants WHERE id = '${TEST_PREFIX}var_audit';`);

      const log = db.prepare(`SELECT variant_id FROM inventory_logs WHERE product_id = '${PROD_VALID_ID}' AND reason = 'Initial stock';`).get();
      if (log.variant_id !== null) {
        throw new Error(`Expected variant_id to be NULL, got ${log.variant_id}`);
      }
    },
    true
  );

  // ── 8. SQLITE TRANSACTION SIMULATION & ROLLBACK TESTS ───────────────────────
  console.log('\n--- 8. SQLite Transaction Simulation & Rollback Tests ---');
  console.log('NOTE: Validates transaction atomicity and rollback semantics at SQLite level (SAVEPOINT/ROLLBACK).');
  console.log('This is a local database transaction simulation and NOT an integration test of Cloudflare\'s runtime env.DB.batch() API.');
  console.log('Real env.DB.batch() integration testing will be conducted during Phase 2 API implementation.\n');

  assertTest(
    'SQLite transaction simulation succeeds and commits all statements',
    () => {
      const batch = [
        {
          sql: "INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES (?, ?, ?, ?, ?, ?);",
          params: [`${TEST_PREFIX}sim_ok_prod`, 'Batch OK Prod', 'बैच उत्पाद', `${TEST_PREFIX}slug_sim_ok`, CAT_BOTTLES_ID, 'SKU-BATCH-OK']
        },
        {
          sql: "INSERT INTO product_variants (id, product_id, sku, title, title_hi) VALUES (?, ?, ?, ?, ?);",
          params: [`${TEST_PREFIX}sim_ok_var`, `${TEST_PREFIX}sim_ok_prod`, 'SKU-BATCH-OK-VAR', 'Batch Variant', 'बैच संस्करण']
        }
      ];

      executeSqliteTransactionSimulation(db, batch);

      const prod = db.prepare(`SELECT id FROM products WHERE id = '${TEST_PREFIX}sim_ok_prod';`).get();
      const variant = db.prepare(`SELECT id FROM product_variants WHERE id = '${TEST_PREFIX}sim_ok_var';`).get();
      if (!prod || !variant) throw new Error('Transaction simulation statements did not commit');
    },
    true
  );

  assertTest(
    'SQLite transaction simulation rolls back completely when any statement fails',
    () => {
      const failingBatch = [
        {
          sql: "INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES (?, ?, ?, ?, ?, ?);",
          params: [`${TEST_PREFIX}sim_fail_prod`, 'Batch Fail Prod', 'बैच विफल', `${TEST_PREFIX}slug_sim_fail`, CAT_BOTTLES_ID, 'SKU-BATCH-FAIL']
        },
        // Second statement deliberately violates CHECK constraint (lowercase SKU)
        {
          sql: "INSERT INTO products (id, name, name_hi, slug, category_id, sku) VALUES (?, ?, ?, ?, ?, ?);",
          params: [`${TEST_PREFIX}sim_fail_prod2`, 'Batch Fail Prod 2', 'बैच विफल 2', `${TEST_PREFIX}slug_sim_fail2`, CAT_BOTTLES_ID, 'lowercase-sku-fails']
        }
      ];

      try {
        executeSqliteTransactionSimulation(db, failingBatch);
      } catch {
        const rolledBackProd = db.prepare(`SELECT id FROM products WHERE id = '${TEST_PREFIX}sim_fail_prod';`).get();
        if (rolledBackProd) {
          throw new Error('Rollback failed: statement 1 persisted after transaction failure');
        }
        return;
      }
      throw new Error('Transaction simulation unexpectedly succeeded');
    },
    true
  );

  // ── 9. LEASE-BASED CLEANUP CLAIMS & CONCURRENCY GUARDS ───────────────────────
  console.log('\n--- 9. Lease-Based Cleanup Claims, Token Ownership & Expiry Tests ---');

  assertTest(
    'Insert initial cleanup claim with lease token and future expiry',
    () => db.exec(`INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status) VALUES ('${TEST_PREFIX}claim_active', 'token-worker-a', datetime('now', '+5 minutes'), 'claimed');`),
    true
  );

  assertTest(
    'Active lease blocks second worker from acquiring claim',
    () => db.exec(`INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status) VALUES ('${TEST_PREFIX}claim_active', 'token-worker-b', datetime('now', '+5 minutes'), 'claimed');`),
    false,
    'UNIQUE constraint failed'
  );

  assertTest(
    'Expired lease can be atomically reclaimed by another worker',
    () => {
      db.exec(`INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status) VALUES ('${TEST_PREFIX}claim_expired', 'token-worker-old', datetime('now', '-10 minutes'), 'claimed');`);

      const reclaimResult = db.prepare(`
        UPDATE cleanup_claims
        SET claim_token = 'token-worker-new',
            lease_expires_at = datetime('now', '+5 minutes'),
            status = 'claimed'
        WHERE image_key = '${TEST_PREFIX}claim_expired'
          AND lease_expires_at <= datetime('now');
      `).run();

      if (reclaimResult.changes !== 1) {
        throw new Error('Failed to reclaim expired lease');
      }

      const claim = db.prepare(`SELECT claim_token FROM cleanup_claims WHERE image_key = '${TEST_PREFIX}claim_expired';`).get();
      if (claim.claim_token !== 'token-worker-new') {
        throw new Error(`Expected owner token-worker-new, got ${claim.claim_token}`);
      }
    },
    true
  );

  assertTest(
    'Stale worker cannot delete/release a claim owned by another worker',
    () => {
      const delResult = db.prepare(`
        DELETE FROM cleanup_claims 
        WHERE image_key = '${TEST_PREFIX}claim_expired' AND claim_token = 'token-worker-old';
      `).run();

      if (delResult.changes !== 0) {
        throw new Error('Stale worker improperly released a newer worker claim');
      }

      const claim = db.prepare(`SELECT claim_token FROM cleanup_claims WHERE image_key = '${TEST_PREFIX}claim_expired';`).get();
      if (!claim || claim.claim_token !== 'token-worker-new') {
        throw new Error('Claim was lost or modified');
      }
    },
    true
  );

  assertTest(
    'Token ownership verification: worker checks active ownership before R2 deletion',
    () => {
      const staleCheck = db.prepare(`
        SELECT 1 FROM cleanup_claims
        WHERE image_key = '${TEST_PREFIX}claim_expired'
          AND claim_token = 'token-worker-old'
          AND lease_expires_at > datetime('now');
      `).get();

      if (staleCheck) {
        throw new Error('Stale worker incorrectly verified as active owner');
      }

      const validCheck = db.prepare(`
        SELECT 1 FROM cleanup_claims
        WHERE image_key = '${TEST_PREFIX}claim_expired'
          AND claim_token = 'token-worker-new'
          AND lease_expires_at > datetime('now');
      `).get();

      if (!validCheck) {
        throw new Error('Active owner failed ownership verification');
      }
    },
    true
  );

  assertTest(
    'Stale worker cannot mark another worker claim as failed',
    () => {
      const updateResult = db.prepare(`
        UPDATE cleanup_claims 
        SET status = 'failed'
        WHERE image_key = '${TEST_PREFIX}claim_expired' AND claim_token = 'token-worker-old';
      `).run();

      if (updateResult.changes !== 0) {
        throw new Error('Stale worker improperly changed claim status');
      }
    },
    true
  );

  assertTest(
    'Valid worker marks status as failed on R2 error, leaving it retryable',
    () => {
      const updateResult = db.prepare(`
        UPDATE cleanup_claims 
        SET status = 'failed'
        WHERE image_key = '${TEST_PREFIX}claim_expired' AND claim_token = 'token-worker-new';
      `).run();

      if (updateResult.changes !== 1) {
        throw new Error('Valid worker failed to update claim status to failed');
      }

      const row = db.prepare(`SELECT status FROM cleanup_claims WHERE image_key = '${TEST_PREFIX}claim_expired';`).get();
      if (row.status !== 'failed') {
        throw new Error(`Expected status failed, got ${row.status}`);
      }
    },
    true
  );

  assertTest(
    'Upload-URL creation refused if key exists in cleanup_claims',
    () => {
      const result = db.prepare(`
        INSERT INTO pending_uploads (image_key, product_id)
        SELECT '${TEST_PREFIX}claim_active', '${PROD_VALID_ID}'
        WHERE NOT EXISTS (SELECT 1 FROM cleanup_claims WHERE image_key = '${TEST_PREFIX}claim_active');
      `).run();

      if (result.changes === 0) {
        throw new Error('Upload refused: key exists in cleanup_claims');
      }
    },
    false,
    'Upload refused: key exists in cleanup_claims'
  );

  assertTest(
    'Upload-URL creation succeeds on fresh unclaimed key',
    () => {
      const result = db.prepare(`
        INSERT INTO pending_uploads (image_key, product_id)
        SELECT '${TEST_PREFIX}key_fresh', '${PROD_VALID_ID}'
        WHERE NOT EXISTS (SELECT 1 FROM cleanup_claims WHERE image_key = '${TEST_PREFIX}key_fresh');
      `).run();

      if (result.changes !== 1) {
        throw new Error('Failed to create pending upload');
      }
    },
    true
  );

  assertTest(
    'Finalization rejected if key exists in cleanup_claims (even expired claims)',
    () => {
      const result = db.prepare(`
        INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes)
        SELECT '${TEST_PREFIX}img_fin_fail', '${PROD_VALID_ID}', NULL, '${TEST_PREFIX}claim_expired', 'image/webp', 1024
        WHERE NOT EXISTS (SELECT 1 FROM cleanup_claims WHERE image_key = '${TEST_PREFIX}claim_expired');
      `).run();

      if (result.changes === 0) {
        throw new Error('Finalization rejected: key exists in cleanup_claims');
      }
    },
    false,
    'Finalization rejected: key exists in cleanup_claims'
  );

  assertTest(
    'Finalization succeeds on fresh key and atomically cleans pending_uploads',
    () => {
      const ins = db.prepare(`
        INSERT INTO product_images (id, product_id, variant_id, image_key, mime_type, file_size_bytes)
        SELECT '${TEST_PREFIX}img_fin_ok', '${PROD_VALID_ID}', NULL, '${TEST_PREFIX}key_fresh', 'image/webp', 1024
        WHERE NOT EXISTS (SELECT 1 FROM cleanup_claims WHERE image_key = '${TEST_PREFIX}key_fresh');
      `).run();
      if (ins.changes !== 1) throw new Error('Insertion failed');

      const del = db.prepare(`
        DELETE FROM pending_uploads 
        WHERE image_key = '${TEST_PREFIX}key_fresh' 
          AND EXISTS (SELECT 1 FROM product_images WHERE image_key = '${TEST_PREFIX}key_fresh');
      `).run();
      if (del.changes !== 1) throw new Error('Pending cleanup failed');
    },
    true
  );

  assertTest(
    'Valid worker cleanly releases claim upon successful R2 deletion',
    () => {
      const del = db.prepare(`
        DELETE FROM cleanup_claims
        WHERE image_key = '${TEST_PREFIX}claim_active' AND claim_token = 'token-worker-a';
      `).run();
      if (del.changes !== 1) throw new Error('Failed to release claim');
    },
    true
  );

  // ── 10. NON-DESTRUCTIVENESS VERIFICATION: PROOF OF UNTOUCHED DATA ────────────
  console.log('\n--- 10. Non-Destructive Scoped Teardown & Preservation Proof ---');

  // Verify unique control records survived the entire test suite completely intact
  assertTest(
    'Pre-existing control category survived entire test run',
    () => {
      const cat = db.prepare(`SELECT * FROM categories WHERE id = ?;`).get(CTRL_CAT_ID);
      if (!cat || cat.slug !== `ctrl-cat-slug-${RUN_ID}`) throw new Error('Control category was lost or corrupted');
    },
    true
  );

  assertTest(
    'Pre-existing control product survived entire test run',
    () => {
      const prod = db.prepare(`SELECT * FROM products WHERE id = ?;`).get(CTRL_PROD_ID);
      if (!prod || prod.sku !== CTRL_PROD_SKU) throw new Error('Control product was lost or corrupted');
    },
    true
  );

  assertTest(
    'Pre-existing control variant survived entire test run',
    () => {
      const variant = db.prepare(`SELECT * FROM product_variants WHERE id = ?;`).get(CTRL_VAR_ID);
      if (!variant || variant.sku !== CTRL_VAR_SKU) throw new Error('Control variant was lost or corrupted');
    },
    true
  );

  assertTest(
    'Pre-existing control image survived entire test run',
    () => {
      const img = db.prepare(`SELECT * FROM product_images WHERE id = ?;`).get(CTRL_IMG_ID);
      if (!img || img.image_key !== `images/${CTRL_PREFIX}preexisting.webp`) throw new Error('Control image was lost or corrupted');
    },
    true
  );

  assertTest(
    'Pre-existing control inventory log survived entire test run',
    () => {
      const log = db.prepare(`SELECT * FROM inventory_logs WHERE product_id = ?;`).get(CTRL_PROD_ID);
      if (!log || log.change_amount !== 100) throw new Error('Control inventory log was lost or corrupted');
    },
    true
  );

  assertTest(
    'Pre-existing control site setting survived entire test run',
    () => {
      const setting = db.prepare(`SELECT * FROM site_settings WHERE key = ?;`).get(CTRL_SETTING_KEY);
      if (!setting || !setting.value_json.includes('YES ENTERPRISES')) throw new Error('Control site setting was lost or corrupted');
    },
    true
  );

} finally {
  // Reliable cleanup in finally block: guarantees test run fixtures are ALWAYS cleaned up
  // even if an assertion or unexpected error occurs.
  console.log('\n--- Executing Guaranteed Cleanup (finally block) ---');

  cleanupFixturesByExactPrefix(db, TEST_PREFIX);
  console.log(`Scoped test fixtures matching exact prefix "${TEST_PREFIX}" cleaned up.`);

  if (controlSeeded) {
    cleanupControlFixtures(db, CTRL_CAT_ID, CTRL_PROD_ID, CTRL_VAR_ID, CTRL_IMG_ID, CTRL_SETTING_KEY);
    console.log(`Control records matching exact prefix "${CTRL_PREFIX}" cleaned up.`);
  }

  // Final count check: confirms database baseline state is preserved
  assertTest(
    'Final verification: Pre-existing database baseline counts completely preserved',
    () => {
      const finalCounts = {
        categories: db.prepare("SELECT COUNT(*) as c FROM categories").get().c,
        products: db.prepare("SELECT COUNT(*) as c FROM products").get().c,
        variants: db.prepare("SELECT COUNT(*) as c FROM product_variants").get().c,
        images: db.prepare("SELECT COUNT(*) as c FROM product_images").get().c,
        inventoryLogs: db.prepare("SELECT COUNT(*) as c FROM inventory_logs").get().c,
        siteSettings: db.prepare("SELECT COUNT(*) as c FROM site_settings").get().c
      };

      for (const [table, count] of Object.entries(baselineCounts)) {
        if (finalCounts[table] !== count) {
          throw new Error(`Count mismatch in table "${table}": expected ${count}, got ${finalCounts[table]}`);
        }
      }
    },
    true
  );
}

console.log('=================================================================');
console.log(`Phase 1 Test Suite Summary: ${passed} Passed, ${failed} Failed`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL ${passed} LOCAL SCHEMA INTEGRITY & CONSTRAINT ASSERTIONS PASSED!`);
  console.log('🛡️ NON-DESTRUCTIVE EXECUTION CONFIRMED: Parameterized exact-prefix cleanup preserved database baseline state.');
  console.log('ℹ️ NOTE: D1 batch transaction simulation is a local SQLite test; full env.DB.batch() API integration testing will be performed in Phase 2.');
  process.exit(0);
}
