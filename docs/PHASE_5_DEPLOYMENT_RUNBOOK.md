# YES ENTERPRISES — Phase 5 Deployment Runbook

**Version:** 5.1.4  
**Status:** Pre-deployment documentation — Domain registered (`yesenterprises.net.in`), configuration ready  
**Scope:** Cloudflare Pages + Functions + D1 + R2 + Access  
**Last updated:** 2026-11-14

> [!IMPORTANT]
> This runbook is a documentation artifact. The registered domain `yesenterprises.net.in` is confirmed and active on Cloudflare nameservers. Codebase references have been prepared locally. Do not execute remote creation, DNS alterations, or deployments until ready. All remaining `TO_BE_CONFIGURED` values must be supplied before proceeding to live deployment.

---

## Architecture Overview

```
Browser
  │
  ├─ Static assets (HTML/CSS/JS/fonts) ──► Cloudflare Pages CDN
  │
  ├─ /api/* requests ─────────────────────► Cloudflare Pages Functions
  │                                              │
  │                                         ┌───┴────────────────────┐
  │                                         │  D1 (SQL database)     │
  │                                         │  R2 (image objects)    │
  │                                         └────────────────────────┘
  │
  └─ /admin/* (browser) ──────────────────► Cloudflare Access (IdP/SSO)
                                                  │
                                             JWT verified server-side
                                             in every admin API call
```

**Key architecture decisions:**
- Pages Functions run at the Cloudflare edge — no sleeping containers, no cold starts
- R2 images are served through the `/uploads/` Pages Function (private bucket), not a public R2 URL
- Admin authentication uses two independent layers (Cloudflare Access policy + server-side `ADMIN_EMAILS` check)
- All secrets are stored as Cloudflare Pages environment variables — never in source code

---

## Deployment Steps

---

### Step 1 — Create a Cloudflare Account

**Purpose:** Every Cloudflare service (Pages, D1, R2, Access) is attached to an account.

**What to do:**
1. Go to https://dash.cloudflare.com/sign-up
2. Register with a business email address
3. Record the **Account ID** (found in the right sidebar on the dashboard home)

**Required inputs:** Business email address  
**Expected result:** Cloudflare account active, Account ID available

**Security note:** Enable two-factor authentication immediately on the account.

---

### Step 2 — Domain & DNS Verification (CONFIRMED: `yesenterprises.net.in`)

**Purpose:** The official production domain is registered and Cloudflare nameservers are active.

**Status:** ✅ **COMPLETED**
- **Registered Domain:** `yesenterprises.net.in`
- **DNS Status:** Cloudflare authoritative nameservers active
- **Supported Origins:**
  - Production apex: `https://yesenterprises.net.in`
  - Production www: `https://www.yesenterprises.net.in`
  - Cloudflare Pages apex: `https://yes-enterprises.pages.dev`
  - Cloudflare Pages preview: `https://*.yes-enterprises.pages.dev`
  - Local development: `http://localhost:*`, `http://127.0.0.1:*`

**Completed Codebase Updates:**

| File | Location | Updated Value | Status |
|---|---|---|---|
| `functions/_shared/auth.js` | Lines 328–333 | CSRF allowlist contains `yesenterprises.net.in`, `www.yesenterprises.net.in`, `yes-enterprises.pages.dev`, `*.yes-enterprises.pages.dev`, `localhost`, `127.0.0.1` | ✅ Updated |
| `src/config/site.config.js` | `siteUrl` field | `https://yesenterprises.net.in` | ✅ Updated |
| `package.json` | Dependencies | `aws4fetch` moved to `dependencies`; added `"engines": { "node": ">=22.0.0" }` | ✅ Updated |
| `wrangler.jsonc` | Settings | Retained `local-d1-yes-enterprises-db` placeholder with documentation; verified `pages_build_output_dir: "dist"` | ✅ Updated |

---

### Step 3 — Install and Authenticate Wrangler

**Purpose:** Wrangler is the Cloudflare CLI used to create D1 databases, R2 buckets, and manage deployments.

**What to do:**
```bash
npm install -g wrangler
wrangler login
```

**Required inputs:** Cloudflare account credentials  
**Expected result:** `wrangler whoami` shows the authenticated account  
**Node.js requirement:** Use Node.js 22 locally (matches the Pages build environment `NODE_VERSION=22`)

**Cloudflare Compatibility Configuration:**
- Compatibility date in `wrangler.jsonc`: `"2024-11-01"`
- Compatibility flags: `["nodejs_compat"]`
- **Evaluation & Rationale:**
  - In Cloudflare Workers and Pages Functions, specifying `"compatibility_flags": ["nodejs_compat"]` automatically enables `nodejs_compat_v2` behavior for compatibility dates from `2024-09-23` through `2026-08-03`.
  - The project's compatibility date (`"2024-11-01"`) falls squarely within this range, ensuring complete and stable access to Node.js polyfills (e.g. AsyncLocalStorage, crypto, streams) required by dependencies such as `aws4fetch`.
  - From `2026-08-04` onward, Cloudflare enables Node.js compatibility by default without requiring an explicit flag.
  - While newer compatibility dates do not necessarily introduce breaking changes, any future date update should be deliberately planned, updated, and tested against the actual Cloudflare Pages Functions runtime before adoption in production.
  - All 242 automated local test assertions pass under this configuration.

---

### Step 4 — Create the Remote D1 Database

**Purpose:** The production SQL database must be created before deployment so its ID can be recorded in `wrangler.jsonc`.

**What to do:**
```bash
wrangler d1 create yes_enterprises_db
```

Record the `database_id` printed by this command.

**Required inputs:** None (database name is fixed: `yes_enterprises_db`)  
**Expected result:** A real `database_id` UUID is printed — e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Then update `wrangler.jsonc`:**
```jsonc
"d1_databases": [{
  "binding": "DB",
  "database_name": "yes_enterprises_db",
  "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  // replace placeholder
}]
```

> [!CAUTION]
> The current `database_id` value in `wrangler.jsonc` is `"local-d1-yes-enterprises-db"` — a local placeholder. Deploying without replacing it will fail or silently bind to the wrong database.

---

### Step 5 — Run Database Migrations

**Purpose:** Apply the schema to the production D1 database before serving any traffic.

**What to do:**
```bash
# Apply all migrations in order
wrangler d1 migrations apply yes_enterprises_db --remote
```

**Migration files and order:**

| File | Description | Destructive? |
|---|---|---|
| `migrations/0001_initial_schema.sql` | Creates all 8 tables, indexes, triggers | No |
| `migrations/0002_r2_deletion_safety.sql` | Adds `deleting`/`tombstone` states to `cleanup_claims` (copy-then-replace) | No |

**Tables created by migration 0001 (8 total):**

| # | Table | Purpose |
|---|---|---|
| 1 | `categories` | Product categories |
| 2 | `products` | Product catalogue |
| 3 | `product_variants` | Product variants (size, colour, etc.) |
| 4 | `product_images` | Registered R2 image metadata |
| 5 | `pending_uploads` | Race-safe upload tracking |
| 6 | `cleanup_claims` | Atomic lease-based orphan cleanup |
| 7 | `inventory_logs` | Inventory change audit log |
| 8 | `site_settings` | Key-value site configuration store |

**Expected result:** Both migrations applied successfully, all tables exist in production D1  
**Common mistake:** Running migrations against the local database instead of `--remote`

**Initial site_settings data:**

The `site_settings` table is created by the migration but populated with empty or default values. `AdminSettings.jsx` is a **read-only viewer** — it cannot write to the database. Initial site settings must be inserted via an approved SQL migration or Wrangler D1 execute command:

```bash
# Example only — confirm values before running
wrangler d1 execute yes_enterprises_db --remote --command \
  "INSERT OR REPLACE INTO site_settings (key, value) VALUES ('site_name', 'YES ENTERPRISES');"
```

Do not use the admin UI to configure initial settings — it has no write capability.

---

### Step 6 — Create the R2 Bucket

**Purpose:** Product images are stored in R2 and served through the `/uploads/` Pages Function.

**What to do:**
```bash
wrangler r2 bucket create yes-enterprises-public-images
```

> [!IMPORTANT]
> Do NOT enable the R2 public access URL on this bucket. Images are delivered through the `/uploads/[[key]].js` Pages Function which enforces authentication for unpublished images. A public bucket URL would bypass this protection.

**Required inputs:** None (bucket name is fixed: `yes-enterprises-public-images`)  
**Expected result:** Bucket exists and is private

---

### Step 7 — Configure Cloudflare Access

**Purpose:** Cloudflare Access controls who can reach the admin login page and issues signed JWTs that the backend then independently verifies on every protected API call.

#### 1. How JWT authentication flows through the system

When an administrator authenticates through Cloudflare Access, Cloudflare sets a cryptographically signed RS256 JWT in the `CF_Authorization` cookie on the domain.

- **Cookie domain and path settings:**
  - Cloudflare Access sets the `CF_Authorization` cookie with domain `yesenterprises.net.in` and `Path=/`.
  - Because the cookie path is root (`/`), the browser automatically transmits the `CF_Authorization` cookie on all subsequent requests to the same origin whenever `credentials: 'include'` is configured.
  - The frontend API client (`src/services/api/client.js`) explicitly sets `credentials: 'include'` on all `fetch()` calls. Thus, administrative calls to `/api/admin/*` and image requests to `/uploads/*` automatically carry this authentication cookie without requiring manual token injection.

- **Header vs Cookie authentication:**
  The backend middleware (`validateAdminSession()` in `functions/_shared/auth.js`) supports both header and cookie authentication:
  1. **Headers (Programmatic / CLI / Service Tokens / Proxies):**
     - Checks `CF_Authorization: <jwt>`
     - Checks `cf-access-jwt-assertion: <jwt>`
     - Header inspection takes precedence over cookie inspection.
  2. **Cookies (Standard Browser Interaction):**
     - Checks `Cookie: ... CF_Authorization=<jwt> ...`
     - When cookie-based authentication is detected on state-changing methods (`POST`, `PUT`, `DELETE`, `PATCH`), the backend automatically enforces strict CSRF origin validation (`sec-fetch-site` and `origin` checks against allowed origins).

#### 2. Path coverage & route protection matrix (all 8 route categories)

Cloudflare Access and Pages Functions work in tandem using defense-in-depth:

| # | Route / Path | Protected by Access at Edge? | Backend JWT Validation? | Anonymous Request Behavior | Authenticated Admin Behavior | Cache Policy |
|---|---|---|---|---|---|---|
| 1 | `/admin` | ✅ **Yes** (Edge login wall) | N/A (Static HTML) | 302 Redirect to Access login wall | Serves `index.html` admin SPA entry | `no-cache` / HTML revalidation |
| 2 | `/admin/*` | ✅ **Yes** (Edge login wall) | N/A (Static HTML/JS) | 302 Redirect to Access login wall | Serves admin SPA client-side routes | Static asset immutable caching for hashed bundles (`/assets/*`); `no-cache` for HTML |
| 3 | `/api/admin/*` | ❌ **No** (Direct to Function) | ✅ **Yes** (`validateAdminSession()`) | `401 UNAUTHENTICATED` (or `403 CSRF_REJECTED` if missing origin on cookie write) | `200 OK` (JSON response with requested resource) | `Cache-Control: no-store, no-cache, must-revalidate` |
| 4 | `/uploads/*` (Active products) | ❌ **No** (Public access) | ❌ **No** (Public) | `200 OK` with binary image stream | `200 OK` with binary image stream | `Cache-Control: public, max-age=31536000, immutable` + `ETag` conditional 304 |
| 5 | `/uploads/*` (Draft products) | ❌ **No** (Edge allows traffic) | ✅ **Yes** (`validateAdminSession()`) | `404 Not Found` (deliberately conceals existence) | `200 OK` with preview binary image stream | `Cache-Control: private, no-cache, no-store, must-revalidate` |
| 6 | `/uploads/*` (Archived products) | ❌ **No** (Edge allows traffic) | ✅ **Yes** (`validateAdminSession()`) | `404 Not Found` (deliberately conceals existence) | `200 OK` with preview binary image stream | `Cache-Control: private, no-cache, no-store, must-revalidate` |
| 7 | `/api/products/*`, `/api/categories/*` | ❌ **No** (Public access) | ❌ **No** (Public read API) | `200 OK` (JSON product/category catalog data) | `200 OK` (identical catalog data) | `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=60` |
| 8 | `/api/health` | ❌ **No** (Public access) | ❌ **No** (Public health API) | `200 OK` (`{ status: "ok", checks: { database: "healthy" } }`) | `200 OK` | `Cache-Control: no-store, no-cache, must-revalidate` |

> [!IMPORTANT]
> **Why `/uploads/*` must NOT be protected at the Cloudflare Access edge:**
> If an administrator configures Cloudflare Access to protect `/uploads/*` at the edge, public customers visiting the product catalogue would be redirected to the Zero Trust login wall when trying to load product photos. Therefore, `/uploads/*` must remain open at the Cloudflare Access edge, while the backend Pages Function selectively guards private draft and archived images.

#### 3. Configuring the Access application in Cloudflare Zero Trust

**What to do in Cloudflare Dashboard:**
1. Navigate to **Zero Trust** → **Access** → **Applications**.
2. Click **Add an application** → Select **Self-hosted**.
3. **Application Settings:**
   - **Application Name:** `YES ENTERPRISES Admin Dashboard`
   - **Session Duration:** `24 hours` (or business preferred duration)
   - **Application domain:**
     - Subdomain: *(leave empty)*
     - Domain: `yesenterprises.net.in`
     - Path: `admin`  *(Matches `/admin` and `/admin/*` SPA paths)*
4. **Identity Providers:**
   - Configure supported identity provider (Google Workspace, Microsoft Entra, GitHub, or One-Time PIN).
5. **Access Policies (Multi-Admin Configuration):**
   - **Policy Name:** `Authorized Administrators Policy`
   - **Action:** `Allow`
   - **Rule Type (Include):**
     - Select `Emails` or `Email Domain`
     - Add each authorized administrator email address:
       ```
       admin@yesenterprises.net.in
       director@yesenterprises.net.in
       manager@yesenterprises.net.in
       ```
6. **Record Application Values (Required for Pages Environment Variables):**
   - **Team Name (`CF_ACCESS_TEAM_NAME`):** Your Zero Trust organization subdomain (e.g. `yes-enterprises`). This establishes the expected JWT issuer: `https://<CF_ACCESS_TEAM_NAME>.cloudflareaccess.com` and JWKS certificates URL: `https://<CF_ACCESS_TEAM_NAME>.cloudflareaccess.com/cdn-cgi/access/certs`.
   - **Application Audience Tag (`CF_ACCESS_AUD`):** The unique hexadecimal audience hash generated by Cloudflare Access for this application (found under Application Overview / Headers). The backend strictly verifies that the JWT `aud` claim matches this tag.

#### 4. Post-Deployment Verification Steps (Live Cloudflare Verification Required)

> [!NOTE]
> The following checks must be performed against the live Cloudflare deployment after completing Phase 5.2. Local automated test equivalents pass 100%, but live network verification confirms edge routing and SSL termination.

1. **Test anonymous access to `/admin`:**
   ```bash
   curl -I https://yesenterprises.net.in/admin
   ```
   *Expected:* HTTP 302 redirect to Cloudflare Access login URL (`https://<CF_ACCESS_TEAM_NAME>.cloudflareaccess.com/cdn-cgi/access/login/...`).

2. **Test anonymous access to `/api/admin/session`:**
   ```bash
   curl -I https://yesenterprises.net.in/api/admin/session
   ```
   *Expected:* HTTP 401 UNAUTHENTICATED with JSON `{ success: false, error: { code: "UNAUTHENTICATED", message: "Missing Cloudflare Access authorization credentials." } }`.

3. **Test anonymous access to public active product image:**
   ```bash
   curl -I https://yesenterprises.net.in/uploads/products/sample-active.jpg
   ```
   *Expected:* HTTP 200 OK with `Cache-Control: public, max-age=31536000, immutable`, `ETag`, and `Content-Type: image/jpeg`.

4. **Test anonymous access to draft or archived product image:**
   ```bash
   curl -I https://yesenterprises.net.in/uploads/products/sample-draft.jpg
   curl -I https://yesenterprises.net.in/uploads/products/sample-archived.jpg
   ```
   *Expected:* HTTP 404 Not Found (deliberately concealing draft existence; zero metadata leaked).

5. **Test authenticated access with valid admin token (via header):**
   ```bash
   curl -H "cf-access-jwt-assertion: <VALID_JWT>" https://yesenterprises.net.in/api/admin/session
   ```
   *Expected:* HTTP 200 OK with `{ "success": true, "data": { "authenticated": true, "email": "admin@yesenterprises.net.in", "auth_type": "cloudflare_access" } }`.

6. **Test authenticated access with valid admin token (via cookie):**
   ```bash
   curl -H "Cookie: CF_Authorization=<VALID_JWT>" https://yesenterprises.net.in/api/admin/session
   ```
   *Expected:* HTTP 200 OK.

7. **Test CSRF enforcement on cookie-authenticated write request without Origin:**
   ```bash
   curl -X POST -H "Cookie: CF_Authorization=<VALID_JWT>" https://yesenterprises.net.in/api/admin/products
   ```
   *Expected:* HTTP 403 Forbidden with `{ "success": false, "error": { "code": "CSRF_REJECTED" } }`.

> [!IMPORTANT]
> Adding or removing an administrator requires two changes:
> 1. Update the Cloudflare Access policy (add/remove the email from the policy)
> 2. Update the `ADMIN_EMAILS` environment variable (add/remove from the comma-separated list) and redeploy
>
> Both steps are required. Access policy alone does not grant API access. `ADMIN_EMAILS` alone does not allow login.

---

### Step 8 — Connect GitHub Repository to Cloudflare Pages

**Purpose:** Connect the GitHub repository to Cloudflare Pages to establish continuous automated deployments on every push to the `main` branch.

#### Step-by-Step Connection Instructions

1. **Open the Cloudflare Dashboard:**
   - Log in at `https://dash.cloudflare.com`.
2. **Navigate to Workers & Pages:**
   - In the left sidebar, click **Compute (Workers & Pages)** → **Overview** (or **Workers & Pages**).
3. **Initiate Pages Project Creation:**
   - Click **Create** (or **Create application**).
   - Select the **Pages** tab.
   - Click **Connect to Git**.
4. **Authorize GitHub:**
   - Select your GitHub account or organization.
   - If Cloudflare Pages is not yet authorized, click **Add GitHub account** or **Install Cloudflare Pages** in GitHub.
   - Choose to grant access either to **All repositories** or select **Only select repositories** and pick `yes-enterprise-website` (or your designated repository name).
   - Click **Install & Authorize**.
5. **Select the YES ENTERPRISES Repository:**
   - In the list of available repositories, select the YES ENTERPRISES repository.
   - Click **Begin setup**.
6. **Configure Build Settings:**
   - **Project name:** `yes-enterprises` (determines initial preview URL: `https://yes-enterprises.pages.dev`).
   - **Production branch:** `main`.
   - **Framework preset:** Select **Vite** from the dropdown (automatically defaults build command and output directory).
   - **Build command:** `npm run build` (confirm matches `package.json`).
   - **Build output directory:** `dist` (confirm matches `vite.config.js` and `wrangler.jsonc`).
   - **Root directory:** `/` (leave empty / repository root).
7. **Configure Build Environment Variable (`NODE_VERSION=22`):**
   - Expand the **Environment variables (advanced)** section (or navigate to **Settings → Environment variables → Build tab** after creation).
   - Add the following variable:
     - **Variable name:** `NODE_VERSION`
     - **Value:** `22`
   - Click **Save and Deploy**.
8. **Review the Initial Deployment:**
   - Monitor the deployment build log.
   - Verify that the build container selects Node.js 22, installs dependencies via `npm ci`, and executes `vite build` into `dist`.
   - Confirm the deployment finishes with a green checkmark and generates the active `*.pages.dev` deployment preview.

> [!WARNING]
> **Expected First-Deployment State:**
> - The initial build will succeed and the static homepage, catalog UI, and navigation will be viewable on `https://yes-enterprises.pages.dev`.
> - However, **live database queries and image uploads will NOT function yet** on this initial deployment because:
>   1. The remote D1 database binding (`DB`) has not been linked in Pages settings.
>   2. The private R2 bucket binding (`PRODUCT_BUCKET`) has not been linked in Pages settings.
>   3. Production environment variables (`CF_ACCESS_TEAM_NAME`, `CF_ACCESS_AUD`, `ADMIN_EMAILS`, R2 API credentials) have not yet been populated in the Pages dashboard.
> - **Do NOT treat the website as production-ready** simply because the initial Pages build succeeded. Full operational functionality requires completing Steps 9 through 12.

---

### Step 9 — Configure R2 CORS Policy

**Purpose:** The browser uploads product images directly to R2 using a presigned PUT URL. The browser's `XMLHttpRequest` goes from the Pages origin to `<accountid>.r2.cloudflarestorage.com` — a cross-origin request — so R2 must permit it via CORS.

#### Exact upload request confirmed from source

The upload is performed by `uploadToR2()` in `src/services/api/uploads.js` using `XMLHttpRequest`:

```js
xhr.open('PUT', uploadUrl, true);       // PUT method
xhr.setRequestHeader('Content-Type', contentType);  // only this header is set explicitly
xhr.send(fileData);                     // binary blob body
```

The browser automatically adds an `Origin` header to this cross-origin XHR. No other custom headers are set. The `Content-Type` value is one of: `image/jpeg`, `image/png`, or `image/webp` (the only types accepted by `ImageUploader.jsx`).

> [!NOTE]
> `aws4fetch` signs the `Content-Type` header into the presigned URL using `allHeaders: true`. The browser must send exactly the same `Content-Type` value that was signed — R2 will reject the upload if they differ. CORS must include `Content-Type` in `AllowedHeaders` to permit the browser to set it on the cross-origin PUT.

#### Minimum required CORS configuration

| Field | Required value | Reason |
|---|---|---|
| `AllowedMethods` | `["PUT"]` | Direct upload uses HTTP PUT |
| `AllowedHeaders` | `["Content-Type"]` | The only custom header set by the XHR |
| `AllowedOrigins` | Production domain + Pages default domain | Browser sends `Origin` on cross-origin XHR |
| `MaxAgeSeconds` | `3600` | Preflight cache duration |

**What to do:**

1. Create a file `cors.json`:
```json
[
  {
    "AllowedOrigins": [
      "https://yesenterprises.net.in",
      "https://www.yesenterprises.net.in",
      "https://yes-enterprises.pages.dev"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

2. Apply the CORS configuration using the supported Wrangler syntax:
```bash
npx wrangler r2 bucket cors set yes-enterprises-public-images --file cors.json
```

3. Verify the applied CORS configuration:
```bash
npx wrangler r2 bucket cors list yes-enterprises-public-images
```

#### Origin policy decisions

| Origin | Include? | Reason |
|---|---|---|
| `https://yesenterprises.net.in` | ✅ Required | Production apex domain — admins upload images here |
| `https://www.yesenterprises.net.in` | ✅ Required | Production www subdomain |
| `https://yes-enterprises.pages.dev` | ✅ Required | Pages default production origin — same deployment |
| Preview origins (e.g. `https://abc123.yes-enterprises.pages.dev`) | ⚠️ Optional | Admins testing from a preview branch would need their preview origin listed. If image uploads are only performed from production deployments, preview origins can be excluded. |
| Wildcard `*` | ❌ Never | Would allow any website to upload files to the bucket using valid presigned URLs |

**Required inputs:** None (domain confirmed: `yesenterprises.net.in`)  
**Expected result:** Browser-to-R2 presigned PUT upload succeeds from listed origins; upload requests from other origins are rejected by R2 CORS

---

### Step 10 — Configure Production Environment Variables and Secrets

**Purpose:** All runtime configuration and secrets must be set in Cloudflare Pages before the site can function.

**In the Cloudflare Pages dashboard → Settings → Environment variables → Production:**

#### Non-secret variables

| Variable | Value | Notes |
|---|---|---|
| `ENVIRONMENT` | `production` | Mandatory runtime environment flag |
| `CF_ACCESS_TEAM_NAME` | `TO_BE_CONFIGURED` | Your Cloudflare Zero Trust organization slug |
| `R2_BUCKET_NAME` | `yes-enterprises-public-images` | Matches R2 bucket binding |

*(Note: `R2_PUBLIC_URL` is omitted. It is NOT required or used by the application runtime.)*

#### Secret variables (encrypt at rest)

| Variable | Value |
|---|---|
| `CF_ACCESS_AUD` | `TO_BE_CONFIGURED` (audience tag from Access application) |
| `ADMIN_EMAILS` | `admin-one@example.com,admin-two@example.com` |
| `R2_ACCOUNT_ID` | `TO_BE_CONFIGURED` (Cloudflare Account ID) |
| `R2_ACCESS_KEY_ID` | `TO_BE_CONFIGURED` (R2 API token key ID) |
| `R2_SECRET_ACCESS_KEY` | `TO_BE_CONFIGURED` (R2 API token secret) |

> [!NOTE]
> **R2 Image Architecture & URL Clarification:**
> Product images are delivered exclusively through the Cloudflare Pages Function `/uploads/[[key]].js` route from the private R2 bucket (`PRODUCT_BUCKET`).
> - The R2 bucket must remain **private** (do not enable public R2 access).
> - `R2_PUBLIC_URL` is completely unused by the application and should **not** be set in production Pages environment variables.
> - The subdomain `images.yesenterprises.net.in` is **not** required, does not need to be configured in DNS, and does not need to be purchased or mapped. All images resolve directly via same-origin relative URLs (`/uploads/products/...`).

> [!CAUTION]
> Never set `ENABLE_DEV_ADMIN_BYPASS=true` in production. This variable must only appear in `.dev.vars` for local development. The backend requires all four bypass conditions simultaneously — but the safest approach is to never set this variable at all in the Pages environment.

**To generate R2 API credentials:**
1. Cloudflare dashboard → **R2** → **Manage R2 API Tokens**
2. Create a token with **Object Read & Write** permission scoped to the `yes-enterprises-public-images` bucket
3. Record the Account ID, Access Key ID, and Secret Access Key

---

### Step 11 — Verify Bindings in Wrangler Dashboard

**Purpose:** D1 and R2 bindings must appear in the Pages project settings to be accessible to Functions.

**What to verify in Cloudflare Pages → Settings → Functions → Bindings:**

| Binding type | Variable name | Resource |
|---|---|---|
| D1 database | `DB` | `yes_enterprises_db` |
| R2 bucket | `PRODUCT_BUCKET` | `yes-enterprises-public-images` |

**Expected result:** Both bindings are listed; the Pages Functions can access `env.DB` and `env.PRODUCT_BUCKET`

> [!NOTE]
> Bindings are configured in `wrangler.jsonc` and also shown in the Pages dashboard. If using the dashboard (not `wrangler deploy`), set them manually in Settings → Functions → Bindings.

---

### Step 12 — Verify the Build Locally Before Deploying

**Purpose:** Confirm the production build succeeds before triggering a live deployment.

**What to do:**
```bash
# Use Node.js 22
node --version   # should show v22.x.x

npm ci
npm run build
```

**Expected result:** `dist/` directory is created with no build errors  
**Common mistake:** Running the build with a different Node.js version than the Pages build environment (`NODE_VERSION=22`)

---

### Step 13 — Deploy to Cloudflare Pages

**Purpose:** Trigger the first production deployment.

**What to do (via GitHub):**
1. Push all code changes (including updated `wrangler.jsonc` with the real `database_id`) to the `main` branch
2. Cloudflare Pages automatically detects the push and starts a build
3. Monitor the build in the Pages dashboard

**What to do (via Wrangler direct deploy):**
```bash
npm run build
wrangler pages deploy dist --project-name=yes-enterprises
```

**Expected result:** Deployment completes; the site is live at `https://yesenterprises.net.in`

---

### Step 14 — Verify Production Functionality

**Purpose:** Confirm all critical paths work after the first deployment. Tests are grouped by security layer to make failures diagnosable.

#### Layer 1 — Cloudflare Access authentication

| Test | Expected result |
|---|---|
| Visit `https://yesenterprises.net.in/admin` without being signed in | Cloudflare Access login page appears (not the admin SPA) |
| Sign in with a permitted administrator email through Access | Admin SPA loads; `CF_Authorization` cookie is set for the domain |
| Attempt to sign in with an email **not** in the Access policy | Access blocks login; admin SPA never loads |

#### Layer 2 — Backend server-side authorization (`/api/admin/*`)

The backend independently verifies the JWT on every `/api/admin/*` request. Access coverage of `/admin` does not automatically protect these API routes.

| Test | Method | Expected result |
|---|---|---|
| `GET /api/admin/session` with no cookies or headers | Anonymous | HTTP 401 — `UNAUTHENTICATED` |
| `GET /api/admin/session` with the `CF_Authorization` cookie of a signed-in admin | Authenticated + authorized | HTTP 200 — returns `email`, `auth_type: "cloudflare_access"` |
| `POST /api/admin/products` with no credentials | Anonymous | HTTP 401 |
| `GET /api/admin/session` with a valid Access JWT for an email that is **not** in `ADMIN_EMAILS` | Authenticated but not authorized | HTTP 403 — `FORBIDDEN` |
| `GET /api/admin/session` with an expired or forged JWT | Invalid token | HTTP 401 — `EXPIRED_TOKEN` or `INVALID_SIGNATURE` |

> [!IMPORTANT]
> The test for an email not in `ADMIN_EMAILS` is critical. It verifies that the two-layer model works: a person can pass Cloudflare Access (layer 1) but be denied by the backend allowlist (layer 2).

#### Layer 3 — Public image access (`/uploads/`)

| Test | Expected result |
|---|---|
| `GET /uploads/products/<uuid>.<ext>` for an image belonging to an `active` product | HTTP 200 — image served with `Cache-Control: public, max-age=31536000, immutable` |
| `GET /uploads/products/<uuid>.<ext>` for an image belonging to a `draft` or `archived` product, without admin credentials | HTTP 404 (existence not disclosed) |
| `GET /uploads/products/<uuid>.<ext>` for a draft product image, with valid admin JWT cookie | HTTP 200 — image served with `Cache-Control: private, no-cache, no-store, must-revalidate` |
| `GET /uploads/products/nonexistent.jpg` | HTTP 404 |
| `GET /uploads/anything-not-starting-with-products/` | HTTP 404 |

#### Layer 4 — R2 direct upload (CORS)

| Test | Expected result |
|---|---|
| Admin initiates a product image upload from `https://yesenterprises.net.in` | Browser sends OPTIONS preflight to R2 → R2 returns CORS headers → XHR PUT succeeds |
| Admin initiates a product image upload from an origin not in the CORS allowlist | R2 rejects with CORS error; upload fails |
| Public visitor views a product image on the storefront | Image loads from `/uploads/` Pages Function (no CORS involved — same domain) |

---

### Step 15 — Configure Custom Domain

**Purpose:** Point the purchased domain to the Cloudflare Pages deployment.

**What to do:**
1. In the Pages project → **Custom domains** → **Set up a custom domain**
2. Enter the domain and follow the DNS configuration instructions
3. Cloudflare automatically provisions a TLS certificate

**Expected result:** Site is accessible at `https://yesenterprises.net.in` (and `https://www.yesenterprises.net.in`) with a valid TLS certificate

---

### Step 16 — Multi-Admin Configuration

**Purpose:** Confirm that all authorized administrators can log in and that the access control is correctly scoped.

**Two-layer authentication model:**

```
Layer 1 — Cloudflare Access (identity verification)
  └─ Controls who can reach the /admin login page
  └─ Each admin authenticates independently
  └─ Configured in: Zero Trust → Access → Applications → Policy

Layer 2 — Server-side ADMIN_EMAILS (authorization)
  └─ Controls which authenticated identities can call admin APIs
  └─ Checked on every admin API request (not just login)
  └─ Configured in: Pages environment variable ADMIN_EMAILS
```

**To add an administrator:**
1. Add the email to the Cloudflare Access application policy
2. Add the email to the `ADMIN_EMAILS` environment variable (comma-separated)
3. Redeploy (or trigger an environment variable save — Pages Functions pick up env changes on next deployment)

**To remove an administrator:**
1. Remove the email from the Cloudflare Access policy
2. Remove the email from the `ADMIN_EMAILS` environment variable
3. Redeploy

**Example `ADMIN_EMAILS` value (placeholder addresses):**
```
admin-one@example.com,admin-two@example.com,admin-three@example.com
```

No shared passwords. No shared sessions. Each administrator authenticates independently through Cloudflare Access.

---

### Step 17 — Scheduled Cleanup (Future Optional Work)

**Purpose:** The database has a cleanup mechanism for abandoned upload sessions (`cleanup_claims` table). The current implementation is an HTTP endpoint:

```
POST /api/admin/uploads/cleanup
```

**Current state:** This endpoint exists and can be called manually or by an external scheduler.

**Cloudflare Cron Trigger limitation:**  
A Cloudflare Cron Trigger invokes a Worker's `scheduled()` handler. It **cannot** directly invoke a Cloudflare Pages HTTP endpoint. Pages Functions do not expose a `scheduled()` handler.

**Future approach (optional — not a deployment blocker):**  
A separate lightweight Cloudflare Worker could be deployed alongside the Pages project. The Worker would implement the `scheduled()` handler and either:
- Share the cleanup logic via a module import, or
- Make a securely authenticated HTTP request to the Pages cleanup endpoint

This is **not required** for initial deployment. Abandoned upload sessions do not cause data corruption — they are time-limited and cleaned up during subsequent upload flows. Manual invocation of the cleanup endpoint is sufficient for initial operation.

---

### Step 18 — Rollback Procedure

**Purpose:** If a deployment causes a critical regression, roll back to the previous working deployment.

**Pages rollback:**
1. In the Pages dashboard → **Deployments**
2. Find the last known-good deployment
3. Click **Rollback to this deployment**

Cloudflare Pages retains all past deployments. Rollback is instant and does not require a rebuild.

**D1 rollback:**  
D1 does not support automatic rollback of migrations. If a migration must be undone:
1. Export the database before applying any migration: `wrangler d1 export yes_enterprises_db --remote --output pre_migration_backup.sql`
2. Apply the migration
3. If rollback is needed: recreate the database from the export (destructive — requires downtime)

> [!CAUTION]
> Always export the D1 database before applying any new migration to production. Keep the export file offline.

---

### Step 19 — Backup and Recovery

**Purpose:** Establish ongoing backups to allow recovery from accidental data deletion or deployment failures.

#### D1 Database Backup

```bash
# Export full database SQL dump
wrangler d1 export yes_enterprises_db --remote --output backups/d1_backup_YYYYMMDD.sql
```

Verify the database export:
```bash
# Count table creation statements in the dump
grep -c "^CREATE TABLE" backups/d1_backup_YYYYMMDD.sql
# Must show 8 (the number of tables in the active schema: categories, products,
# product_variants, product_images, pending_uploads, cleanup_claims, inventory_logs, site_settings)
```

You can also inspect table integrity by loading the dump into an ephemeral local SQLite database:
```bash
sqlite3 temp_verify.db < backups/d1_backup_YYYYMMDD.sql
sqlite3 temp_verify.db "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
# Must return 8
rm temp_verify.db
```

#### R2 Image Backup

`wrangler r2 object get` downloads only a **single named object** — it cannot perform a bucket-wide backup. Use an S3-compatible tool such as `rclone` for complete bucket mirroring:

```bash
# Configure rclone with Cloudflare R2 (S3-compatible)
# Example rclone.conf entry:
# [cf-r2]
# type = s3
# provider = Cloudflare
# access_key_id = <R2_ACCESS_KEY_ID>
# secret_access_key = <R2_SECRET_ACCESS_KEY>
# endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# Mirror the entire bucket to a local directory, preserving object key hierarchy (e.g. products/<uuid>.<ext>)
rclone sync cf-r2:yes-enterprises-public-images backups/r2_YYYYMMDD/ --progress

# Count remote objects
rclone size cf-r2:yes-enterprises-public-images

# Count local objects RECURSIVELY across nested directories
# Cross-platform via rclone:
rclone size backups/r2_YYYYMMDD/

# Or via OS shell:
# Linux/macOS:
find backups/r2_YYYYMMDD/ -type f | wc -l
# Windows PowerShell:
(Get-ChildItem -Path backups\r2_YYYYMMDD -Recurse -File).Count
```

> [!WARNING]
> Do NOT use flat `ls` or `dir` on the backup directory. R2 keys use path prefixes like `products/7d9e...jpg`. A flat directory listing will only show top-level directory names (e.g. `products`), missing all nested files and reporting an incorrect object count.

#### Backup Consistency Verification

Both backups must be captured within the same maintenance window to prevent race conditions from live uploads.

A backup is NOT verified merely because download commands finished with exit code 0. You must verify that:
1. Every active `image_key` in the D1 `product_images` table exists in the local R2 backup.
2. The byte size of each backed-up object matches `file_size_bytes` recorded in D1.
3. Any extra objects in R2 are audited (e.g. orphaned files from abandoned sessions).

##### CLI-Based Verification Method

```bash
# 1. Extract sorted image keys from remote D1
wrangler d1 execute yes_enterprises_db --remote \
  --command "SELECT image_key FROM product_images ORDER BY image_key;" \
  --json | jq -r '.[0].results[].image_key' | sort > d1_keys.txt

# 2. Extract sorted relative file paths from local R2 backup (preserving products/ prefix)
rclone lsf --recursive --files-only backups/r2_YYYYMMDD/ | sort > r2_local_keys.txt

# 3. Check for missing images (in DB but missing in R2 backup — CRITICAL DATA LOSS RISK)
comm -23 d1_keys.txt r2_local_keys.txt > missing_in_r2.txt
if [ -s missing_in_r2.txt ]; then
  echo "CRITICAL: The following keys exist in D1 but are missing from R2 backup:"
  cat missing_in_r2.txt
else
  echo "SUCCESS: All D1 image keys exist in the R2 backup."
fi

# 4. Check for orphaned images (in R2 backup but not referenced in D1)
comm -13 d1_keys.txt r2_local_keys.txt > orphans_in_r2.txt
if [ -s orphans_in_r2.txt ]; then
  echo "NOTICE: The following R2 objects are not referenced in product_images:"
  cat orphans_in_r2.txt
fi
```

##### Proposed Automated Verification Script (Design Only — Not Implemented)

For production automation, an automated verification script (e.g., `scripts/verify-backup.mjs`) should be considered as a future operational enhancement:
- **Inputs:** Path to D1 SQL dump (or D1 live binding) and path to local R2 backup directory.
- **Workflow:**
  1. Load D1 SQL dump into in-memory SQLite (`better-sqlite3` or ephemeral D1 local session).
  2. Query `SELECT id, product_id, image_key, file_size_bytes FROM product_images`.
  3. Traverse the backup directory recursively, recording file paths and actual disk byte sizes.
  4. Perform bidirectional set difference:
     - `missing_objects = db_keys - backup_keys` (Alert if count > 0).
     - `orphaned_objects = backup_keys - db_keys` (Log warning).
     - `corrupted_sizes = items where disk_bytes !== file_size_bytes` (Alert if count > 0).
  5. Output a structured JSON summary report and exit with code 1 if any missing or corrupted objects are detected.
*(Note: Do not create this script now; it is documented as a recommended production enhancement.)*

#### Backup Storage & Retention

- Compress and encrypt backup directories:
  ```bash
  tar -czf - backups/YYYYMMDD | gpg --symmetric --cipher-algo AES256 -o backups_YYYYMMDD.tar.gz.gpg
  ```
- Store the encrypted archive in at least one independent location outside Cloudflare (e.g. secure local cold storage or secondary cloud provider).
- Retain daily backups for 7 days, weekly backups for 4 weeks, and monthly backups for 12 months.
- Test full restoration quarterly on a staging or local environment.

#### Recovery from Backup

1. **Pages deployment failure:** Use Cloudflare Pages instant rollback (Step 18). No database or storage changes required.
2. **Accidental database deletion or corruption (D1):**
   ```bash
   # Recreate schema and restore data from SQL dump
   wrangler d1 execute yes_enterprises_db --remote --file=backups/d1_backup_YYYYMMDD.sql
   ```
3. **Accidental image deletion or corruption (R2):**
   ```bash
   # Restore specific missing object or whole prefix from backup
   rclone copy backups/r2_YYYYMMDD/products/target-image.jpg cf-r2:yes-enterprises-public-images/products/
   ```
4. **Complete disaster recovery (both D1 and R2 lost):**
   - Provision fresh D1 database and R2 bucket via Steps 4 and 6.
   - Update `wrangler.jsonc` with the new D1 `database_id`.
   - Restore D1 from SQL dump.
   - Restore R2 from local mirrored directory via `rclone sync backups/r2_YYYYMMDD/ cf-r2:yes-enterprises-public-images/`.
   - Trigger Cloudflare Pages redeployment.

---

## Cost and Free-Plan Compatibility

**Expected usage scenario:** 1,000–2,000 annual visitors, ~100 WhatsApp enquiries, 25–100 new product images per year.

| Service | Free tier limit | Expected usage | Risk |
|---|---|---|---|
| Cloudflare Pages | 500 builds/month, unlimited requests | <10 builds/month | ✅ Well within free tier |
| D1 | 5M row reads/day, 100K row writes/day, 5 GB storage | <1,000 reads/day | ✅ Well within free tier |
| R2 | 10 GB storage, 1M Class A ops/month, 10M Class B ops/month | <1 GB storage, <1,000 ops/month | ✅ Well within free tier |
| Cloudflare Access | 50 seats free (Zero Trust) | 2–5 admin seats | ✅ Within free tier |
| Workers (if cleanup Worker added) | 100,000 requests/day free | <30 invocations/day | ✅ Within free tier |
| Domain | Varies by registrar and TLD | 1 domain | ₹700–₹1,200/year (verify at purchase time) |

**Total estimated cost:** Domain registration only. All Cloudflare services are within the free tier for this usage level.

> [!NOTE]
> Free tier limits and pricing are subject to change. Verify current limits at https://developers.cloudflare.com/workers/platform/pricing/ and https://developers.cloudflare.com/d1/platform/limits/ before making budget commitments.

---

## Domain Configuration & Codebase Updates (Phase 5.1.1 Status)

The official production domain `yesenterprises.net.in` is confirmed and active on Cloudflare nameservers. The following local updates have been completed:

| File | Lines / Area | Updated Value | Status |
|---|---|---|---|
| `functions/_shared/auth.js` | 328–333 | CSRF allowed origins: `yesenterprises.net.in`, `www.yesenterprises.net.in`, `yes-enterprises.pages.dev`, `*.yes-enterprises.pages.dev`, `localhost`, `127.0.0.1` | ✅ Updated |
| `functions/_shared/auth.js` | 260 | Dev bypass fallback email: `admin@yesenterprises.net.in` | ✅ Updated |
| `src/config/site.config.js` | `siteUrl` field | `'https://yesenterprises.net.in'` | ✅ Updated |
| `package.json` | Dependencies & Engines | `aws4fetch` moved to `dependencies`; added `"engines": { "node": ">=22.0.0" }` | ✅ Updated |
| `wrangler.jsonc` | Comments | Preserved D1 and R2 bindings; documented `local-d1-yes-enterprises-db` placeholder | ✅ Updated |
| `.dev.vars.example` | Template | Updated to `admin@yesenterprises.net.in` and `https://images.yesenterprises.net.in` | ✅ Updated |

**Dashboard configuration required upon remote setup (Phase 5.2):**

| Configuration | Location | Target Production Value | Status |
|---|---|---|---|
| R2 CORS AllowedOrigins | Cloudflare dashboard / wrangler command | `["https://yesenterprises.net.in", "https://www.yesenterprises.net.in", "https://yes-enterprises.pages.dev"]` | Pending remote bucket creation |
| Cloudflare Access hostname | Zero Trust dashboard | `yesenterprises.net.in/admin` | Pending Cloudflare account |
| `CF_ACCESS_AUD` | Pages environment variable | Audience tag from Access application | Pending Access app creation |
| Pages custom domain | Pages dashboard | `yesenterprises.net.in` and `www.yesenterprises.net.in` | Pending Pages deployment |

---

## AdminSettings Limitation

`src/pages/admin/AdminSettings.jsx` is a **read-only configuration viewer**. All form fields use `readOnly` and `cursor-not-allowed` styling. The component reads from `src/config/site.config.js` at build time — it does not make any API calls and cannot save changes.

The `site_settings` database table exists in the D1 schema but no backend API write routes for settings have been implemented. Initial site settings must be configured via an approved SQL migration or a `wrangler d1 execute` command. Do not attempt to configure initial settings through the admin dashboard.

---

## Phase 5.2 Readiness

**Prerequisites completed in Phase 5.1.1:**
- [x] Domain selected and purchased: `yesenterprises.net.in`
- [x] Cloudflare nameservers active for `yesenterprises.net.in`
- [x] CSRF allowlist updated in `auth.js` with apex, www, pages.dev, and local origins
- [x] Production site URL configured in `site.config.js`
- [x] `aws4fetch` moved from `devDependencies` to runtime `dependencies`
- [x] Node.js engine requirement (`>=22.0.0`) added to `package.json`
- [x] `wrangler.jsonc` bindings verified and placeholder documented

**Remaining manual prerequisites before Phase 5.2 live execution:**
1. **Cloudflare Account ID** — to be created and recorded
2. **D1 `database_id`** — placeholder `local-d1-yes-enterprises-db` to be replaced after `wrangler d1 create yes_enterprises_db`
3. **`CF_ACCESS_AUD`** — audience tag to be obtained after creating Access application for `yesenterprises.net.in/admin`
4. **R2 API credentials** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` tokens to be created
5. **`ADMIN_EMAILS`** — final production administrator email list to be provided
6. **`site.config.js` business details** — business email, public contact address, and business hours to be confirmed by business owners
