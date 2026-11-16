/**
 * YES ENTERPRISES — Stage 3B Status & Reconciliation Endpoint
 * GET /api/admin/system/stage3b-status
 *
 * Read-only status report providing state reconciliation in the event of
 * client network timeouts, disconnected requests, or audit verification.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';

export async function onRequestGet(context) {
  try {
    const auth = await validateAdminSession(context);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status, auth.code);
    }

    const db = getDatabase(context);

    // 1. Fetch import ledger status
    const ledger = await db.prepare(`
      SELECT operation_key, execution_id, status, initiated_by, started_at, completed_at, error_message, metadata_json
      FROM system_import_ledger
      WHERE operation_key = 'stage-3b-catalogue-import'
      LIMIT 1;
    `).first();

    // 2. Fetch live product counts by status
    const productStats = await db.prepare(`
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_products,
        SUM(CASE WHEN has_variants = 1 THEN 1 ELSE 0 END) as variant_families
      FROM products;
    `).first();

    // 3. Fetch variants count
    const variantStats = await db.prepare(`
      SELECT
        COUNT(*) as total_variants,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_variants,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_variants
      FROM product_variants;
    `).first();

    // 4. Fetch snapshot counts
    const conversionSnapshots = await db.prepare(`
      SELECT COUNT(*) as count FROM product_conversion_snapshots WHERE status = 'active';
    `).first();

    const importSnapshots = await db.prepare(`
      SELECT
        COUNT(*) as total_snapshots,
        SUM(CASE WHEN snapshot_type = 'standalone_update' AND status = 'active' THEN 1 ELSE 0 END) as standalone_snapshots,
        SUM(CASE WHEN snapshot_type = 'legacy_status' AND status = 'active' THEN 1 ELSE 0 END) as legacy_snapshots,
        SUM(CASE WHEN snapshot_type = 'family_conversion' AND status = 'active' THEN 1 ELSE 0 END) as family_snapshots
      FROM catalogue_import_snapshots;
    `).first();

    // 5. Fetch images count
    const imagesCount = await db.prepare(`SELECT COUNT(*) as count FROM product_images;`).first();

    // Reconciled determination
    const isCommitted = (
      productStats?.total_products === 17 &&
      productStats?.active_products === 7 &&
      productStats?.draft_products === 10 &&
      variantStats?.active_variants === 9 &&
      conversionSnapshots?.count === 3 &&
      importSnapshots?.total_snapshots === 14
    );

    return jsonResponse({
      success: true,
      data: {
        ledger: ledger || { status: 'not_started' },
        reconciled_state: {
          is_committed: isCommitted,
          total_products: productStats?.total_products || 0,
          active_products: productStats?.active_products || 0,
          draft_products: productStats?.draft_products || 0,
          variant_families: productStats?.variant_families || 0,
          active_variants: variantStats?.active_variants || 0,
          conversion_snapshots: conversionSnapshots?.count || 0,
          total_catalogue_snapshots: importSnapshots?.total_snapshots || 0,
          standalone_snapshots: importSnapshots?.standalone_snapshots || 0,
          legacy_snapshots: importSnapshots?.legacy_snapshots || 0,
          family_snapshots: importSnapshots?.family_snapshots || 0,
          total_images: imagesCount?.count || 0
        }
      }
    }, 200, noCacheHeaders());

  } catch (err) {
    return handleDbError(err, 'Failed to retrieve Stage 3B import status.');
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestGet(context);
}
