/**
 * Generates and validates the exact Stage 3B production import SQL file
 * matching the approved catalogue preview and stage3b-import.js logic.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const previewPath = 'data/phase_11_4A_catalogue_import_preview.json';
const previewContent = fs.readFileSync(previewPath);
const hash = crypto.createHash('sha256').update(previewContent).digest('hex').toUpperCase();

if (hash !== 'E6D4DAC029B4D6335C8B1A00064C6C8CAB4C236C1B533A1CE3BEC3D1214262F5') {
  throw new Error(`Catalogue preview SHA-256 mismatch! Expected E6D4DAC029B4D6335C8B1A00064C6C8CAB4C236C1B533A1CE3BEC3D1214262F5, found ${hash}`);
}

console.log('✅ Verified catalogue preview SHA-256:', hash);

const BATCH_ID = 'stage3b-import-20261116';
const OPERATION_KEY = 'stage-3b-catalogue-import';
const EXECUTION_ID = 'exec-stage3b-prod-' + crypto.randomBytes(8).toString('hex');
const INITIATED_BY = 'authorized-production-rollout@yesenterprises.net.in';
const postImportTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

let sql = `-- =============================================================================\n`;
sql += `-- YES ENTERPRISES — Stage 3B Production Catalogue Import\n`;
sql += `-- Generated: ${postImportTimestamp}\n`;
sql += `-- Execution ID: ${EXECUTION_ID}\n`;
sql += `-- Batch ID: ${BATCH_ID}\n`;
sql += `-- =============================================================================\n\n`;

// 1. Acquire concurrency lock
sql += `-- 1. Acquire Concurrency Lock in system_import_ledger\n`;
sql += `INSERT INTO system_import_ledger (operation_key, execution_id, status, initiated_by, started_at)\n`;
sql += `VALUES ('${OPERATION_KEY}', '${EXECUTION_ID}', 'in_progress', '${INITIATED_BY}', '${postImportTimestamp}');\n\n`;

// 2. Snapshots Group A (7 Standalone Products)
sql += `-- 2. Snapshot 7 Standalone Products into catalogue_import_snapshots\n`;
const standaloneIds = ['prod-01', 'prod-02', 'prod-05', 'prod-07', 'prod-15', 'prod-17', 'prod-18'];
for (const sid of standaloneIds) {
  sql += `INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status)\n`;
  sql += `SELECT 'snap-${BATCH_ID}-${sid}', '${BATCH_ID}', id, 'standalone_update', json_object(\n`;
  sql += `  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,\n`;
  sql += `  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,\n`;
  sql += `  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,\n`;
  sql += `  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,\n`;
  sql += `  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,\n`;
  sql += `  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,\n`;
  sql += `  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,\n`;
  sql += `  'min_order_quantity', min_order_quantity\n`;
  sql += `), updated_at, '${postImportTimestamp}', 'active'\n`;
  sql += `FROM products WHERE id = '${sid}';\n\n`;
}

// 3. Snapshots Group B (7 Legacy Products)
sql += `-- 3. Snapshot 7 Legacy Products into catalogue_import_snapshots\n`;
const legacyIds = ['prod-03', 'prod-04', 'prod-06', 'prod-08', 'prod-09', 'prod-11', 'prod-13'];
for (const lid of legacyIds) {
  sql += `INSERT INTO catalogue_import_snapshots (id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status)\n`;
  sql += `SELECT 'snap-${BATCH_ID}-${lid}', '${BATCH_ID}', id, 'legacy_status', json_object(\n`;
  sql += `  'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug, 'category_id', category_id,\n`;
  sql += `  'description', description, 'description_hi', description_hi, 'material', material, 'brand', brand,\n`;
  sql += `  'has_variants', has_variants, 'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,\n`;
  sql += `  'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,\n`;
  sql += `  'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,\n`;
  sql += `  'status', status, 'is_featured', is_featured, 'sort_order', sort_order, 'notes', notes,\n`;
  sql += `  'created_at', created_at, 'updated_at', updated_at, 'expected_price_per_100_paise', expected_price_per_100_paise,\n`;
  sql += `  'min_order_quantity', min_order_quantity\n`;
  sql += `), updated_at, 'active'\n`;
  sql += `FROM products WHERE id = '${lid}';\n\n`;
}

// 4. Snapshots Group C (3 Family Parents into product_conversion_snapshots)
sql += `-- 4. Snapshot 3 Family Parents into product_conversion_snapshots\n`;
const familyIds = ['prod-14', 'prod-16', 'prod-19'];
for (const fid of familyIds) {
  sql += `INSERT INTO product_conversion_snapshots (\n`;
  sql += `  id, product_id, snapshot_timestamp, converted_by,\n`;
  sql += `  baseline_base_price_paise, baseline_compare_at_price_paise,\n`;
  sql += `  baseline_expected_price_per_100_paise, baseline_min_order_quantity,\n`;
  sql += `  baseline_sku, baseline_has_variants, baseline_images_json, status\n`;
  sql += `)\n`;
  sql += `SELECT 'snap-${fid}-catalogue-import', id, CURRENT_TIMESTAMP, '${INITIATED_BY}',\n`;
  sql += `  base_price_paise, compare_at_price_paise, expected_price_per_100_paise, min_order_quantity,\n`;
  sql += `  sku, has_variants,\n`;
  sql += `  (SELECT json_group_array(json_object('id', id, 'key', image_key, 'variant_id', variant_id, 'is_primary', is_primary, 'sort_order', sort_order)) FROM product_images WHERE product_id = '${fid}'),\n`;
  sql += `  'active'\n`;
  sql += `FROM products WHERE id = '${fid}';\n\n`;
}

// 5. Group D (7 Legacy Products transition to 'draft', updated_at unchanged)
sql += `-- 5. Transition 7 Legacy Products to draft status (updated_at unchanged)\n`;
for (const lid of legacyIds) {
  sql += `UPDATE products SET status = 'draft' WHERE id = '${lid}' AND status = 'active';\n`;
}
sql += `\n`;

// 6. Group E (7 Standalone Products Updates)
sql += `-- 6. Update 7 Standalone Products\n`;
const standaloneDefs = [
  {
    id: 'prod-01', name: "Glass Feeding Bottle — 250 ml (Blue)", name_hi: "कांच की फीडिंग बोतल — 250 ml (नीली)",
    slug: 'glass-feeding-bottle-250ml-blue', cat: 'glass-bottles',
    desc: "250 ml clear glass bottle with blue threaded collar ring, printed cartoon animals, embossed graduation scale, and clear dome cap.",
    desc_hi: "नीले थ्रेडेड कॉलर रिंग, प्रिंटेड कार्टून और उभरे हुए मापन चिह्नों के साथ 250 ml कांच की बोतल।",
    mat: "Clear Glass with screen print and etched scale", brand: "Moon Baby / YE",
    price: 24000, exp100: 850000, moq: 'NULL', status: 'active',
    specs: JSON.stringify({ capacity: "250 ml", material: "Clear glass body with blue collar ring", brand: "Moon Baby", colours: "Blue collar ring with blue cartoon graphics" })
  },
  {
    id: 'prod-02', name: "Glass Feeding Bottle — 60 ml (Pink)", name_hi: "कांच की फीडिंग बोतल — 60 ml (गुलाबी)",
    slug: 'glass-feeding-bottle-60ml-pink', cat: 'glass-bottles',
    desc: "Small 60 ml clear glass newborn bottle with durable cartoon print, pink threaded collar, silicone teat, and clear cap.",
    desc_hi: "टिकाऊ कार्टून प्रिंट, गुलाबी थ्रेडेड कॉलर, सिलिकॉन निप्पल और पारदर्शी कैप के साथ 60 ml कांच की बोतल।",
    mat: "Glass with durable screen print", brand: "Moon Baby / YE",
    price: 14900, exp100: 650000, moq: 'NULL', status: 'active',
    specs: JSON.stringify({ capacity: "60 ml", material: "Clear glass body with food-grade plastic collar and silicone teat", brand: "Moon Baby", colours: "Pink collar ring and matching cartoon print" })
  },
  {
    id: 'prod-05', name: "Silicone Sleeve Feeding Bottle — 250 ml", name_hi: "सिलिकॉन स्लीव फीडिंग बोतल — 250 ml",
    slug: 'silicone-sleeve-feeding-bottle-250ml', cat: 'silicone-sleeve',
    desc: "Glass feeding bottle with protective star-cutout silicone sleeve, anti-slip grip, and durable hygiene dome cap.",
    desc_hi: "सुरक्षात्मक स्टार-कटआउट सिलिकॉन स्लीव और एंटी-स्लिप ग्रिप के साथ ग्लास फीडिंग बोतल।",
    mat: "Glass Bottle with Food-Grade Silicone Star Sleeve", brand: "YE",
    price: 27500, exp100: 990000, moq: 'NULL', status: 'active',
    specs: JSON.stringify({ capacity: "250 ml", material: "Glass bottle with food-grade silicone star sleeve (handle-less)", brand: "YE", colours: "Royal blue star-cutout sleeve with blue collar ring" })
  },
  {
    id: 'prod-07', name: "Silicone Sleeve Feeding Bottle — 120 ml", name_hi: "सिलिकॉन स्लीव फीडिंग बोतल — 120 ml",
    slug: 'silicone-sleeve-feeding-bottle-120ml', cat: 'silicone-sleeve',
    desc: "Compact 120 ml glass feeding bottle encased in shock-resistant star silicone sleeve, ideal for newborns and infant feeding.",
    desc_hi: "नवजात शिशुओं के लिए आदर्श, शॉक-रेसिस्टेंट स्टार सिलिकॉन स्लीव में 120 ml ग्लास फीडिंग बोतल।",
    mat: "Glass Bottle with Food-Grade Silicone Star Sleeve", brand: "YE",
    price: 24900, exp100: 950000, moq: 'NULL', status: 'active',
    specs: JSON.stringify({ capacity: "120 ml", material: "Glass bottle with protective silicone sleeve", brand: "YE", colours: "Royal blue star sleeve" })
  },
  {
    id: 'prod-15', name: "Stainless Steel Tiffin Box Set", name_hi: "स्टेनलेस स्टील टिफिन बॉक्स सेट",
    slug: 'stainless-steel-tiffin-box-set', cat: 'ss-tiffin',
    desc: "2-piece stainless steel lunch box set featuring spill-resistant silicone-sealed clip lid, nested interior snack box, and stainless spoon.",
    desc_hi: "सिलिकॉन-सील्ड क्लिप ढक्कन, छोटे इनर स्नैक बॉक्स और चम्मच के साथ 2-पीस स्टेनलेस स्टील लंच बॉक्स सेट।",
    mat: "SS 304 Stainless Steel Body with Silicone Gasket Plastic Lid", brand: "YE",
    price: 45000, exp100: 2950000, moq: 'NULL', status: 'active',
    specs: JSON.stringify({ capacity: "2-piece lunch box set (Main lunch box + mini container with spoon)", material: "Stainless steel interior with airtight snap-clamp lid and silicone sealing ring", brand: "YE", colours: "Silver stainless body with turquoise clip lid" })
  },
  {
    id: 'prod-17', name: "YE Stainless Steel Feeding Bottle with Handles — 250 ml", name_hi: "YE हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल — 250 ml",
    slug: 'ye-stainless-steel-feeding-bottle-handles-250ml', cat: 'ss-bottles',
    desc: "Stainless steel feeding bottle with twin grip handles, embossed graduation markings up to 250 ml, and protective cap. Made from SS 304 grade stainless steel.",
    desc_hi: "ट्विन ग्रिप हैंडल, 250 ml तक उभरे हुए मापन चिह्नों और सुरक्षात्मक कैप के साथ स्टेनलेस स्टील फीडिंग बोतल।",
    mat: "SS 304 Stainless Steel", brand: "YE",
    price: 24900, exp100: 1500000, moq: 'NULL', status: 'draft',
    specs: JSON.stringify({ capacity: "250 ml", material: "SS 304 Stainless Steel", brand: "YE", colours: "Silver body with pink collar and twin grip handles", features: "Twin grip handles, protective transparent cap, etched graduation scale (50-250 ml)" })
  },
  {
    id: 'prod-18', name: "YE Glass Sipper with Handle — 250 ml", name_hi: "YE हैंडल वाला ग्लास सिपर — 250 ml",
    slug: 'ye-glass-sipper-handle-250ml', cat: 'silicone-sleeve',
    desc: "Glass sipper bottle encased in protective shock-absorbing star-cutout silicone sleeve with twin easy-grip training handles and hygiene dome cap.",
    desc_hi: "ग्लास सिपर बोतल, शॉक-एब्जॉर्बिंग स्टार-कटआउट सिलिकॉन स्लीव और ट्विन ट्रेनिंग हैंडल के साथ।",
    mat: "Glass with Protective Silicone Star Sleeve", brand: "YE",
    price: 27500, exp100: 1100000, moq: 'NULL', status: 'draft',
    specs: JSON.stringify({ capacity: "250 ml", material: "Glass bottle with protective silicone star sleeve and twin training handles", brand: "YE", colours: "Turquoise sleeve with matching handles and collar ring" })
  }
];

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

for (const d of standaloneDefs) {
  sql += `UPDATE products SET\n`;
  sql += `  name = '${escapeSql(d.name)}',\n`;
  sql += `  name_hi = '${escapeSql(d.name_hi)}',\n`;
  sql += `  slug = '${escapeSql(d.slug)}',\n`;
  sql += `  category_id = '${escapeSql(d.cat)}',\n`;
  sql += `  description = '${escapeSql(d.desc)}',\n`;
  sql += `  description_hi = '${escapeSql(d.desc_hi)}',\n`;
  sql += `  material = '${escapeSql(d.mat)}',\n`;
  sql += `  brand = '${escapeSql(d.brand)}',\n`;
  sql += `  has_variants = 0,\n`;
  sql += `  base_price_paise = ${d.price},\n`;
  sql += `  expected_price_per_100_paise = ${d.exp100},\n`;
  sql += `  min_order_quantity = ${d.moq},\n`;
  sql += `  specifications_json = '${escapeSql(d.specs)}',\n`;
  sql += `  status = '${d.status}',\n`;
  sql += `  updated_at = '${postImportTimestamp}'\n`;
  sql += `WHERE id = '${d.id}';\n\n`;
}

// 7. Group F (3 Family Parents Conversion)
sql += `-- 7. Convert 3 Family Parents (has_variants = 1, base pricing cleared)\n`;
const familyDefs = [
  {
    id: 'prod-14', name: "SS 304 Stainless Steel Feeding Bottle Family", name_hi: "SS 304 स्टेनलेस स्टील फीडिंग बोतल फैमिली",
    slug: 'stainless-steel-feeding-bottle-ss304', cat: 'ss-bottles',
    desc: "Premium SS 304 food-grade stainless steel feeding bottle with straight cylindrical body, laser-engraved YE branding, clear embossed capacity markings, and protective steel cap.",
    desc_hi: "सीधे बेलनाकार आकार, लेजर-एन्ग्रेव्ड YE ब्रांडिंग, स्पष्ट उभरे हुए मापन चिह्नों और सुरक्षात्मक स्टील कैप के साथ प्रीमियम SS 304 फूड-ग्रेड स्टेनलेस स्टील फीडिंग बोतल।",
    mat: "SS 304 Food Grade Stainless Steel", brand: "YE", status: 'active'
  },
  {
    id: 'prod-16', name: "Stainless Steel Vacuum Cola Water Bottle Family", name_hi: "स्टेनलेस स्टील वैक्यूम कोला पानी की बोतल फैमिली",
    slug: 'stainless-steel-vacuum-sipper', cat: 'ss-sippers',
    desc: "Double-wall vacuum insulated stainless steel water bottle in classic cola contour. Jointless design with threaded stainless screw cap. Up to 24 hours thermal retention.",
    desc_hi: "क्लासिक कोला आकार में डबल-वॉल वैक्यूम इंसुलेटेड स्टेनलेस स्टील पानी की बोतल। 24 घंटे गर्म और ठंडा रखने की निर्माता द्वारा बताई गई क्षमता।",
    mat: "Double-Wall Vacuum Insulated Stainless Steel", brand: "YE", status: 'active'
  },
  {
    id: 'prod-19', name: "YE Premium Stainless Steel Feeding Bottle Family", name_hi: "YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल फैमिली",
    slug: 'ye-premium-stainless-steel-feeding-bottle-200ml', cat: 'ss-bottles',
    desc: "Ergonomically contoured wide-neck premium SS 304 stainless steel feeding bottle with laser-engraved YE branding, anti-colic silicone teat, and crystal-clear dome cap.",
    desc_hi: "सुविधाजनक घुमावदार चौड़े मुंह वाली प्रीमियम SS 304 स्टेनलेस स्टील फीडिंग बोतल, लेजर-एन्ग्रेव्ड YE ब्रांडिंग और एंटी-कोलिक सिलिकॉन निप्पल के साथ।",
    mat: "SS 304 Food Grade Stainless Steel", brand: "YE", status: 'draft'
  }
];

for (const f of familyDefs) {
  sql += `UPDATE products SET\n`;
  sql += `  name = '${escapeSql(f.name)}',\n`;
  sql += `  name_hi = '${escapeSql(f.name_hi)}',\n`;
  sql += `  slug = '${escapeSql(f.slug)}',\n`;
  sql += `  category_id = '${escapeSql(f.cat)}',\n`;
  sql += `  description = '${escapeSql(f.desc)}',\n`;
  sql += `  description_hi = '${escapeSql(f.desc_hi)}',\n`;
  sql += `  material = '${escapeSql(f.mat)}',\n`;
  sql += `  brand = '${escapeSql(f.brand)}',\n`;
  sql += `  has_variants = 1,\n`;
  sql += `  base_price_paise = NULL,\n`;
  sql += `  compare_at_price_paise = NULL,\n`;
  sql += `  expected_price_per_100_paise = NULL,\n`;
  sql += `  min_order_quantity = NULL,\n`;
  sql += `  status = '${f.status}',\n`;
  sql += `  updated_at = '${postImportTimestamp}'\n`;
  sql += `WHERE id = '${f.id}';\n\n`;
}

// 8. Group G (9 Active Variants)
sql += `-- 8. Insert 9 Active Capacity Variants\n`;
const variantDefs = [
  { id: 'var-prod-14-150', pid: 'prod-14', sku: 'YE-SS-STR-150', title: '150 ml', title_hi: '150 ml', cap: '150 ml', price: 35000, exp100: 1350000, sort: 0 },
  { id: 'var-prod-14-200', pid: 'prod-14', sku: 'YE-SS-STR-200', title: '200 ml', title_hi: '200 ml', cap: '200 ml', price: 39900, exp100: 1450000, sort: 1 },
  { id: 'var-prod-14-250', pid: 'prod-14', sku: 'YE-SS-STR-250', title: '250 ml', title_hi: '250 ml', cap: '250 ml', price: 44900, exp100: 1550000, sort: 2 },
  { id: 'var-prod-14-300', pid: 'prod-14', sku: 'YE-SS-STR-300', title: '300 ml', title_hi: '300 ml', cap: '300 ml', price: 49900, exp100: 1650000, sort: 3 },
  { id: 'var-prod-19-200', pid: 'prod-19', sku: 'YE-SS-PRM-200', title: '200 ml', title_hi: '200 ml', cap: '200 ml', price: 54900, exp100: 1900000, sort: 0 },
  { id: 'var-prod-19-250', pid: 'prod-19', sku: 'YE-SS-PRM-250', title: '250 ml', title_hi: '250 ml', cap: '250 ml', price: 59900, exp100: 1990000, sort: 1 },
  { id: 'var-prod-16-500', pid: 'prod-16', sku: 'YE-COLA-500', title: '500 ml', title_hi: '500 ml', cap: '500 ml', price: 59900, exp100: 3490000, sort: 0 },
  { id: 'var-prod-16-750', pid: 'prod-16', sku: 'YE-COLA-750', title: '750 ml', title_hi: '750 ml', cap: '750 ml', price: 64900, exp100: 3650000, sort: 1 },
  { id: 'var-prod-16-1000', pid: 'prod-16', sku: 'YE-COLA-1000', title: '1 Litre', title_hi: '1 लीटर', cap: '1 Litre', price: 79900, exp100: 3990000, sort: 2 }
];

for (const v of variantDefs) {
  sql += `INSERT INTO product_variants (\n`;
  sql += `  id, product_id, sku, title, title_hi, attributes_json,\n`;
  sql += `  price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,\n`;
  sql += `  status, sort_order, expected_price_per_100_paise, min_order_quantity\n`;
  sql += `) VALUES (\n`;
  sql += `  '${v.id}', '${v.pid}', '${v.sku}', '${v.title}', '${v.title_hi}', '${JSON.stringify({ capacity: v.cap })}',\n`;
  sql += `  ${v.price}, NULL, 0, 5, 'active', ${v.sort}, ${v.exp100}, NULL\n`;
  sql += `);\n`;
}
sql += `\n`;

// 9. Group H (Update Ledger to 'completed')
sql += `-- 9. Complete Ledger Entry\n`;
const metadata = JSON.stringify({
  batch_id: BATCH_ID,
  execution_id: EXECUTION_ID,
  initiated_by: INITIATED_BY,
  standalone_updated: 7,
  legacy_drafted: 7,
  parents_converted: 3,
  variants_inserted: 9,
  standalone_snapshots: 7,
  legacy_snapshots: 7,
  conversion_snapshots: 3,
  total_catalogue_snapshots: 14
});

sql += `UPDATE system_import_ledger SET\n`;
sql += `  status = 'completed',\n`;
sql += `  completed_at = CURRENT_TIMESTAMP,\n`;
sql += `  metadata_json = '${escapeSql(metadata)}'\n`;
sql += `WHERE operation_key = '${OPERATION_KEY}';\n`;

const outPath = 'migrations/stage3b_production_import.sql';
fs.writeFileSync(outPath, sql);
console.log('✅ Wrote Stage 3B import SQL file:', outPath);

// Validate SQL against isolated in-memory DB
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');
const backupSql = fs.readFileSync('D:/YES-ENTERPRISES-production-backups/2026-11-16/yes_enterprises_db_pre_migration0008_20261116_135100.sql', 'utf8')
  .split('\n')
  .filter(l => !l.trim().startsWith('--') && !l.trim().startsWith('/*') && l.trim() !== '')
  .join('\n');
db.exec(backupSql);
db.exec(fs.readFileSync('migrations/0008_add_catalogue_import_snapshots_and_ledger.sql', 'utf8'));

// Run generated import SQL
db.exec(sql);

const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
if (fkErrors.length > 0) {
  throw new Error(`Foreign key errors after import: ${JSON.stringify(fkErrors)}`);
}

const counts = {
  total_products: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
  active_products: db.prepare('SELECT COUNT(*) as c FROM products WHERE status = \'active\'').get().c,
  draft_products: db.prepare('SELECT COUNT(*) as c FROM products WHERE status = \'draft\'').get().c,
  active_variants: db.prepare('SELECT COUNT(*) as c FROM product_variants WHERE status = \'active\'').get().c,
  catalogue_snapshots: db.prepare('SELECT COUNT(*) as c FROM catalogue_import_snapshots').get().c,
  conversion_snapshots: db.prepare('SELECT COUNT(*) as c FROM product_conversion_snapshots WHERE status = \'active\'').get().c,
  images: db.prepare('SELECT COUNT(*) as c FROM product_images').get().c,
  ledger_status: db.prepare('SELECT status FROM system_import_ledger WHERE operation_key = \'stage-3b-catalogue-import\'').get().status
};

console.log('✅ In-memory validation results:', JSON.stringify(counts, null, 2));

if (
  counts.total_products === 17 &&
  counts.active_products === 7 &&
  counts.draft_products === 10 &&
  counts.active_variants === 9 &&
  counts.catalogue_snapshots === 14 &&
  counts.conversion_snapshots === 3 &&
  counts.images === 28 &&
  counts.ledger_status === 'completed'
) {
  console.log('🎉 100% SUCCESS: All Section 8 assertions passed in isolated validation!');
} else {
  throw new Error('Counts mismatch!');
}
