-- Migration: 0002_r2_deletion_safety.sql
-- Upgrades cleanup_claims status check constraint to support persistent 'deleting' and 'tombstone' states.
-- Guarantees mutual exclusion and prevents finalization while an R2 delete request is in flight.

CREATE TABLE cleanup_claims_v2 (
    image_key TEXT PRIMARY KEY,
    claim_token TEXT NOT NULL,
    lease_expires_at DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'claimed' CHECK(status IN ('claimed', 'deleting', 'failed', 'tombstone'))
);

INSERT INTO cleanup_claims_v2 (image_key, claim_token, lease_expires_at, status)
SELECT image_key, claim_token, lease_expires_at, status FROM cleanup_claims;

DROP TABLE cleanup_claims;

ALTER TABLE cleanup_claims_v2 RENAME TO cleanup_claims;

