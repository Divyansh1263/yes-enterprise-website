/**
 * YES ENTERPRISES — Phase 5.1 Verification Test Suite
 * Tests Cloudflare Access JWT validation, local dev bypass security,
 * CSRF origin validation, and R2 image access control (/uploads/[[key]]).
 */

import crypto from 'node:crypto';
import { validateAdminSession, isLocalDevBypassPermitted } from '../functions/_shared/auth.js';
import { onRequest as imageDeliveryHandler } from '../functions/uploads/[[key]].js';

console.log('=================================================================');
console.log('YES ENTERPRISES — Phase 5.1 Verification Test Suite');
console.log('Testing Cloudflare Access JWT, Multi-Admin, CSRF & Image Delivery');
console.log('=================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// ── 1. CRYPTOGRAPHIC TEST KEYPAIR & HELPERS ─────────────────────────────────
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const testJwk = publicKey.export({ format: 'jwk' });
testJwk.kid = 'cf-access-test-key-01';
testJwk.alg = 'RS256';
testJwk.use = 'sig';

// Secondary keypair to simulate signature with wrong key
const otherKeyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

function base64UrlEncode(data) {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createSignedJwt(payloadOverrides = {}, headerOverrides = {}, signingKey = privateKey) {
  const header = {
    alg: 'RS256',
    kid: testJwk.kid,
    typ: 'JWT',
    ...headerOverrides
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'https://yes-enterprises-test.cloudflareaccess.com',
    aud: 'test-aud-tag-phase5',
    sub: 'user-uuid-1234',
    email: 'admin@yesenterprises.net.in',
    name: 'Primary Admin',
    iat: nowSec,
    nbf: nowSec - 10,
    exp: nowSec + 3600,
    ...payloadOverrides
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  if (header.alg === 'none') {
    return `${data}.`;
  }

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  const signature = base64UrlEncode(signer.sign(signingKey));

  return `${data}.${signature}`;
}

const mockJwksFetch = async (url) => {
  if (url.includes('/cdn-cgi/access/certs')) {
    return new Response(JSON.stringify({ keys: [testJwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response('Not Found', { status: 404 });
};

const PROD_ENV = {
  ENVIRONMENT: 'production',
  CF_ACCESS_TEAM_NAME: 'yes-enterprises-test',
  CF_ACCESS_AUD: 'test-aud-tag-phase5',
  ADMIN_EMAILS: 'admin@yesenterprises.net.in,director@yesenterprises.net.in,manager@yesenterprises.net.in',
  ENABLE_DEV_ADMIN_BYPASS: 'false'
};

// ── 2. LOCAL DEVELOPMENT AUTHENTICATION FLOW ────────────────────────────────
console.log('--- 1. Local Development Authentication Flow ---');
{
  const req = new Request('http://localhost:8788/api/admin/session', {
    headers: {
      'host': 'localhost:8788',
      'x-dev-admin-bypass': 'true'
    }
  });
  const env = {
    ENVIRONMENT: 'development',
    ENABLE_DEV_ADMIN_BYPASS: 'true',
    ADMIN_EMAILS: 'admin@yesenterprises.net.in,owner@yesenterprises.net.in'
  };

  const isPermitted = isLocalDevBypassPermitted(req, env);
  assert(isPermitted === true, 'isLocalDevBypassPermitted is true on localhost with dev bypass header');

  const authResult = await validateAdminSession({ request: req, env });
  assert(authResult.ok === true, 'validateAdminSession succeeds with dev bypass');
  assert(authResult.user?.email === 'admin@yesenterprises.net.in', 'validateAdminSession user email matches fallback admin@yesenterprises.net.in');
  assert(authResult.user?.auth_type === 'development_bypass', 'auth_type is development_bypass');
}

// ── 3. PRODUCTION SECURITY: BYPASS STRICTLY BLOCKED ─────────────────────────
console.log('\n--- 2. Production Security: Bypass Strictly Blocked ---');
{
  const req = new Request('http://localhost:8788/api/admin/session', {
    headers: {
      'host': 'localhost:8788',
      'x-dev-admin-bypass': 'true'
    }
  });
  const env = {
    ENVIRONMENT: 'production',
    ENABLE_DEV_ADMIN_BYPASS: 'true',
    ADMIN_EMAILS: 'admin@yesenterprises.net.in'
  };

  const isPermitted = isLocalDevBypassPermitted(req, env);
  assert(isPermitted === false, 'isLocalDevBypassPermitted strictly false when ENVIRONMENT is production');

  const authResult = await validateAdminSession({ request: req, env });
  assert(authResult.ok === false, 'validateAdminSession fails in production when attempting dev bypass');
  assert(authResult.status === 401, 'Returns HTTP 401 UNAUTHENTICATED');
}

{
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: {
      'host': 'yesenterprises.net.in',
      'x-dev-admin-bypass': 'true'
    }
  });
  const env = {
    ENVIRONMENT: 'development',
    ENABLE_DEV_ADMIN_BYPASS: 'true',
    ADMIN_EMAILS: 'admin@yesenterprises.net.in'
  };

  const isPermitted = isLocalDevBypassPermitted(req, env);
  assert(isPermitted === false, 'isLocalDevBypassPermitted strictly false on non-localhost remote host');
}

// ── 4. CSRF ALLOWED AND REJECTED ORIGINS (PROD & DEV MATRICES) ─────────────
console.log('\n--- 3. CSRF Allowed and Rejected Origins Verification ---');

const DEV_ENV = {
  ENVIRONMENT: 'development',
  CF_ACCESS_TEAM_NAME: 'yes-enterprises-test',
  CF_ACCESS_AUD: 'test-aud-tag-phase5',
  ADMIN_EMAILS: 'admin@yesenterprises.net.in',
  ENABLE_DEV_ADMIN_BYPASS: 'false'
};

// 3a. Production Environment Matrix
console.log('--- 3a. Production CSRF Matrix (Exact origin & port security, localhost rejected in prod) ---');
const prodAllowedOrigins = [
  'https://yesenterprises.net.in',
  'https://yesenterprises.net.in:443', // normalized as same default port origin
  'https://www.yesenterprises.net.in',
  'https://yes-enterprise-website.pages.dev'
];

for (const origin of prodAllowedOrigins) {
  const req = new Request('https://yesenterprises.net.in/api/admin/products', {
    method: 'POST',
    headers: {
      'host': 'yesenterprises.net.in',
      'cookie': 'CF_Authorization=dummy.token.here',
      'origin': origin
    }
  });

  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.code !== 'CSRF_REJECTED', `[PROD] Origin allowed: ${origin}`);
}

const prodRejectedOrigins = [
  'https://yesenterprises.net.in:8443', // non-default port on production domain strictly rejected
  'https://www.yesenterprises.net.in:8443', // non-default port on www strictly rejected
  'https://yes-enterprise-website.pages.dev:8443', // non-default port on pages.dev strictly rejected
  'http://yesenterprises.net.in:8080', // non-default port and HTTP strictly rejected
  'http://localhost:5173', // localhost HTTP rejected in prod
  'http://127.0.0.1:8788', // 127.0.0.1 HTTP rejected in prod
  'https://localhost',     // localhost HTTPS rejected in prod
  'https://127.0.0.1',     // 127.0.0.1 HTTPS rejected in prod
  'https://yesenterprises.in', // legacy unowned domain rejected
  'https://yes-enterprises.pages.dev', // obsolete hostname rejected
  'https://preview-123.yes-enterprises.pages.dev', // obsolete preview rejected
  'https://preview-123.yes-enterprise-website.pages.dev', // arbitrary subdomains rejected
  'https://attacker.yesenterprises.net.in', // arbitrary subdomains rejected
  'http://yesenterprises.net.in', // HTTP origin in prod rejected
  'http://yes-enterprise-website.pages.dev', // HTTP origin in prod rejected
  'https://evil-attacker.com',
  'https://notyesenterprises.net.in',
  'https://evil-yes-enterprises.pages.dev',
  'https://yesenterprises.net.in.attacker.com',
  'invalid-url-string'
];

for (const origin of prodRejectedOrigins) {
  const req = new Request('https://yesenterprises.net.in/api/admin/products', {
    method: 'POST',
    headers: {
      'host': 'yesenterprises.net.in',
      'cookie': 'CF_Authorization=dummy.token.here',
      'origin': origin
    }
  });

  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false && result.code === 'CSRF_REJECTED', `[PROD] Origin rejected with CSRF_REJECTED: ${origin}`);
}

// 3b. Development Environment Matrix
console.log('--- 3b. Development CSRF Matrix (Localhost accepted in dev) ---');
const devAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:8788',
  'https://localhost',
  'https://127.0.0.1',
  'https://yesenterprises.net.in',
  'https://www.yesenterprises.net.in',
  'https://yes-enterprise-website.pages.dev'
];

for (const origin of devAllowedOrigins) {
  const req = new Request('http://localhost:8788/api/admin/products', {
    method: 'POST',
    headers: {
      'host': 'localhost:8788',
      'cookie': 'CF_Authorization=dummy.token.here',
      'origin': origin
    }
  });

  const result = await validateAdminSession({ request: req, env: DEV_ENV }, mockJwksFetch);
  assert(result.code !== 'CSRF_REJECTED', `[DEV] Origin allowed: ${origin}`);
}

const devRejectedOrigins = [
  'https://evil-attacker.com',
  'https://yes-enterprises.pages.dev',
  'http://yesenterprises.net.in',
  'invalid-url-string'
];

for (const origin of devRejectedOrigins) {
  const req = new Request('http://localhost:8788/api/admin/products', {
    method: 'POST',
    headers: {
      'host': 'localhost:8788',
      'cookie': 'CF_Authorization=dummy.token.here',
      'origin': origin
    }
  });

  const result = await validateAdminSession({ request: req, env: DEV_ENV }, mockJwksFetch);
  assert(result.ok === false && result.code === 'CSRF_REJECTED', `[DEV] Origin rejected with CSRF_REJECTED: ${origin}`);
}

// Missing Origin header on state-changing cookie-authenticated request must be rejected
{
  const req = new Request('http://localhost:8788/api/admin/products', {
    method: 'POST',
    headers: {
      'host': 'localhost:8788',
      'cookie': 'CF_Authorization=dummy.token.here'
      // No Origin header provided
    }
  });

  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false && result.code === 'CSRF_REJECTED', 'Missing Origin header on cookie write request rejected with CSRF_REJECTED');
}

// ── 5. MISSING JWT VERIFICATION ─────────────────────────────────────────────
console.log('\n--- 4. Missing JWT Verification ---');
{
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: {
      'host': 'yesenterprises.net.in'
    }
  });

  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Missing JWT is rejected');
  assert(result.status === 401, 'Returns HTTP 401 status for missing JWT');
  assert(result.code === 'UNAUTHENTICATED', 'Returns code UNAUTHENTICATED');
}

// ── 6. FORGED / INVALID JWT VERIFICATION ────────────────────────────────────
console.log('\n--- 5. Forged & Invalid JWT Verification ---');

// 5a. Unsupported Algorithm (alg: none)
{
  const noneToken = createSignedJwt({}, { alg: 'none' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': noneToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Token with alg: none is rejected');
  assert(result.status === 401 && result.code === 'INVALID_ALGORITHM', 'Returns 401 INVALID_ALGORITHM for alg: none');
}

// 5b. Unsupported Algorithm (alg: HS256)
{
  const hsToken = `${base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: testJwk.kid }))}.${base64UrlEncode(JSON.stringify({ iss: 'https://yes-enterprises-test.cloudflareaccess.com', aud: 'test-aud-tag-phase5', email: 'admin@yesenterprises.net.in', exp: Math.floor(Date.now() / 1000) + 3600 }))}.fakesig`;
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': hsToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Token with alg: HS256 is rejected');
  assert(result.status === 401 && result.code === 'INVALID_ALGORITHM', 'Returns 401 INVALID_ALGORITHM for symmetric alg');
}

// 5c. Expired Token
{
  const expiredToken = createSignedJwt({ exp: Math.floor(Date.now() / 1000) - 120 });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': expiredToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Expired token is rejected');
  assert(result.status === 401 && result.code === 'EXPIRED_TOKEN', 'Returns 401 EXPIRED_TOKEN');
}

// 5d. Not Yet Valid Token (nbf in future)
{
  const futureToken = createSignedJwt({ nbf: Math.floor(Date.now() / 1000) + 600 });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': futureToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Future nbf token is rejected');
  assert(result.status === 401 && result.code === 'INVALID_TOKEN', 'Returns 401 INVALID_TOKEN for future nbf');
}

// 5e. Wrong Issuer
{
  const wrongIssToken = createSignedJwt({ iss: 'https://attacker-team.cloudflareaccess.com' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': wrongIssToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Wrong issuer token is rejected');
  assert(result.status === 401 && result.code === 'INVALID_ISSUER', 'Returns 401 INVALID_ISSUER');
}

// 5f. Wrong Audience
{
  const wrongAudToken = createSignedJwt({ aud: 'wrong-audience-tag' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': wrongAudToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Wrong audience token is rejected');
  assert(result.status === 401 && result.code === 'INVALID_AUDIENCE', 'Returns 401 INVALID_AUDIENCE');
}

// 5g. Tampered Signature
{
  const validToken = createSignedJwt();
  const parts = validToken.split('.');
  // Modify one character of the signature
  const tamperedSig = parts[2].slice(0, -4) + 'AAAA';
  const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': tamperedToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Tampered signature token is rejected');
  assert(result.status === 401 && result.code === 'INVALID_SIGNATURE', 'Returns 401 INVALID_SIGNATURE');
}

// 5h. Signed by Untrusted Key
{
  const untrustedKeyToken = createSignedJwt({}, {}, otherKeyPair.privateKey);
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': untrustedKeyToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Token signed by untrusted key is rejected');
  assert(result.status === 401 && result.code === 'INVALID_SIGNATURE', 'Returns 401 INVALID_SIGNATURE for untrusted key');
}

// 5i. Unknown Key ID (kid)
{
  const unknownKidToken = createSignedJwt({}, { kid: 'non-existent-kid' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': unknownKidToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Token with unknown kid is rejected');
  assert(result.status === 401 && result.code === 'KEY_NOT_FOUND', 'Returns 401 KEY_NOT_FOUND');
}

// ── 7. UNAUTHORIZED ADMIN EMAIL & MULTI-ADMIN ALLOWLIST ─────────────────────
console.log('\n--- 6. Admin Email Authorization & Multi-Admin Allowlist ---');

// 6a. Valid JWT signature but unauthorized email
{
  const unauthorizedToken = createSignedJwt({ email: 'intruder@unknown.org' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: { 'CF_Authorization': unauthorizedToken }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === false, 'Valid JWT with unlisted email is rejected');
  assert(result.status === 403, 'Returns HTTP 403 FORBIDDEN');
  assert(result.code === 'FORBIDDEN', 'Returns code FORBIDDEN');
}

// 6b. Multi-admin support: each admin in allowlist succeeds independently
{
  const allowedAdmins = [
    'admin@yesenterprises.net.in',
    'director@yesenterprises.net.in',
    'manager@yesenterprises.net.in'
  ];

  for (const email of allowedAdmins) {
    const token = createSignedJwt({ email });
    const req = new Request('https://yesenterprises.net.in/api/admin/session', {
      headers: { 'CF_Authorization': token }
    });
    const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
    assert(result.ok === true, `Admin allowlist permits: ${email}`);
    assert(result.user?.email === email, `User email correctly parsed as ${email}`);
    assert(result.user?.auth_type === 'cloudflare_access', 'auth_type is cloudflare_access');
  }
}

// ── 8. VALID ADMIN JWT TRANSMISSION FORMATS ─────────────────────────────────
console.log('\n--- 7. Valid Admin JWT Transmission Formats ---');

// 7a. Via cf-access-jwt-assertion header
{
  const token = createSignedJwt({ email: 'admin@yesenterprises.net.in' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: {
      'cf-access-jwt-assertion': token
    }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === true, 'Accepts valid JWT via cf-access-jwt-assertion header');
  assert(result.user?.email === 'admin@yesenterprises.net.in', 'Correctly identified admin from header assertion');
}

// 7b. Via CF_Authorization header
{
  const token = createSignedJwt({ email: 'director@yesenterprises.net.in' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: {
      'CF_Authorization': token
    }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === true, 'Accepts valid JWT via CF_Authorization header');
  assert(result.user?.email === 'director@yesenterprises.net.in', 'Correctly identified director from header');
}

// 7c. Via CF_Authorization cookie
{
  const token = createSignedJwt({ email: 'manager@yesenterprises.net.in' });
  const req = new Request('https://yesenterprises.net.in/api/admin/session', {
    headers: {
      'cookie': `other_cookie=123; CF_Authorization=${token}; session=xyz`
    }
  });
  const result = await validateAdminSession({ request: req, env: PROD_ENV }, mockJwksFetch);
  assert(result.ok === true, 'Accepts valid JWT via CF_Authorization cookie');
  assert(result.user?.email === 'manager@yesenterprises.net.in', 'Correctly identified manager from cookie');
}

// ── 9. UPLOADS ROUTE IMAGE ACCESS CONTROL ───────────────────────────────────
console.log('\n--- 8. Uploads Route Image Access Control (/uploads/[[key]]) ---');

const dummyImageBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]); // JPEG magic header

const mockR2Bucket = {
  async get(key) {
    if (key === 'products/active-product.jpg' || key === 'products/draft-product.jpg' || key === 'products/archived-product.jpg') {
      return {
        size: dummyImageBytes.length,
        httpEtag: '"sample-etag-hash"',
        httpMetadata: { contentType: 'image/jpeg' },
        body: dummyImageBytes,
        bytes: dummyImageBytes,
        async arrayBuffer() {
          return dummyImageBytes.buffer;
        }
      };
    }
    return null;
  }
};

const mockImageDb = {
  prepare(sql) {
    let boundKey = null;
    return {
      bind(...params) {
        boundKey = params[0];
        return this;
      },
      async first() {
        if (boundKey === 'products/active-product.jpg') {
          return {
            id: 'img-active-01',
            product_id: 'prod-01',
            variant_id: null,
            image_key: 'products/active-product.jpg',
            mime_type: 'image/jpeg',
            file_size_bytes: dummyImageBytes.length,
            product_status: 'active',
            variant_status: null
          };
        }
        if (boundKey === 'products/draft-product.jpg') {
          return {
            id: 'img-draft-01',
            product_id: 'prod-02',
            variant_id: null,
            image_key: 'products/draft-product.jpg',
            mime_type: 'image/jpeg',
            file_size_bytes: dummyImageBytes.length,
            product_status: 'draft',
            variant_status: null
          };
        }
        if (boundKey === 'products/archived-product.jpg') {
          return {
            id: 'img-archived-01',
            product_id: 'prod-03',
            variant_id: null,
            image_key: 'products/archived-product.jpg',
            mime_type: 'image/jpeg',
            file_size_bytes: dummyImageBytes.length,
            product_status: 'archived',
            variant_status: null
          };
        }
        return null;
      }
    };
  }
};

const IMAGE_ENV = {
  ...PROD_ENV,
  DB: mockImageDb,
  PRODUCT_BUCKET: mockR2Bucket,
  FETCH_FN: mockJwksFetch
};

// 8a. Anonymous request for active product image -> 200 OK with public immutable cache
{
  const req = new Request('https://yesenterprises.net.in/uploads/products/active-product.jpg');
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'active-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 200, 'Anonymous request for active image returns HTTP 200');
  assert(res.headers.get('content-type') === 'image/jpeg', 'Active image returns Content-Type: image/jpeg');
  assert(res.headers.get('cache-control')?.includes('public'), 'Active image includes public Cache-Control');
}

// 8b. Anonymous request for draft product image -> 404 Not Found (does not leak draft existence)
{
  const req = new Request('https://yesenterprises.net.in/uploads/products/draft-product.jpg');
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'draft-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 404, 'Anonymous request for draft image returns HTTP 404 Not Found');
  assert(res.headers.get('cache-control')?.includes('no-store'), 'Draft image 404 includes no-store');
}

// 8c. Authenticated admin request for draft image via cookie -> 200 OK with private cache
{
  const adminToken = createSignedJwt({ email: 'admin@yesenterprises.net.in' });
  const req = new Request('https://yesenterprises.net.in/uploads/products/draft-product.jpg', {
    headers: {
      'cookie': `CF_Authorization=${adminToken}`
    }
  });
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'draft-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 200, 'Admin request for draft image via CF_Authorization cookie returns HTTP 200');
  assert(res.headers.get('cache-control')?.includes('private'), 'Admin draft image includes private Cache-Control');
  assert(res.headers.get('cache-control')?.includes('no-store'), 'Admin draft image includes no-store');
}

// 8d. Authenticated admin request for draft image via cf-access-jwt-assertion header -> 200 OK
{
  const adminToken = createSignedJwt({ email: 'director@yesenterprises.net.in' });
  const req = new Request('https://yesenterprises.net.in/uploads/products/draft-product.jpg', {
    headers: {
      'cf-access-jwt-assertion': adminToken
    }
  });
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'draft-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 200, 'Admin request for draft image via cf-access-jwt-assertion header returns HTTP 200');
  assert(res.headers.get('cache-control')?.includes('private'), 'Admin draft image includes private Cache-Control');
}

// 8e. Authenticated admin request for draft image via CF_Authorization header -> 200 OK
{
  const adminToken = createSignedJwt({ email: 'manager@yesenterprises.net.in' });
  const req = new Request('https://yesenterprises.net.in/uploads/products/draft-product.jpg', {
    headers: {
      'CF_Authorization': adminToken
    }
  });
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'draft-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 200, 'Admin request for draft image via CF_Authorization header returns HTTP 200');
}

// 8f. Request with valid JWT but unauthorized email for draft image -> 404 Not Found
{
  const unauthorizedToken = createSignedJwt({ email: 'unauthorized-user@external.com' });
  const req = new Request('https://yesenterprises.net.in/uploads/products/draft-product.jpg', {
    headers: {
      'CF_Authorization': unauthorizedToken
    }
  });
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'draft-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 404, 'Unauthorized email request for draft image returns HTTP 404 Not Found');
}

// 8g. Anonymous request for archived product image -> 404 Not Found (does not leak archived existence)
{
  const req = new Request('https://yesenterprises.net.in/uploads/products/archived-product.jpg');
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'archived-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 404, 'Anonymous request for archived image returns HTTP 404 Not Found');
}

// 8h. Authenticated admin request for archived image via cookie -> 200 OK with private cache
{
  const adminToken = createSignedJwt({ email: 'admin@yesenterprises.net.in' });
  const req = new Request('https://yesenterprises.net.in/uploads/products/archived-product.jpg', {
    headers: {
      'cookie': `CF_Authorization=${adminToken}`
    }
  });
  const res = await imageDeliveryHandler({
    request: req,
    params: { key: ['products', 'archived-product.jpg'] },
    env: IMAGE_ENV
  });
  assert(res.status === 200, 'Admin request for archived image via cookie returns HTTP 200');
  assert(res.headers.get('cache-control')?.includes('private'), 'Admin archived image includes private Cache-Control');
}

console.log(`\n=================================================================`);
console.log(`Phase 5.1 Verification Summary: ${passed} Passed, ${failed} Failed`);
console.log(`=================================================================`);

if (failed > 0) {
  process.exit(1);
}
