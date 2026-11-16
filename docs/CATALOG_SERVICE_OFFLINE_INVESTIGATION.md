# YES ENTERPRISES — Catalogue Service Offline Investigation & Local Development Fix Report

**Document Version:** 1.0.0  
**Date:** 2026-11-15  
**Project:** YES ENTERPRISES Wholesale Catalogue Website  
**Local Project Directory:** `D:\webpage`  
**Target Environment:** Local Development & Testing  
**Production Domain:** `https://yesenterprises.net.in`  
**Production D1 Database:** `yes_enterprises_db` (`54c9ce5b-377e-4788-9899-43f71addf8a9`)  
**Production Safeguard Status:** Strictly Read-Only (Zero deployments, zero remote D1/R2 mutations, zero Git commits/pushes)

---

## 1. Root Cause Analysis

### 1.1 Primary Cause — Backend Functions Runtime Not Started
When running:
```powershell
npm run dev -- --host 0.0.0.0
```
the script defined in `package.json` was:
```json
"dev": "vite"
```
This started **only** the Vite client development server on port 5173.

The project architecture relies on Cloudflare Pages Functions (`functions/` directory) communicating with Cloudflare D1 (local SQLite in `.wrangler/state/v3/d1/...`) and Cloudflare R2 (local emulator in `.wrangler/state/v3/r2/...`). 

In `vite.config.js`, reverse-proxy rules were configured:
```javascript
proxy: {
  '/api': 'http://127.0.0.1:8788',
  '/uploads': 'http://127.0.0.1:8788'
}
```
Because no backend process was running on port 8788:
1. The browser/mobile frontend requested `/api/products` and `/api/categories` relative to port 5173.
2. The Vite dev server attempted to forward the TCP socket to `http://127.0.0.1:8788`.
3. The operating system kernel immediately returned `ECONNREFUSED`.
4. Vite responded to the browser with HTTP 504 Gateway Timeout / proxy connection failure.
5. `apiFetch` in `src/services/api/client.js` caught the non-200 response and threw an `ApiError`.
6. The `useProducts` hook set `products` to `[]` and set `error`.
7. `src/pages/Products.jsx` evaluated `hasError = Boolean(productsError && products.length === 0)` as `true`, rendering the red warning panel: **"Catalogue Service Temporarily Offline — Try Again"**.

### 1.2 Secondary Cause — Mobile LAN IP Address (`192.168.1.208`) Recognition
In `src/services/api/client.js`:
```javascript
export function isLocalEnvironment() {
  if (isProductionMode()) return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}
```
When opening the site from an Android smartphone on the local Wi-Fi at `http://192.168.1.208:5173/`, `window.location.hostname` evaluated to `'192.168.1.208'`. `isLocalEnvironment()` returned `false`. This treated the mobile phone as a non-local/production origin, disabling development bypasses and preventing any development-mode fallback or diagnostic headers.

### 1.3 Tooling Gap in `package.json`
`package.json` contained `"pages:dev": "wrangler pages dev dist"`, which requires compiling `dist` beforehand, but had no unified script to start the Cloudflare Pages Functions backend directly in development or run both frontend and backend concurrently.

---

## 2. Evidence Supporting the Diagnosis

1. **Port 8788 Socket Inspection:**
   - Prior to fix: Probing `http://127.0.0.1:8788/api/health` failed with `ECONNREFUSED` (no listener).
   - After starting Wrangler: `GET http://127.0.0.1:8788/api/health` returned HTTP 200 in 21ms with `"database":{"status":"healthy","connected":true}`.
2. **Vite Proxy Behavior:**
   - When port 8788 was inactive, requests to `http://localhost:5173/api/products` received HTTP 504 from Vite with console error: `[vite] http proxy error: /api/products -> Error: connect ECONNREFUSED 127.0.0.1:8788`.
   - When port 8788 was active, requests to `http://localhost:5173/api/products` and `http://192.168.1.208:5173/api/products` returned HTTP 200 with all 17 products.
3. **Production API Separation:**
   - Live checks against `https://yesenterprises.net.in/api/*` proved the production database and backend were 100% operational, proving the issue was purely absent local backend execution.

---

## 3. Files Inspected

| Category | File Path | Scope of Inspection |
|---|---|---|
| **Build & Config** | `package.json` | Development scripts, dependencies, engine versions |
| **Build & Config** | `vite.config.js` | Dev server port, host binding, proxy definitions |
| **Cloudflare** | `wrangler.jsonc` | Compatibility date, flags, D1 database ID, R2 bindings |
| **Pages Functions** | `functions/api/health.js` | Health check logic and database connectivity test |
| **Pages Functions** | `functions/api/categories/index.js` | Categories query, sorting, caching |
| **Pages Functions** | `functions/api/products/index.js` | Product pagination, status filter, category filter |
| **Pages Functions** | `functions/api/products/[slug].js` | Single product retrieval, variants, image aggregation |
| **Pages Functions** | `functions/_shared/db.js` | D1 database binding accessor and safe error handler |
| **Pages Functions** | `functions/_shared/auth.js` | Origin validation, dev bypass logic, CSRF protection |
| **Frontend API** | `src/services/api/client.js` | Base URL, `isLocalEnvironment()`, `isProductionMode()`, `apiFetch` |
| **Frontend API** | `src/services/api/products.js` | `getPublicProducts()`, `getPublicProductBySlug()` |
| **Frontend API** | `src/services/api/categories.js` | `getPublicCategories()` |
| **Frontend Hooks** | `src/hooks/useProducts.js` | Lifecycle, error handling, fixture fallback gating |
| **Frontend Hooks** | `src/hooks/useCategories.js` | Lifecycle, error handling, state management |
| **Frontend UI** | `src/pages/Products.jsx` | Catalogue rendering, offline banner, filter controls |
| **Frontend UI** | `src/pages/ProductDetail.jsx` | Detail view, offline banner, error boundaries |
| **Automated Tests** | `scripts/test-phase2-runtime-http.mjs` | Wrangler child process spawning and TCP socket probing |

---

## 4. Files Changed

| File Path | Nature of Change |
|---|---|
| `src/services/api/client.js` | Enhanced `isLocalEnvironment()` to support private RFC 1918 LAN IPs on Wi-Fi |
| `vite.config.js` | Added `changeOrigin: true` to `/api` and `/uploads` proxy rules |
| `src/pages/Products.jsx` | Enhanced error handling, added category load warning, refined offline panel |
| `package.json` | Added `dev:frontend`, `dev:backend`, and `dev:all` scripts |
| `scripts/dev-fullstack.mjs` | **New:** Concurrent dual-process runner with auto-detected LAN IP and graceful exit |
| `scripts/test-phase13-local-dev-verification.mjs` | **New:** End-to-end automated verification script for Vite + Wrangler proxy |

---

## 5. Changes Implemented

### 5.1 `src/services/api/client.js`
Expanded `isLocalEnvironment()` to recognize RFC 1918 private subnets and `.local` mDNS domains in non-production mode:
```javascript
export function isLocalEnvironment() {
  if (isProductionMode()) {
    return false; // Absolute production security guarantee
  }

  if (typeof window === 'undefined') {
    if (typeof globalThis !== 'undefined' && typeof globalThis.__TEST_IS_LOCAL__ === 'boolean') {
      return globalThis.__TEST_IS_LOCAL__;
    }
    return false;
  }

  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.local') ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}
```

### 5.2 `vite.config.js`
Configured `changeOrigin: true` for all proxied API and uploads requests:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true
      }
    }
  },
})
```

### 5.3 `src/pages/Products.jsx`
1. **Isolated Category Failures:** Added a warning banner if categories fail to load while products succeed, preventing category errors from hiding the entire product catalogue.
2. **Context-Aware Error Messaging:** Differentiates network/connection timeouts from server errors and displays specific technical details in a subtle diagnostic badge alongside the Retry button.

### 5.4 `package.json`
Added three development scripts while preserving existing scripts:
```json
"dev": "vite",
"dev:frontend": "vite --host 0.0.0.0",
"dev:backend": "wrangler pages dev public --port 8788 --ip 127.0.0.1",
"dev:all": "node scripts/dev-fullstack.mjs",
```

### 5.5 `scripts/dev-fullstack.mjs`
Created a standalone runner that:
- Spawns Wrangler Pages Functions on `127.0.0.1:8788` against `public/` (does not require pre-building `dist/`).
- Automatically detects the host machine's Wi-Fi LAN IP (e.g. `192.168.1.208`).
- Waits until Wrangler reports `Ready on http://127.0.0.1:8788`.
- Spawns Vite on `0.0.0.0:5173`.
- Prints clickable URLs for laptop, mobile Wi-Fi, and backend health.
- Traps `SIGINT`/`SIGTERM` to cleanly terminate both child processes without orphaned Node tasks.

---

## 6. Production API Verification Results

A read-only live audit was executed against `https://yesenterprises.net.in`:

| Endpoint | HTTP Status | Response Summary | Database Status |
|---|:---:|---|---|
| `GET /api/health` | **200 OK** | `{"status":"ok","service":"yes-enterprises-api","version":"1.0.0"}` | `{"status":"healthy","connected":true,"latency_ms":200}` |
| `GET /api/categories` | **200 OK** | 6 active categories returned (`glass-bottles`, `plastic-bottles`, `silicone-sleeve`, `ss-bottles`, `ss-sippers`, `ss-tiffin`) | Verified healthy |
| `GET /api/products` | **200 OK** | 14 baseline products returned (`total: 14`, `limit: 20`, `offset: 0`) | Verified healthy |

**Conclusion:** Production services are fully online, healthy, and completely unaffected by local development changes.

---

## 7. Local API Verification Results

Executed via automated test suite `scripts/test-phase13-local-dev-verification.mjs`:

| Target & Route | Address Queried | Status | Verified Result |
|---|---|:---:|---|
| **Direct Backend Health** | `http://127.0.0.1:8788/api/health` | **200 OK** | `status: "ok"`, `connected: true` |
| **Direct Backend Categories** | `http://127.0.0.1:8788/api/categories` | **200 OK** | 6 categories returned |
| **Direct Backend Products** | `http://127.0.0.1:8788/api/products` | **200 OK** | 17 products returned (`total: 17`) |
| **Vite Proxied Health** | `http://127.0.0.1:5173/api/health` | **200 OK** | Proxied cleanly to Wrangler |
| **Vite Proxied Categories** | `http://127.0.0.1:5173/api/categories` | **200 OK** | 6 categories proxied |
| **Vite Proxied Products** | `http://127.0.0.1:5173/api/products` | **200 OK** | 17 products proxied with zero offline error |
| **Mobile LAN Products** | `http://192.168.1.208:5173/api/products` | **200 OK** | 17 products returned to mobile IP |
| **Mobile LAN Categories** | `http://192.168.1.208:5173/api/categories` | **200 OK** | 6 categories returned to mobile IP |
| **Mobile LAN Product C Detail** | `http://192.168.1.208:5173/api/products/ye-premium-stainless-steel-feeding-bottle-200ml` | **200 OK** | `prod-19` returned with 4 gallery images |
| **Mobile LAN Product Image** | `http://192.168.1.208:5173/assets/seller-new-products/product-c-premium-ss-200ml-cap-box.jpeg` | **200 OK** | Binary `image/jpeg` payload served |

---

## 8. Frontend Verification Results

1. **Production Build:**
   - Executed: `npm run build`
   - Output: `dist/index.html` (2.16 kB), `dist/assets/index-BzpUegQ8.css` (49.39 kB), `dist/assets/index-BCyvA5Lc.js` (408.15 kB)
   - Duration: 2.90s, 0 errors, 0 warnings.
2. **Automated Test Suites (Total: 287 Assertions Passed, 0 Failed):**
   - `test:phase1` (D1 schema, triggers, cleanup claims): **47 / 47 PASS**
   - `test:phase2` (Pages Functions handlers, WebCrypto Access JWT): **35 / 35 PASS**
   - `test:phase3` (Admin CRUD, R2 image pipeline, crash safety): **79 / 79 PASS**
   - `test:phase4` (Frontend workflow, stock management, offline gating): **32 / 32 PASS**
   - `test:phase6` (Multi-admin auth, NULL price preservation, audit logs): **25 / 25 PASS**
   - `test-phase12` (Expanded 17 products, homepage bottle showcase, CDP): **59 / 59 PASS**
   - `test-phase13` (Vite + Wrangler full-stack proxy & mobile LAN verification): **10 / 10 PASS**

---

## 9. Exact Development Startup Commands

All commands are run from the repository root: `D:\webpage`

### Option 1 — Single Command (Recommended)
Starts both the Cloudflare Pages Functions backend (port 8788) and Vite frontend (port 5173 on 0.0.0.0):
```powershell
npm run dev:all
```
- Starts the Wrangler Pages Functions backend on `127.0.0.1:8788`.
- Automatically starts Vite on `0.0.0.0:5173`.
- Prints clickable URLs for laptop and mobile.
- Press **Ctrl + C** to cleanly stop both servers.

---

### Option 2 — Two-Terminal Workflow

#### Terminal 1 — Start the Cloudflare Pages Functions Backend:
```powershell
npm run dev:backend
```
*Expected output:*
```text
⛅️ wrangler 4.158.0
✨ Compiled Worker successfully
Your Worker has access to the following bindings:
  env.DB (yes_enterprises_db)  [D1 Database, local]
  env.PRODUCT_BUCKET           [R2 Bucket, local]
Ready on http://127.0.0.1:8788
```

#### Terminal 2 — Start the React Vite Frontend:
```powershell
npm run dev:frontend
```
*(Alternatively: `npm run dev -- --host 0.0.0.0`)*

*Expected output:*
```text
  VITE v6.4.5  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.208:5173/
```

#### How to verify the backend is running:
Open a PowerShell window or browser tab and check:
```powershell
curl.exe http://127.0.0.1:8788/api/health
```
*Expected response:*
```json
{"status":"ok","service":"yes-enterprises-api","database":{"status":"healthy","connected":true}}
```

#### How to stop the processes:
- In each terminal, press **Ctrl + C**, then type `Y` if prompted.

---

## 10. Local Laptop and Mobile URLs

| Device | Purpose | Exact URL |
|---|---|---|
| **Laptop Browser** | Public Homepage & Catalogue | `http://localhost:5173/` or `http://127.0.0.1:5173/` |
| **Laptop Browser** | Full Products Catalogue | `http://localhost:5173/products` |
| **Laptop Browser** | Admin Dashboard | `http://localhost:5173/admin` |
| **Android Phone** | Mobile Homepage & Showcase | `http://192.168.1.208:5173/` |
| **Android Phone** | Mobile Catalogue (17 Products) | `http://192.168.1.208:5173/products` |
| **Android Phone** | Product C Detail & Gallery | `http://192.168.1.208:5173/products/ye-premium-stainless-steel-feeding-bottle-200ml` |
| **Diagnostic** | Local Backend Health Check | `http://127.0.0.1:8788/api/health` |
| **Diagnostic** | Local D1 Products JSON | `http://127.0.0.1:8788/api/products` |

---

## 11. Remaining Limitations & Environment Notes

1. **Same Local Network Requirement:**  
   The Android smartphone must be connected to the same Wi-Fi network / subnet as the laptop (`192.168.1.x`). Mobile cellular data cannot route to private LAN IP `192.168.1.208`.
2. **Windows Firewall Rule:**  
   On Windows, ensure private network access is allowed for Node.js if the phone cannot connect to port 5173 on first run.
3. **Local D1 Persistence Location:**  
   The local D1 database is persisted in `.wrangler/state/v3/d1/` and contains the full Phase 12 catalogue (6 categories, 17 products, 34 images).
4. **Zero Production Risk:**  
   No remote D1 migrations were run, no R2 objects were uploaded to production, and no Cloudflare Pages deployments were triggered.
