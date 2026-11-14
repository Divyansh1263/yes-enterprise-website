# YES ENTERPRISES — Phase 5.3.4, 5.3.4.1 & 5.3.4.2 CSRF Allowlist & Port Security Report

**Document:** `docs/PHASE_5_3_4_CSRF_ALLOWLIST_REPORT.md`  
**Phases Covered:** 5.3.4, 5.3.4.1 & 5.3.4.2  
**Last Updated:** 2026-11-14T15:40:55+05:30  
**Project:** YES ENTERPRISES Wholesale Catalogue Website  
**Pages Project:** `yes-enterprise-website`  
**Production Domain:** `yesenterprises.net.in`  
**Actual Pages Hostname:** `yes-enterprise-website.pages.dev`  
**Status:** Completed & Fully Verified Locally (Strictly Read-Only Remote / Local Code Only)  

---

## 1. Evolution of CSRF Origin Protection

### A. Initial Implementation (Prior to Phase 5.3.4)
- **Defect 1:** Mismatched project domain (`yes-enterprises.pages.dev` vs. actual `yes-enterprise-website.pages.dev`).
- **Defect 2:** Suffix matching (`host.endsWith('.yes-enterprises.pages.dev')`) allowed arbitrary subdomains.
- **Defect 3:** Protocol was not strictly verified for remote production hosts.

### B. Phase 5.3.4.1 Implementation
- Replaced obsolete hostname with canonical `yes-enterprise-website.pages.dev`.
- Restricted the localhost exception strictly to development mode (`env.ENVIRONMENT === 'development'`).
- Enforced `isHttps` on remote hostnames.

### C. Security Finding in Phase 5.3.4.2 (Port Bypass Risk)
- **Finding:** Evaluating only `originUrl.hostname` stripped the port number. An attacker or unauthorized service running on an unprivileged/non-default port (e.g. `https://yesenterprises.net.in:8443` or `http://yesenterprises.net.in:8080`) would match the hostname check and bypass origin restrictions.
- **Root Cause:** A complete Web origin comprises `scheme + host + port`. Hostname-only inspection fails to validate the port.

---

## 2. Final Corrected Implementation (`functions/_shared/auth.js`)

In `functions/_shared/auth.js`, exact-origin validation is implemented using normalized `URL.origin` matched against an explicit `Set` of permitted production origins, with a strictly scoped development-only localhost fallback:

```javascript
// Permitted complete production origins (exact scheme + hostname + default port)
const ALLOWED_PRODUCTION_ORIGINS = new Set([
  'https://yesenterprises.net.in',
  'https://www.yesenterprises.net.in',
  'https://yes-enterprise-website.pages.dev'
]);
```

Inside `validateAdminSession()`:

```javascript
    try {
      const originUrl = new URL(origin);
      const isDev = env?.ENVIRONMENT === 'development';
      const isLocal =
        isDev &&
        (originUrl.protocol === 'http:' || originUrl.protocol === 'https:') &&
        (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1');

      const isAllowedOrigin =
        ALLOWED_PRODUCTION_ORIGINS.has(originUrl.origin) || isLocal;

      if (!isAllowedOrigin) {
        return {
          ok: false,
          status: 403,
          code: 'CSRF_REJECTED',
          message: 'Untrusted origin blocked by CSRF protection.'
        };
      }
    } catch {
      return {
        ok: false,
        status: 403,
        code: 'CSRF_REJECTED',
        message: 'Malformed origin header.'
      };
    }
```

---

## 3. Security Rationale & Port Normalization

1. **Complete Origin Matching (`URL.origin`):** `originUrl.origin` serializes the scheme, hostname, and port per WHATWG URL standards.
   - For default ports (`443` for HTTPS, `80` for HTTP), `URL.origin` normalizes and omits the redundant port (e.g. `https://yesenterprises.net.in:443` normalizes to `https://yesenterprises.net.in`).
   - For non-default ports (e.g. `:8443`, `:8080`), `URL.origin` retains the port in the serialized origin string.
2. **Strict Port Security:** Because `ALLOWED_PRODUCTION_ORIGINS` contains only standard HTTPS origins without non-default ports, any request specifying a non-default port (`:8443`, `:8080`, etc.) produces an unrecognized origin string and is strictly rejected with `403 CSRF_REJECTED`.
3. **Environment Detection:** The localhost exception requires `env?.ENVIRONMENT === 'development'`. In production (`ENVIRONMENT === 'production'`), `isDev` and `isLocal` are `false`, preventing localhost or loopback origins from reaching admin mutation APIs.
4. **Arbitrary Subdomain Prevention:** Subdomains (e.g. `https://attacker.yesenterprises.net.in` or `https://preview.yes-enterprise-website.pages.dev`) do not match the exact set members and are blocked.
5. **Fail-Closed Design:** Unparseable URLs, null origins, missing origins, or unexpected inputs throw or fail the set lookup, resulting in an immediate `403 CSRF_REJECTED`.

---

## 4. Comprehensive Production & Development Test Matrix

The test matrix in `scripts/test-phase5-verification.mjs` was executed:

| Origin | Mode | Expected | Result | Security Verification |
|---|---|---|---|---|
| `https://yesenterprises.net.in` | Production | Accept | **PASS** | Exact apex production origin |
| `https://yesenterprises.net.in:443` | Production | Accept | **PASS** | Normalized to canonical origin (`:443` default) |
| `https://yesenterprises.net.in:8443` | Production | Reject | **PASS** | Non-default port strictly rejected |
| `https://www.yesenterprises.net.in` | Production | Accept | **PASS** | Exact www production origin |
| `https://www.yesenterprises.net.in:8443` | Production | Reject | **PASS** | Non-default port on www strictly rejected |
| `https://yes-enterprise-website.pages.dev` | Production | Accept | **PASS** | Exact Pages project origin |
| `https://yes-enterprise-website.pages.dev:8443` | Production | Reject | **PASS** | Non-default port on Pages strictly rejected |
| `http://yesenterprises.net.in:8080` | Production | Reject | **PASS** | Non-default port + HTTP strictly rejected |
| `https://attacker.yesenterprises.net.in` | Production | Reject | **PASS** | Arbitrary subdomain strictly rejected |
| `http://localhost:5173` | Production | Reject | **PASS** | Localhost HTTP rejected in production |
| `http://127.0.0.1:8788` | Production | Reject | **PASS** | Loopback HTTP rejected in production |
| `https://localhost` | Production | Reject | **PASS** | Localhost HTTPS rejected in production |
| `https://127.0.0.1` | Production | Reject | **PASS** | Loopback HTTPS rejected in production |
| `https://evil-attacker.com` | Production | Reject | **PASS** | Untrusted external origin rejected |
| `http://localhost:5173` | Development | Accept | **PASS** | Local Vite dev server origin accepted |
| `http://127.0.0.1:8788` | Development | Accept | **PASS** | Local Wrangler dev server origin accepted |
| `https://localhost` | Development | Accept | **PASS** | Local HTTPS dev server origin accepted |
| `https://127.0.0.1` | Development | Accept | **PASS** | Local loopback HTTPS origin accepted |
| `https://yesenterprises.net.in` | Development | Accept | **PASS** | Production origin accepted in dev |
| `https://evil-attacker.com` | Development | Reject | **PASS** | External attacker origin rejected in dev |
| Missing `Origin` header | Both | Reject | **PASS** | Missing origin on write rejected |

---

## 5. Full Test Suite & Build Verification

| Test Suite / Script | Command | Total Tests | Passed | Failed | Status |
|---|---|---|---|---|---|
| Phase 1: D1 Schema & Constraints | `npm run test:phase1` | 47 | 47 | 0 | **PASS** |
| Phase 2: Handler-Level API Integration | `npm run test:phase2` | 35 | 35 | 0 | **PASS** |
| Phase 2: Real HTTP Runtime (Wrangler Dev) | `npm run test:phase2:http` | 6 | 6 | 0 | **PASS** |
| Phase 3: Admin Write APIs & R2 Pipeline | `npm run test:phase3` | 79 | 79 | 0 | **PASS** |
| Phase 3: Real HTTP Runtime (Wrangler Dev) | `npm run test:phase3:http` | 9 | 9 | 0 | **PASS** |
| Phase 4: Frontend & Workflow Integration | `npm run test:phase4` | 32 | 32 | 0 | **PASS** |
| Phase 5.1: Access JWT & Complete CSRF/Port Matrix | `node scripts/test-phase5-verification.mjs` | 98 | 98 | 0 | **PASS** |
| **Total Automated Tests** | — | **306** | **306** | **0** | **PASS** |
| **Production Vite Build** | `npm run build` | 80 modules | Built in 2.64s | 0 errors | **PASS** |

---

## 6. Git Diff Summary

### `functions/_shared/auth.js`
```diff
diff --git a/functions/_shared/auth.js b/functions/_shared/auth.js
index 7060ffe..a8e3cb2 100644
--- a/functions/_shared/auth.js
+++ b/functions/_shared/auth.js
@@ -10,6 +10,13 @@
 let jwksCache = null;
 const JWKS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
 
+// Permitted complete production origins (exact scheme + hostname + default port)
+const ALLOWED_PRODUCTION_ORIGINS = new Set([
+  'https://yesenterprises.net.in',
+  'https://www.yesenterprises.net.in',
+  'https://yes-enterprise-website.pages.dev'
+]);
+
 /**
  * Base64URL decode helper using standard Web APIs.
  *
@@ -336,13 +343,15 @@ export async function validateAdminSession(context, fetchFn = fetch) {
     try {
       const originUrl = new URL(origin);
-      const host = originUrl.hostname.toLowerCase();
-      const isAllowedOrigin =
-        host === 'yesenterprises.net.in' ||
-        host === 'www.yesenterprises.net.in' ||
-        host === 'yes-enterprises.pages.dev' ||
-        host.endsWith('.yes-enterprises.pages.dev') ||
-        host === 'localhost' ||
-        host === '127.0.0.1';
+      const isDev = env?.ENVIRONMENT === 'development';
+      const isLocal =
+        isDev &&
+        (originUrl.protocol === 'http:' || originUrl.protocol === 'https:') &&
+        (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1');
+
+      const isAllowedOrigin =
+        ALLOWED_PRODUCTION_ORIGINS.has(originUrl.origin) || isLocal;
 
       if (!isAllowedOrigin) {
         return {
```

---

## 7. Confirmation of Execution Boundaries

- **Zero (0) Git commits were created or pushed.**
- **Zero (0) website deployments were triggered.**
- **Zero (0) DNS records were changed.**
- **Zero (0) Cloudflare Access settings were modified.**
- **Zero (0) Pages secrets or variables were modified remotely.**
- **Zero (0) D1 or R2 resources were modified.**

Phase 5.3.4.2 is fully verified and complete.
