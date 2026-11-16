/**
 * YES ENTERPRISES — Production Catalogue Import Handler (Option A)
 * POST /api/admin/system/stage3b-import
 *
 * Atomically executes Stage 3B catalogue conversion, snapshot creation,
 * legacy draft transition, and variant insertion using Cloudflare D1's native
 * transactional batch() API.
 *
 * Strict Security & Concurrency Guarantees:
 * - Requires active Cloudflare Zero Trust admin session (validateAdminSession)
 * - Requires single-use owner-approved execution token from STAGE3B_IMPORT_TOKEN secret
 * - Durable concurrency lock via system_import_ledger with execution_id ownership
 * - Pre-validates all 9 variants against approved specs to prevent silent collisions
 * - Captures 14 full-row JSON snapshots in catalogue_import_snapshots (7 standalone, 7 legacy)
 * - Captures 3 conversion snapshots in product_conversion_snapshots (3 family parents)
 * - All statements run inside one atomic D1 batch; failure rolls back completely
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';

const BATCH_ID = 'stage3b-import-20261116';
const OPERATION_KEY = 'stage-3b-catalogue-import';

export async function onRequestPost(context) {
  let executionId = null;
  try {
    // 1. Authenticate admin identity via Cloudflare Access
    const auth = await validateAdminSession(context);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status, auth.code);
    }

    // 2. Parse and validate execution payload
    let body;
    try {
      body = await context.request.json();
    } catch {
      return errorResponse('Invalid JSON body in request.', 400, 'INVALID_JSON');
    }

    const { import_token, execution_id } = body || {};
    executionId = execution_id;

    if (!import_token || typeof import_token !== 'string') {
      return errorResponse('Owner-approved import_token is required.', 403, 'TOKEN_REQUIRED');
    }

    if (!execution_id || typeof execution_id !== 'string') {
      return errorResponse('Unique execution_id is required.', 400, 'EXECUTION_ID_REQUIRED');
    }

    // Verify token strictly against environment secret (no hardcoded fallback)
    const expectedToken = context.env?.STAGE3B_IMPORT_TOKEN;
    if (!expectedToken) {
      return errorResponse(
        'Server configuration error: STAGE3B_IMPORT_TOKEN environment secret is not configured.',
        500,
        'SERVER_MISCONFIGURED'
      );
    }
    if (import_token !== expectedToken) {
      return errorResponse('Invalid import execution token. Operation rejected.', 403, 'INVALID_TOKEN');
    }

    const db = getDatabase(context);

    // 3. Concurrency and repeat-execution locking via system_import_ledger
    const existingLedger = await db.prepare(`
      SELECT status, started_at, completed_at, execution_id FROM system_import_ledger WHERE operation_key = ?
    `).bind(OPERATION_KEY).first();

    if (existingLedger) {
      if (existingLedger.status === 'in_progress') {
        return errorResponse(
          'Stage 3B import is currently executing in another request. Concurrency locked.',
          409,
          'CONCURRENT_EXECUTION_BLOCKED'
        );
      }
      if (existingLedger.status === 'completed') {
        return errorResponse(
          'Stage 3B import has already completed successfully. Repeat execution blocked.',
          400,
          'ALREADY_COMPLETED'
        );
      }
      if (existingLedger.status === 'failed') {
        return errorResponse(
          'A previous import attempt failed. Reconcile database state via /api/admin/system/stage3b-status before retrying.',
          400,
          'PREVIOUS_FAILURE_UNRESOLVED'
        );
      }
    }

    // Acquire lock atomically
    await db.prepare(`
      INSERT INTO system_import_ledger (operation_key, execution_id, status, initiated_by)
      VALUES (?, ?, 'in_progress', ?);
    `).bind(OPERATION_KEY, execution_id, auth.user.email).run();

    // 4. Precondition Verification before Batch Construction
    const legacyIds = ['prod-03', 'prod-04', 'prod-06', 'prod-08', 'prod-09', 'prod-11', 'prod-13'];
    const standaloneIds = ['prod-01', 'prod-02', 'prod-05', 'prod-07', 'prod-15', 'prod-17', 'prod-18'];
    const familyIds = ['prod-14', 'prod-16', 'prod-19'];

    // Verify all 17 products exist
    const { results: existingProducts } = await db.prepare(`
      SELECT id, category_id, status, has_variants, base_price_paise, updated_at FROM products;
    `).all();

    const productMap = new Map((existingProducts || []).map(p => [p.id, p]));
    if (productMap.size !== 17) {
      throw new Error(`Precondition failed: Expected 17 products in database, found ${productMap.size}`);
    }

    for (const lid of legacyIds) {
      if (!productMap.has(lid)) throw new Error(`Precondition failed: Legacy product ${lid} missing`);
      if (productMap.get(lid).status !== 'active') {
        throw new Error(`Precondition failed: Legacy product ${lid} is not in expected 'active' baseline state`);
      }
    }
    for (const sid of standaloneIds) {
      if (!productMap.has(sid)) throw new Error(`Precondition failed: Standalone product ${sid} missing`);
    }
    for (const fid of familyIds) {
      if (!productMap.has(fid)) throw new Error(`Precondition failed: Family parent product ${fid} missing`);
    }

    // 9 Approved Variant Definitions
    const variantDefinitions = [
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

    // Pre-validate all 9 variants against existing variants in database
    const { results: existingVariants } = await db.prepare(`
      SELECT id, product_id, sku, attributes_json, price_paise, expected_price_per_100_paise, status
      FROM product_variants
      WHERE id IN (${variantDefinitions.map(() => '?').join(',')})
         OR sku IN (${variantDefinitions.map(() => '?').join(',')});
    `).bind(...variantDefinitions.map(v => v.id), ...variantDefinitions.map(v => v.sku)).all();

    if (existingVariants && existingVariants.length > 0) {
      const existingMap = new Map(existingVariants.map(v => [v.id, v]));
      for (const v of variantDefinitions) {
        const existing = existingMap.get(v.id);
        if (existing) {
          const existingAttrs = JSON.parse(existing.attributes_json || '{}');
          if (
            existing.product_id !== v.pid ||
            existing.sku !== v.sku ||
            existingAttrs.capacity !== v.cap ||
            existing.price_paise !== v.price ||
            existing.expected_price_per_100_paise !== v.exp100 ||
            existing.status !== 'active'
          ) {
            throw new Error(
              `Precondition failed: Pre-existing variant '${v.id}' has conflicting data (SKU: ${existing.sku}, Price: ${existing.price_paise}) that does not match approved definition. Aborting.`
            );
          }
        }
      }
    }

    const postImportTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 5. Construct the Atomic Statements Batch
    const statements = [];

    // Group A: Snapshot 7 Standalone Products into catalogue_import_snapshots (full row JSON)
    for (const sid of standaloneIds) {
      statements.push(
        db.prepare(`
          INSERT INTO catalogue_import_snapshots (
            id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, post_import_updated_at, status
          )
          SELECT
            ?, ?, id, 'standalone_update',
            json_object(
              'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug,
              'category_id', category_id, 'description', description, 'description_hi', description_hi,
              'material', material, 'brand', brand, 'has_variants', has_variants,
              'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
              'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
              'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
              'status', status, 'is_featured', is_featured, 'sort_order', sort_order,
              'notes', notes, 'created_at', created_at, 'updated_at', updated_at,
              'expected_price_per_100_paise', expected_price_per_100_paise,
              'min_order_quantity', min_order_quantity
            ),
            updated_at, ?, 'active'
          FROM products WHERE id = ?
          ON CONFLICT(id) DO NOTHING;
        `).bind(`snap-${BATCH_ID}-${sid}`, BATCH_ID, postImportTimestamp, sid)
      );
    }

    // Group B: Snapshot 7 Legacy Products into catalogue_import_snapshots (full row JSON)
    for (const lid of legacyIds) {
      statements.push(
        db.prepare(`
          INSERT INTO catalogue_import_snapshots (
            id, batch_id, product_id, snapshot_type, original_row_json, original_updated_at, status
          )
          SELECT
            ?, ?, id, 'legacy_status',
            json_object(
              'id', id, 'name', name, 'name_hi', name_hi, 'slug', slug,
              'category_id', category_id, 'description', description, 'description_hi', description_hi,
              'material', material, 'brand', brand, 'has_variants', has_variants,
              'base_price_paise', base_price_paise, 'compare_at_price_paise', compare_at_price_paise,
              'sku', sku, 'stock_quantity', stock_quantity, 'low_stock_threshold', low_stock_threshold,
              'specifications_json', specifications_json, 'variant_attributes_schema_json', variant_attributes_schema_json,
              'status', status, 'is_featured', is_featured, 'sort_order', sort_order,
              'notes', notes, 'created_at', created_at, 'updated_at', updated_at,
              'expected_price_per_100_paise', expected_price_per_100_paise,
              'min_order_quantity', min_order_quantity
            ),
            updated_at, 'active'
          FROM products WHERE id = ?
          ON CONFLICT(id) DO NOTHING;
        `).bind(`snap-${BATCH_ID}-${lid}`, BATCH_ID, lid)
      );
    }

    // Group C: Snapshot 3 Family Parents into product_conversion_snapshots (existing conversion table)
    for (const fid of familyIds) {
      statements.push(
        db.prepare(`
          INSERT INTO product_conversion_snapshots (
            id, product_id, snapshot_timestamp, converted_by,
            baseline_base_price_paise, baseline_compare_at_price_paise,
            baseline_expected_price_per_100_paise, baseline_min_order_quantity,
            baseline_sku, baseline_has_variants, baseline_images_json, status
          )
          SELECT
            ?, id, CURRENT_TIMESTAMP, 'stage3b-import-endpoint',
            base_price_paise, compare_at_price_paise,
            expected_price_per_100_paise, min_order_quantity,
            sku, has_variants,
            (SELECT json_group_array(json_object('id', id, 'key', image_key, 'variant_id', variant_id, 'is_primary', is_primary, 'sort_order', sort_order)) FROM product_images WHERE product_id = ?),
            'active'
          FROM products WHERE id = ?
          ON CONFLICT(id) DO NOTHING;
        `).bind(`snap-${fid}-catalogue-import`, fid, fid)
      );
    }

    // Group D: 7 Legacy Product Updates (ONLY status = 'draft', updated_at UNCHANGED!)
    for (const lid of legacyIds) {
      statements.push(
        db.prepare(`UPDATE products SET status = 'draft' WHERE id = ? AND status = 'active';`).bind(lid)
      );
    }

    // Group E: 7 Standalone Product Updates
    const standaloneDefinitions = [
      {
        id: 'prod-01', name: 'Glass Feeding Bottle — 250 ml (Blue)', name_hi: 'कांच की फीडिंग बोतल — 250 ml (नीली)',
        slug: 'glass-feeding-bottle-250ml-blue', cat: 'glass-bottles',
        desc: '250 ml clear glass bottle with blue threaded collar ring, printed cartoon animals, embossed graduation scale, and clear dome cap.',
        desc_hi: 'नीले थ्रेडेड कॉलर रिंग, प्रिंटेड कार्टून और उभरे हुए मापन चिह्नों के साथ 250 ml कांच की बोतल।',
        mat: 'Clear Glass with screen print and etched scale', brand: 'Moon Baby / YE',
        price: 24000, exp100: 850000, moq: null, status: 'active',
        specs: '{"capacity": "250 ml", "material": "Clear glass body with blue collar ring", "brand": "Moon Baby", "colours": "Blue collar ring with blue cartoon graphics"}'
      },
      {
        id: 'prod-02', name: 'Glass Feeding Bottle — 60 ml (Pink)', name_hi: 'कांच की फीडिंग बोतल — 60 ml (गुलाबी)',
        slug: 'glass-feeding-bottle-60ml-pink', cat: 'glass-bottles',
        desc: 'Small 60 ml clear glass newborn bottle with durable cartoon print, pink threaded collar, silicone teat, and clear cap.',
        desc_hi: 'टिकाऊ कार्टून प्रिंट, गुलाबी थ्रेडेड कॉलर, सिलिकॉन निप्पल और पारदर्शी कैप के साथ 60 ml कांच की बोतल।',
        mat: 'Glass with durable screen print', brand: 'Moon Baby / YE',
        price: 14900, exp100: 650000, moq: null, status: 'active',
        specs: '{"capacity": "60 ml", "material": "Clear glass body with food-grade plastic collar and silicone teat", "brand": "Moon Baby", "colours": "Pink collar ring and matching cartoon print"}'
      },
      {
        id: 'prod-05', name: 'Silicone Sleeve Feeding Bottle — 250 ml', name_hi: 'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml',
        slug: 'silicone-sleeve-feeding-bottle-250ml', cat: 'silicone-sleeve',
        desc: 'Glass feeding bottle with protective star-cutout silicone sleeve, anti-slip grip, and durable hygiene dome cap.',
        desc_hi: 'सुरक्षात्मक स्टार-कटआउट सिलिकॉन स्लीव और एंटी-स्लिप ग्रिप के साथ ग्लास फीडिंग बोतल।',
        mat: 'Glass Bottle with Food-Grade Silicone Star Sleeve', brand: 'YE',
        price: 27500, exp100: 990000, moq: null, status: 'active',
        specs: '{"capacity": "250 ml", "material": "Glass bottle with food-grade silicone star sleeve (handle-less)", "brand": "YE", "colours": "Royal blue star-cutout sleeve with blue collar ring"}'
      },
      {
        id: 'prod-07', name: 'Silicone Sleeve Feeding Bottle — 120 ml', name_hi: 'सिलिकॉन स्लीव फीडिंग बोतल — 120 ml',
        slug: 'silicone-sleeve-feeding-bottle-120ml', cat: 'silicone-sleeve',
        desc: 'Compact 120 ml glass feeding bottle encased in shock-resistant star silicone sleeve, ideal for newborns and infant feeding.',
        desc_hi: 'नवजात शिशुओं के लिए आदर्श, शॉक-रेसिस्टेंट स्टार सिलिकॉन स्लीव में 120 ml ग्लास फीडिंग बोतल।',
        mat: 'Glass Bottle with Food-Grade Silicone Star Sleeve', brand: 'YE',
        price: 24900, exp100: 950000, moq: null, status: 'active',
        specs: '{"capacity": "120 ml", "material": "Glass bottle with protective silicone sleeve", "brand": "YE", "colours": "Royal blue star sleeve"}'
      },
      {
        id: 'prod-15', name: 'Stainless Steel Tiffin Box Set', name_hi: 'स्टेनलेस स्टील टिफिन बॉक्स सेट',
        slug: 'stainless-steel-tiffin-box-set', cat: 'ss-tiffin',
        desc: '2-piece stainless steel lunch box set featuring spill-resistant silicone-sealed clip lid, nested interior snack box, and stainless spoon.',
        desc_hi: 'सिलिकॉन-सील्ड क्लिप ढक्कन, छोटे इनर स्नैक बॉक्स और चम्मच के साथ 2-पीस स्टेनलेस स्टील लंच बॉक्स सेट।',
        mat: 'SS 304 Stainless Steel Body with Silicone Gasket Plastic Lid', brand: 'YE',
        price: 45000, exp100: 2950000, moq: null, status: 'active',
        specs: '{"capacity": "2-piece lunch box set (Main lunch box + mini container with spoon)", "material": "Stainless steel interior with airtight snap-clamp lid and silicone sealing ring", "brand": "YE", "colours": "Silver stainless body with turquoise clip lid"}'
      },
      {
        id: 'prod-17', name: 'YE Stainless Steel Feeding Bottle with Handles — 250 ml', name_hi: 'YE हैंडल वाली स्टेनलेस स्टील फीडिंग बोतल — 250 ml',
        slug: 'ye-stainless-steel-feeding-bottle-handles-250ml', cat: 'ss-bottles',
        desc: 'Stainless steel feeding bottle with twin grip handles, embossed graduation markings up to 250 ml, and protective cap. Made from SS 304 grade stainless steel.',
        desc_hi: 'ट्विन ग्रिप हैंडल, 250 ml तक उभरे हुए मापन चिह्नों और सुरक्षात्मक कैप के साथ स्टेनलेस स्टील फीडिंग बोतल।',
        mat: 'SS 304 Stainless Steel', brand: 'YE',
        price: 24900, exp100: 1500000, moq: null, status: 'draft',
        specs: '{"capacity": "250 ml", "material": "SS 304 Stainless Steel", "brand": "YE", "colours": "Silver body with pink collar and twin grip handles", "features": "Twin grip handles, protective transparent cap, etched graduation scale (50-250 ml)"}'
      },
      {
        id: 'prod-18', name: 'YE Glass Sipper with Handle — 250 ml', name_hi: 'YE हैंडल वाला ग्लास सिपर — 250 ml',
        slug: 'ye-glass-sipper-handle-250ml', cat: 'silicone-sleeve',
        desc: 'Glass sipper bottle encased in protective shock-absorbing star-cutout silicone sleeve with twin easy-grip training handles and hygiene dome cap.',
        desc_hi: 'ग्लास सिपर बोतल, शॉक-एब्जॉर्बिंग स्टार-कटआउट सिलिकॉन स्लीव और ट्विन ट्रेनिंग हैंडल के साथ।',
        mat: 'Glass with Protective Silicone Star Sleeve', brand: 'YE',
        price: 27500, exp100: 1100000, moq: null, status: 'draft',
        specs: '{"capacity": "250 ml", "material": "Glass bottle with protective silicone star sleeve and twin training handles", "brand": "YE", "colours": "Turquoise sleeve with matching handles and collar ring"}'
      }
    ];

    for (const d of standaloneDefinitions) {
      statements.push(
        db.prepare(`
          UPDATE products SET
            name = ?, name_hi = ?, slug = ?, category_id = ?,
            description = ?, description_hi = ?, material = ?, brand = ?,
            has_variants = 0, base_price_paise = ?, expected_price_per_100_paise = ?,
            min_order_quantity = ?, specifications_json = ?, status = ?,
            updated_at = ?
          WHERE id = ?;
        `).bind(
          d.name, d.name_hi, d.slug, d.cat, d.desc, d.desc_hi, d.mat, d.brand,
          d.price, d.exp100, d.moq, d.specs, d.status, postImportTimestamp, d.id
        )
      );
    }

    // Group F: 3 Family Parent Conversions (has_variants = 1, base prices cleared)
    const familyDefinitions = [
      {
        id: 'prod-14', name: 'SS 304 Stainless Steel Feeding Bottle Family', name_hi: 'SS 304 स्टेनलेस स्टील फीडिंग बोतल फैमिली',
        slug: 'stainless-steel-feeding-bottle-ss304', cat: 'ss-bottles',
        desc: 'Premium SS 304 food-grade stainless steel feeding bottle with straight cylindrical body, laser-engraved YE branding, clear embossed capacity markings, and protective steel cap.',
        desc_hi: 'सीधे बेलनाकार आकार, लेजर-एन्ग्रेव्ड YE ब्रांडिंग, स्पष्ट उभरे हुए मापन चिह्नों और सुरक्षात्मक स्टील कैप के साथ प्रीमियम SS 304 फूड-ग्रेड स्टेनलेस स्टील फीडिंग बोतल।',
        mat: 'SS 304 Food Grade Stainless Steel', brand: 'YE', status: 'active'
      },
      {
        id: 'prod-16', name: 'Stainless Steel Vacuum Cola Water Bottle Family', name_hi: 'स्टेनलेस स्टील वैक्यूम कोला पानी की बोतल फैमिली',
        slug: 'stainless-steel-vacuum-sipper', cat: 'ss-sippers',
        desc: 'Double-wall vacuum insulated stainless steel water bottle in classic cola contour. Jointless design with threaded stainless screw cap. Up to 24 hours thermal retention.',
        desc_hi: 'क्लासिक कोला आकार में डबल-वॉल वैक्यूम इंसुलेटेड स्टेनलेस स्टील पानी की बोतल। 24 घंटे गर्म और ठंडा रखने की निर्माता द्वारा बताई गई क्षमता।',
        mat: 'Double-Wall Vacuum Insulated Stainless Steel', brand: 'YE', status: 'active'
      },
      {
        id: 'prod-19', name: 'YE Premium Stainless Steel Feeding Bottle Family', name_hi: 'YE प्रीमियम स्टेनलेस स्टील फीडिंग बोतल फैमिली',
        slug: 'ye-premium-stainless-steel-feeding-bottle-200ml', cat: 'ss-bottles',
        desc: 'Ergonomically contoured wide-neck premium SS 304 stainless steel feeding bottle with laser-engraved YE branding, anti-colic silicone teat, and crystal-clear dome cap.',
        desc_hi: 'सुविधाजनक घुमावदार चौड़े मुंह वाली प्रीमियम SS 304 स्टेनलेस स्टील फीडिंग बोतल, लेजर-एन्ग्रेव्ड YE ब्रांडिंग और एंटी-कोलिक सिलिकॉन निप्पल के साथ।',
        mat: 'SS 304 Food Grade Stainless Steel', brand: 'YE', status: 'draft'
      }
    ];

    for (const f of familyDefinitions) {
      statements.push(
        db.prepare(`
          UPDATE products SET
            name = ?, name_hi = ?, slug = ?, category_id = ?,
            description = ?, description_hi = ?, material = ?, brand = ?,
            has_variants = 1, base_price_paise = NULL, compare_at_price_paise = NULL,
            expected_price_per_100_paise = NULL, min_order_quantity = NULL,
            status = ?, updated_at = ?
          WHERE id = ?;
        `).bind(f.name, f.name_hi, f.slug, f.cat, f.desc, f.desc_hi, f.mat, f.brand, f.status, postImportTimestamp, f.id)
      );
    }

    // Group G: 9 Active Variant Insertions
    for (const v of variantDefinitions) {
      statements.push(
        db.prepare(`
          INSERT INTO product_variants (
            id, product_id, sku, title, title_hi, attributes_json,
            price_paise, compare_at_price_paise, stock_quantity, low_stock_threshold,
            status, sort_order, expected_price_per_100_paise, min_order_quantity
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, 5, 'active', ?, ?, ?)
          ON CONFLICT(id) DO NOTHING;
        `).bind(
          v.id, v.pid, v.sku, v.title, v.title_hi, JSON.stringify({ capacity: v.cap }),
          v.price, v.sort, v.exp100, null
        )
      );
    }

    // Group H: Update Ledger to 'completed' in the same batch
    statements.push(
      db.prepare(`
        UPDATE system_import_ledger SET
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          metadata_json = ?
        WHERE operation_key = ?;
      `).bind(
        JSON.stringify({
          batch_id: BATCH_ID,
          execution_id,
          initiated_by: auth.user.email,
          standalone_updated: 7,
          legacy_drafted: 7,
          parents_converted: 3,
          variants_inserted: 9,
          standalone_snapshots: 7,
          legacy_snapshots: 7,
          conversion_snapshots: 3,
          total_catalogue_snapshots: 14
        }),
        OPERATION_KEY
      )
    );

    // 6. Execute all statements via D1 native batch() API
    await db.batch(statements);

    // 7. Return sanitized execution summary
    return jsonResponse({
      success: true,
      message: 'Stage 3B catalogue conversion and import committed successfully.',
      data: {
        batch_id: BATCH_ID,
        execution_id,
        operation_key: OPERATION_KEY,
        status: 'completed',
        applied_counts: {
          standalone_products_updated: 7,
          legacy_products_drafted: 7,
          family_parents_converted: 3,
          active_variants_inserted: 9,
          standalone_snapshots_created: 7,
          legacy_snapshots_created: 7,
          conversion_snapshots_created: 3,
          total_catalogue_snapshots: 14
        },
        public_state_after_3b: {
          public_catalogue_cards: 7,
          draft_products: 10,
          active_variants: 9
        }
      }
    }, 200, noCacheHeaders());

  } catch (err) {
    // Record failure in ledger ONLY if this request was the one that acquired the lock
    try {
      if (executionId) {
        const db = getDatabase(context);
        await db.prepare(`
          UPDATE system_import_ledger SET
            status = 'failed',
            completed_at = CURRENT_TIMESTAMP,
            error_message = ?
          WHERE operation_key = ? AND execution_id = ? AND status = 'in_progress';
        `).bind(err.message || 'Unknown execution error', OPERATION_KEY, executionId).run();
      }
    } catch {
      // Ignore secondary error
    }
    return handleDbError(err, 'Stage 3B atomic import failed. Transaction rolled back completely.');
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestPost(context);
}
