-- =============================================================================
-- YES ENTERPRISES — D1 Schema Migration 0004
-- Add optional expected_price_per_100_paise column to products table
-- Supports optional wholesale expected price per 100 pieces quotation model.
-- =============================================================================

ALTER TABLE products ADD COLUMN expected_price_per_100_paise INTEGER DEFAULT NULL;
