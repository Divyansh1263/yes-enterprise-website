-- =============================================================================
-- YES ENTERPRISES — D1 Schema Migration 0008
-- Phase 11: Add Dedicated Catalogue Import Snapshots and System Import Ledger
-- =============================================================================

-- 1. Dedicated snapshot table capturing full-row JSON prior to catalogue import
CREATE TABLE IF NOT EXISTS catalogue_import_snapshots (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    snapshot_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    snapshot_type TEXT NOT NULL CHECK(snapshot_type IN ('standalone_update', 'legacy_status', 'family_conversion')),
    original_row_json TEXT NOT NULL,
    original_updated_at DATETIME NOT NULL,
    post_import_updated_at DATETIME DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'restored', 'superseded')),
    UNIQUE(batch_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_import_snapshots_batch
    ON catalogue_import_snapshots(batch_id, status);

CREATE INDEX IF NOT EXISTS idx_import_snapshots_prod
    ON catalogue_import_snapshots(product_id);

-- 2. System Import Ledger for concurrency locking, execution tracking and auditability
CREATE TABLE IF NOT EXISTS system_import_ledger (
    operation_key TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('in_progress', 'completed', 'failed', 'rolled_back')),
    initiated_by TEXT NOT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    metadata_json TEXT DEFAULT NULL
);
