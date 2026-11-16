import fs from 'fs';
import path from 'path';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 12.1 SEO & Admin Security Verification');
console.log('=================================================================\n');

// 1. Robots.txt Inspection
console.log('--- 1. Robots.txt Validation ---');
const robotsPath = path.resolve('public/robots.txt');
assert(fs.existsSync(robotsPath), 'public/robots.txt exists');
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(robotsContent.includes('User-agent: *'), 'robots.txt specifies User-agent: *');
assert(robotsContent.includes('Disallow: /admin'), 'robots.txt disallows /admin');
assert(robotsContent.includes('Disallow: /api/admin/'), 'robots.txt disallows /api/admin/');
assert(robotsContent.includes('Sitemap: https://yesenterprises.net.in/sitemap.xml'), 'robots.txt declares correct Sitemap URL');

// 2. Sitemap.xml Inspection
console.log('\n--- 2. Sitemap.xml Validation ---');
const sitemapPath = path.resolve('public/sitemap.xml');
assert(fs.existsSync(sitemapPath), 'public/sitemap.xml exists');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
assert(sitemapContent.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'sitemap.xml starts with XML declaration');
assert(sitemapContent.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'sitemap.xml declares xhtml namespace for hreflang');

const urls = [...sitemapContent.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert(urls.length === 28, `Sitemap contains exactly 28 URLs (found: ${urls.length})`);

// Ensure no admin or draft URLs are in sitemap
assert(!sitemapContent.includes('/admin'), 'sitemap.xml does NOT include /admin URLs');
assert(!sitemapContent.includes('/api/'), 'sitemap.xml does NOT include /api/ endpoints');
assert(!sitemapContent.includes('prod-03'), 'sitemap.xml does NOT include legacy draft products (prod-03)');
assert(!sitemapContent.includes('prod-04'), 'sitemap.xml does NOT include legacy draft products (prod-04)');

// Verify core pages
const corePages = [
  'https://yesenterprises.net.in/',
  'https://yesenterprises.net.in/hi',
  'https://yesenterprises.net.in/products',
  'https://yesenterprises.net.in/hi/products',
  'https://yesenterprises.net.in/about',
  'https://yesenterprises.net.in/hi/about',
  'https://yesenterprises.net.in/contact',
  'https://yesenterprises.net.in/hi/contact'
];
corePages.forEach(p => {
  assert(urls.includes(p), `Sitemap includes core page: ${p}`);
});

// Verify 10 active products in both languages
const activeProductSlugs = [
  'glass-feeding-bottle-250ml-blue',
  'glass-feeding-bottle-60ml-pink',
  'silicone-sleeve-feeding-bottle-250ml',
  'silicone-sleeve-feeding-bottle-120ml',
  'stainless-steel-feeding-bottle-ss304',
  'stainless-steel-tiffin-box-set',
  'stainless-steel-vacuum-sipper',
  'ye-stainless-steel-feeding-bottle-handles-250ml',
  'ye-glass-sipper-handle-250ml',
  'ye-premium-stainless-steel-feeding-bottle-200ml'
];

activeProductSlugs.forEach(slug => {
  const enUrl = `https://yesenterprises.net.in/products/${slug}`;
  const hiUrl = `https://yesenterprises.net.in/hi/products/${slug}`;
  assert(urls.includes(enUrl), `Sitemap includes EN product: ${slug}`);
  assert(urls.includes(hiUrl), `Sitemap includes HI product: ${slug}`);
});

// 3. Document Head & Schema Markup Inspection
console.log('\n--- 3. Static Document Head & Structured Data Validation ---');
const indexPath = path.resolve('index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
assert(indexHtml.includes('<link rel="canonical" href="https://yesenterprises.net.in/" />'), 'index.html defines canonical URL');
assert(indexHtml.includes('hreflang="en"'), 'index.html defines hreflang="en"');
assert(indexHtml.includes('hreflang="hi"'), 'index.html defines hreflang="hi"');
assert(indexHtml.includes('hreflang="x-default"'), 'index.html defines hreflang="x-default"');
assert(indexHtml.includes('property="og:image" content="https://yesenterprises.net.in/assets/logo.jpeg"'), 'index.html uses absolute Open Graph image URL');
assert(indexHtml.includes('"@type": "Organization"'), 'index.html includes Organization schema');
assert(indexHtml.includes('"@type": "WebSite"'), 'index.html includes WebSite schema');
assert(indexHtml.includes('Feeding Bottles, Water Bottles &amp; Stainless Steel Tiffins') || indexHtml.includes('Feeding Bottles, Water Bottles & Stainless Steel Tiffins'), 'index.html preserves exact verified homepage headline');

// 4. Backend Authentication Verification via functions/_shared/auth.js
console.log('\n--- 4. Backend Authentication Cryptographic Verification ---');
const { validateAdminSession, verifyAccessJwt } = await import('../functions/_shared/auth.js');

// Test 4a: Missing credentials fail closed with 401
const mockContextNoAuth = {
  request: new Request('http://localhost:8788/api/admin/products', { method: 'GET' }),
  env: {
    ENVIRONMENT: 'production',
    CF_ACCESS_TEAM_NAME: 'gentle-queen-e6c4',
    CF_ACCESS_AUD: '3d49a4779f8f6b512fdf742734c498a02188e4ff50e4fbeb2346dd4172700db0',
    ADMIN_EMAILS: 'divyanshtyagi1263@gmail.com,uvaisalikhan0143@gmail.com'
  }
};
const resultNoAuth = await validateAdminSession(mockContextNoAuth);
assert(!resultNoAuth.ok && resultNoAuth.status === 401, 'Backend rejects unauthenticated request with HTTP 401');

// Test 4b: Malformed / Invalid JWT fails with 401
const mockContextInvalidJwt = {
  request: new Request('http://localhost:8788/api/admin/products', {
    method: 'GET',
    headers: { 'cf-access-jwt-assertion': 'invalid.malformed.jwt' }
  }),
  env: {
    ENVIRONMENT: 'production',
    CF_ACCESS_TEAM_NAME: 'gentle-queen-e6c4',
    CF_ACCESS_AUD: '3d49a4779f8f6b512fdf742734c498a02188e4ff50e4fbeb2346dd4172700db0',
    ADMIN_EMAILS: 'divyanshtyagi1263@gmail.com,uvaisalikhan0143@gmail.com'
  }
};
const resultInvalidJwt = await validateAdminSession(mockContextInvalidJwt);
assert(!resultInvalidJwt.ok && resultInvalidJwt.status === 401, 'Backend rejects invalid / forged JWT with HTTP 401');

// Test 4c: Missing environment configuration fails closed
const mockContextNoConfig = {
  request: new Request('http://localhost:8788/api/admin/products', {
    method: 'GET',
    headers: { 'cf-access-jwt-assertion': 'any.token.here' }
  }),
  env: {
    ENVIRONMENT: 'production'
    // Missing CF_ACCESS_TEAM_NAME and CF_ACCESS_AUD
  }
};
const resultNoConfig = await validateAdminSession(mockContextNoConfig);
assert(!resultNoConfig.ok && resultNoConfig.status === 401, 'Backend fails closed if Cloudflare Access variables are missing');

console.log('\n=================================================================');
console.log('Phase 12.1 SEO & Auth Test Suite: All checks PASSED successfully!');
console.log('=================================================================');
