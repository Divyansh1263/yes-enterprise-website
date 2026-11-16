/**
 * Uploads all 13 approved Stage 4 product photographs to Cloudflare R2 bucket
 * yes-enterprises-public-images using wrangler r2 object put.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const bucket = 'yes-enterprises-public-images';
const files = [
  'prod-17-handles-250ml-primary.jpeg',
  'prod-17-handles-250ml-brand-stamp.jpeg',
  'prod-17-handles-250ml-scale.jpeg',
  'prod-18-glass-sipper-handle-250ml-primary.jpeg',
  'prod-18-glass-sipper-handle-250ml-box-front.jpeg',
  'prod-18-glass-sipper-handle-250ml-box-side.jpeg',
  'prod-18-glass-sipper-handle-250ml-box-back.jpeg',
  'prod-19-premium-ss-250ml-primary.jpeg',
  'prod-19-premium-ss-200ml-primary.jpeg',
  'prod-19-premium-ss-250ml-box.jpeg',
  'prod-19-premium-ss-200ml-open-box.jpeg',
  'prod-19-premium-ss-200ml-assembled-box.jpeg',
  'prod-19-premium-ss-200ml-box-side.jpeg'
];

console.log(`Starting upload of ${files.length} images to R2 bucket "${bucket}"...`);

let uploaded = 0;
for (const file of files) {
  const localPath = path.join('public/products', file);
  const r2Key = `products/${file}`;
  const cmd = `npx wrangler r2 object put "${bucket}/${r2Key}" --file="${localPath}" --remote --content-type=image/jpeg`;
  console.log(`[${uploaded + 1}/${files.length}] Uploading ${r2Key}...`);
  execSync(cmd, { stdio: 'inherit' });
  uploaded++;
}

console.log(`\n🎉 Successfully uploaded all ${uploaded} images to Cloudflare R2!`);
