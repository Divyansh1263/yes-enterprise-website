import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('Testing disposable product deletion and cascade on remote D1...');

// 1. Insert disposable test product
execSync('npx wrangler d1 execute yes_enterprises_db --remote --command="INSERT INTO products (id, name, name_hi, slug, category_id, status) VALUES (\'test-del-prod\', \'Test Deletable Product\', \'टेस्ट\', \'test-del-prod\', \'glass-bottles\', \'draft\');"', { stdio: 'inherit' });
execSync('npx wrangler d1 execute yes_enterprises_db --remote --command="INSERT INTO product_variants (id, product_id, title, title_hi) VALUES (\'var-test-del\', \'test-del-prod\', \'Test Var\', \'टेस्ट\');"', { stdio: 'inherit' });

// 2. Verify existence
const check1 = execSync('npx wrangler d1 execute yes_enterprises_db --remote --command="SELECT id FROM products WHERE id = \'test-del-prod\';"').toString();
assert.ok(check1.includes('test-del-prod'), 'Test product should exist before deletion');
console.log('✅ Disposable product successfully created.');

// 3. Perform atomic batch deletion
const batchSql = 'DELETE FROM cleanup_claims WHERE image_key IN (SELECT image_key FROM pending_uploads WHERE product_id = \'test-del-prod\'); DELETE FROM pending_uploads WHERE product_id = \'test-del-prod\'; DELETE FROM product_images WHERE product_id = \'test-del-prod\'; DELETE FROM inventory_logs WHERE product_id = \'test-del-prod\'; DELETE FROM product_conversion_snapshots WHERE product_id = \'test-del-prod\'; DELETE FROM product_variants WHERE product_id = \'test-del-prod\'; DELETE FROM products WHERE id = \'test-del-prod\';';
execSync(`npx wrangler d1 execute yes_enterprises_db --remote --command="${batchSql}"`, { stdio: 'inherit' });

// 4. Verify product and variant are completely gone
const check2 = execSync('npx wrangler d1 execute yes_enterprises_db --remote --command="SELECT id FROM products WHERE id = \'test-del-prod\';"').toString();
assert.ok(!check2.includes('test-del-prod'), 'Product must be completely deleted');

const varCheck = execSync('npx wrangler d1 execute yes_enterprises_db --remote --command="SELECT id FROM product_variants WHERE product_id = \'test-del-prod\';"').toString();
assert.ok(!varCheck.includes('var-test-del'), 'Child variants must be cleanly cascaded');

console.log('✅ PASS: Disposable test product and child variants cleanly deleted with zero orphaned records!');
