import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6a1b3b744fa3757d88c3c37a6e58dbe029fc1f0fedf109567181075521f4e00c.sqlite');

const counts = {
  categories: db.prepare('SELECT count(*) as c FROM categories').get().c,
  products: db.prepare('SELECT count(*) as c FROM products').get().c,
  images: db.prepare('SELECT count(*) as c FROM product_images').get().c,
  variants: db.prepare('SELECT count(*) as c FROM product_variants').get().c
};

console.log('Database Counts:', counts);

const newProds = db.prepare('SELECT id, name, name_hi, category_id, slug, status, is_featured FROM products WHERE id IN (?, ?, ?)').all('prod-17', 'prod-18', 'prod-19');
console.log('New Products:\n', JSON.stringify(newProds, null, 2));

const newImgs = db.prepare('SELECT id, product_id, image_key, is_primary, sort_order FROM product_images WHERE product_id IN (?, ?, ?) ORDER BY product_id, sort_order').all('prod-17', 'prod-18', 'prod-19');
console.log('New Images:\n', JSON.stringify(newImgs, null, 2));
