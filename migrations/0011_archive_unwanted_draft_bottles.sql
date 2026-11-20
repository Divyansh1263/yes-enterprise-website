-- =============================================================================
-- YES ENTERPRISES — D1 Schema & Data Migration 0011
-- Cleanly Archive Unwanted Draft Feeding Bottles
--
-- Targeted Products (Exact 3 IDs only):
-- 1. prod-06 — Plastic Feeding Bottle — 120 ml (Red)
-- 2. prod-09 — Plastic Feeding Bottle — 250 ml (Red)
-- 3. prod-11 — Glass Feeding Bottle — 120 ml (Blue)
-- =============================================================================

UPDATE products
SET status = 'archived',
    updated_at = CURRENT_TIMESTAMP
WHERE id IN ('prod-06', 'prod-09', 'prod-11');
