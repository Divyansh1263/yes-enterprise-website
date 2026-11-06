/**
 * Admin Orphan Upload Cleanup API (POST)
 * Scans abandoned pending uploads (> 24 hours) and expired/failed cleanup claims.
 * Uses lease-based claim tokens, guarantees verified ownership, and safely cleans R2 storage.
 * Requires admin authentication.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../../_shared/responses.js';
import { getDatabase, handleDbError } from '../../../_shared/db.js';
import { validateAdminSession } from '../../../_shared/auth.js';
import { deleteR2Object } from '../../../_shared/r2.js';

export async function onRequestPost(context) {
  const auth = await validateAdminSession(context);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status, auth.code);
  }

  let body = {};
  try {
    body = await context.request.json();
  } catch {
    // Empty body is acceptable; defaults will be used
  }

  const maxItems = Math.min(Number.isInteger(body.max_items) && body.max_items > 0 ? body.max_items : 50, 100);
  const dryRun = Boolean(body.dry_run);

  try {
    const db = getDatabase(context);

    let cleanedCount = 0;
    let errorCount = 0;

    // 1. Scan abandoned pending uploads older than 24 hours
    const expiredPendingResult = await db.prepare(`
      SELECT image_key, product_id, created_at
      FROM pending_uploads
      WHERE created_at < datetime('now', '-24 hours')
      LIMIT ?
    `).bind(maxItems).all();

    const expiredPending = expiredPendingResult.results || [];

    const processedKeys = new Set();

    for (const item of expiredPending) {
      const { image_key } = item;

      // Check if image was finalized in product_images
      const inUse = await db.prepare('SELECT 1 FROM product_images WHERE image_key = ?').bind(image_key).first();
      if (inUse) {
        // Image was finalized; simply clean the stale pending_uploads record
        if (!dryRun) {
          await db.prepare('DELETE FROM pending_uploads WHERE image_key = ?').bind(image_key).run();
        }
        cleanedCount++;
        processedKeys.add(image_key);
        continue;
      }

      if (dryRun) {
        cleanedCount++;
        processedKeys.add(image_key);
        continue;
      }

      // Acquire atomic lease-based claim: insert if new, or reacquire if expired 'claimed'
      // Note: Must NEVER transition 'failed' or 'deleting' to 'claimed'!
      const claimToken = `cleanup_${crypto.randomUUID()}`;
      await db.prepare(`
        INSERT INTO cleanup_claims (image_key, claim_token, lease_expires_at, status)
        VALUES (?, ?, datetime('now', '+5 minutes'), 'claimed')
        ON CONFLICT(image_key) DO UPDATE SET
          claim_token = excluded.claim_token,
          lease_expires_at = excluded.lease_expires_at,
          status = 'claimed'
        WHERE cleanup_claims.status = 'claimed'
          AND cleanup_claims.lease_expires_at < datetime('now')
      `).bind(image_key, claimToken).run();

      // Check if this worker won the claim (active unexpired claims owned by other workers will NOT be stolen)
      const currentClaim = await db.prepare(`
        SELECT claim_token FROM cleanup_claims
        WHERE image_key = ? AND claim_token = ? AND lease_expires_at >= datetime('now')
      `).bind(image_key, claimToken).first();

      if (!currentClaim) {
        // Another worker owns this claim, or it is in deleting/failed/tombstone; skip so Pass 2 handles it!
        // Do NOT add to processedKeys, so Pass 2 is free to retry/recover it
        continue;
      }

      processedKeys.add(image_key);

      // Atomic transition to 'deleting' state immediately before R2 deletion:
      // Persistently marks the upload as deleting in D1 so finalization is permanently forbidden,
      // even if the subsequent R2 DELETE request is delayed, times out, or Worker A's lease expires.
      const deletingResult = await db.prepare(`
        UPDATE cleanup_claims
        SET status = 'deleting',
            lease_expires_at = datetime('now', '+5 minutes')
        WHERE image_key = ? AND claim_token = ? AND lease_expires_at >= datetime('now')
      `).bind(image_key, claimToken).run();

      const deletingChanges = deletingResult?.meta?.changes ?? deletingResult?.changes;
      if (deletingChanges !== 1) {
        // Stale lease: lost, expired or stolen before deletion could be initiated; abort!
        continue;
      }

      // Re-check before deletion: Has image been finalized in parallel?
      const inUseCheck = await db.prepare('SELECT 1 FROM product_images WHERE image_key = ?').bind(image_key).first();
      if (inUseCheck) {
        // Finalized in parallel; do NOT delete from R2!
        await db.batch([
          db.prepare('DELETE FROM pending_uploads WHERE image_key = ?').bind(image_key),
          db.prepare('DELETE FROM cleanup_claims WHERE image_key = ? AND claim_token = ?').bind(image_key, claimToken)
        ]);
        cleanedCount++;
        continue;
      }

      try {
        // Delete from R2 object storage (may take time, timeout, or succeed)
        await deleteR2Object(context.env, image_key);

        // Deletion confirmed on R2: cleanly remove pending upload and permanently tombstone claim
        await db.batch([
          db.prepare('DELETE FROM pending_uploads WHERE image_key = ?').bind(image_key),
          db.prepare(`
            UPDATE cleanup_claims
            SET status = 'tombstone',
                claim_token = 'tombstone',
                lease_expires_at = '9999-12-31 23:59:59'
            WHERE image_key = ? AND claim_token = ?
          `).bind(image_key, claimToken)
        ]);
        cleanedCount++;
      } catch (err) {
        errorCount++;
        console.error('[CLEANUP_ORPHAN_ERROR]', { image_key, error: err.message });
        // R2 deletion failed or timed out: mark status as failed so cleanup can safely retry later
        await db.prepare("UPDATE cleanup_claims SET status = 'failed' WHERE image_key = ? AND claim_token = ?").bind(image_key, claimToken).run();
      }
    }

    // 2. Scan failed or expired cleanup claims
    const expiredClaimsResult = await db.prepare(`
      SELECT image_key, claim_token, lease_expires_at, status
      FROM cleanup_claims
      WHERE (lease_expires_at < datetime('now') OR status = 'failed')
        AND status != 'tombstone'
      LIMIT ?
    `).bind(maxItems).all();

    const expiredClaims = expiredClaimsResult.results || [];

    for (const claim of expiredClaims) {
      const { image_key } = claim;
      if (processedKeys.has(image_key)) continue;

      if (dryRun) {
        cleanedCount++;
        continue;
      }

      // Reclaim lease atomically: transitions directly to 'deleting'
      // Preserves deletion protection throughout the entire retry lifecycle:
      // failed -> deleting, deleting (expired) -> deleting, claimed (expired) -> deleting
      // NEVER transitions to 'claimed'!
      const workerToken = `cleanup_${crypto.randomUUID()}`;
      const updateResult = await db.prepare(`
        UPDATE cleanup_claims
        SET claim_token = ?,
            lease_expires_at = datetime('now', '+5 minutes'),
            status = 'deleting'
        WHERE image_key = ? 
          AND (
            status = 'failed'
            OR (status = 'deleting' AND lease_expires_at < datetime('now'))
            OR (status = 'claimed' AND lease_expires_at < datetime('now'))
          )
          AND status != 'tombstone'
      `).bind(workerToken, image_key).run();

      const changes = updateResult?.meta?.changes ?? updateResult?.changes;
      if (changes !== 1) continue;

      // Verify not in active use AFTER acquiring exclusive lease
      const inUse = await db.prepare('SELECT 1 FROM product_images WHERE image_key = ?').bind(image_key).first();
      if (inUse) {
        await db.prepare('DELETE FROM cleanup_claims WHERE image_key = ? AND claim_token = ?').bind(image_key, workerToken).run();
        cleanedCount++;
        continue;
      }

      try {
        await deleteR2Object(context.env, image_key);
        await db.batch([
          db.prepare('DELETE FROM pending_uploads WHERE image_key = ?').bind(image_key),
          db.prepare(`
            UPDATE cleanup_claims
            SET status = 'tombstone',
                claim_token = 'tombstone',
                lease_expires_at = '9999-12-31 23:59:59'
            WHERE image_key = ? AND claim_token = ?
          `).bind(image_key, workerToken)
        ]);
        cleanedCount++;
      } catch (err) {
        errorCount++;
        console.error('[CLEANUP_CLAIM_RETRY_ERROR]', { image_key, error: err.message });
        await db.prepare("UPDATE cleanup_claims SET status = 'failed' WHERE image_key = ? AND claim_token = ?").bind(image_key, workerToken).run();
      }
    }

    return jsonResponse({
      success: true,
      dry_run: dryRun,
      scanned_pending: expiredPending.length,
      scanned_claims: expiredClaims.length,
      cleaned_count: cleanedCount,
      error_count: errorCount
    }, 200, noCacheHeaders());
  } catch (err) {
    return handleDbError(err, 'Failed to execute cleanup.');
  }
}
