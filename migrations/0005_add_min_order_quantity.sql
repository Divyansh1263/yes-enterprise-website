-- Migration 0005: Add Minimum Order Quantity (MOQ) to products
-- Optional integer column representing the minimum number of units required per order.
ALTER TABLE products ADD COLUMN min_order_quantity INTEGER DEFAULT NULL;
