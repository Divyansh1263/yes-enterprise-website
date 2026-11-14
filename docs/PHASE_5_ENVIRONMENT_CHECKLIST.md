# YES ENTERPRISES — Phase 5 Environment Variable Checklist

**Version:** 5.1.4  
**Status:** Pre-deployment reference — Domain confirmed (`yesenterprises.net.in`), configuration ready  
**Last updated:** 2026-11-14

> [!IMPORTANT]
> This checklist documents every environment variable and binding referenced by the project. The production domain `yesenterprises.net.in` is registered and active on Cloudflare nameservers. Local codebase updates have been prepared. All remaining `TO_BE_CONFIGURED` values must be supplied before deploying to production. Never commit real secret values to source control.

---

## Summary Table

| Variable | Purpose | Required for production | Secret? | Domain-dependent? | Source |
|---|---|---|---|---|---|
| `NODE_VERSION` | Cloudflare Pages build Node.js version | ✅ Yes | No | No | Pages build env (`22`) |
| `ENVIRONMENT` | Runtime environment flag | ✅ Yes | No | No | Pages runtime env (`production`) |
| `CF_ACCESS_TEAM_NAME` | Cloudflare Access Zero Trust team name | ✅ Yes | No | No | Pages runtime env |
| `CF_ACCESS_AUD` | Cloudflare Access audience tag (JWT verification) | ✅ Yes | ✅ Yes | ✅ Yes | Pages runtime env (secret) |
| `ADMIN_EMAILS` | Comma-separated admin email allowlist | ✅ Yes | ✅ Yes | No | Pages runtime env (secret) |
| `R2_ACCOUNT_ID` | Cloudflare account ID for R2 S3 API | ✅ Yes | ✅ Yes | No | Pages runtime env (secret) |
| `R2_ACCESS_KEY_ID` | R2 API token key ID | ✅ Yes | ✅ Yes | No | Pages runtime env (secret) |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret | ✅ Yes | ✅ Yes | No | Pages runtime env (secret) |
| `R2_BUCKET_NAME` | R2 bucket name | ✅ Yes | No | No | Pages runtime env (`yes-enterprises-public-images`) |
| `R2_PUBLIC_URL` | Future CDN URL | ❌ Inactive / Unused | No | No | **Do not set.** Images served via `/uploads/` Pages Function from private R2 bucket |
| `ENABLE_DEV_ADMIN_BYPASS` | Development-only bypass flag | ❌ Never in production | No | No | `.dev.vars` only (`false` in prod) |
| `DEV_BYPASS_EMAIL` | Development-only bypass email | ❌ Never in production | No | No | `.dev.vars` only |
| `DB` (binding) | D1 database binding | ✅ Yes | — | No | `wrangler.jsonc` / Pages binding |
| `PRODUCT_BUCKET` (binding) | R2 bucket binding | ✅ Yes | — | No | `wrangler.jsonc` / Pages binding |

---

## Section 1 — Pages Build Environment Variables

Set these in: **Cloudflare Pages → Settings → Environment variables → Build** tab

| Variable | Value | Notes |
|---|---|---|
| `NODE_VERSION` | `22` | **Mandatory.** Cloudflare Pages does **not** read `package.json`'s `engines` field when launching build containers. You must explicitly configure `NODE_VERSION=22` in the Build environment variables so Pages runs Vite 6 on Node.js 22. |

---

## Section 2 — Pages Runtime Environment Variables (Production)

Set these in: **Cloudflare Pages → Settings → Environment variables → Production** tab

### Non-secret (plaintext)

| Variable | Current `.dev.vars` value | Production value | Notes |
|---|---|---|---|
| `ENVIRONMENT` | `development` | `production` | Used by `auth.js` to block the dev bypass. Must be `production` in production. |
| `CF_ACCESS_TEAM_NAME` | `yes-enterprises` | `TO_BE_CONFIGURED` | Your Cloudflare Zero Trust organization subdomain. Available after account setup. |
| `R2_BUCKET_NAME` | `yes-enterprises-public-images` | `yes-enterprises-public-images` | Fixed — matches the R2 bucket name. |

> [!NOTE]
> **R2_PUBLIC_URL & Subdomain Clarification:**
> `R2_PUBLIC_URL` is **not used** by the project runtime. The application architecture delivers all images through the Pages Function `/uploads/[[key]].js` route from the private R2 bucket (`PRODUCT_BUCKET`).
> - Do **not** set `R2_PUBLIC_URL` in production Pages environment variables.
> - The subdomain `images.yesenterprises.net.in` is **not** needed, configured, or purchased. All images resolve directly via same-origin relative paths (`/uploads/products/...`).
> - The R2 bucket must remain strictly **private**. Do not enable public R2 access.

### Secret (encrypt at rest)

| Variable | Production value | Notes |
|---|---|---|
| `CF_ACCESS_AUD` | `TO_BE_CONFIGURED` | The audience tag from your Cloudflare Access application for `yesenterprises.net.in/admin`. Found in Zero Trust → Access → Applications → Overview. Used to verify JWT signatures server-side on every admin request. |
| `ADMIN_EMAILS` | `TO_BE_CONFIGURED` | Comma-separated list of authorized administrator email addresses (e.g. `admin-one@example.com,admin-two@example.com`). Every address must also appear in the Cloudflare Access application policy. |
| `R2_ACCOUNT_ID` | `TO_BE_CONFIGURED` | Your Cloudflare Account ID. Visible in the right sidebar of the Cloudflare dashboard. Used to construct the R2 S3-compatible endpoint URL. |
| `R2_ACCESS_KEY_ID` | `TO_BE_CONFIGURED` | Generated in Cloudflare dashboard → R2 → Manage R2 API Tokens. Create a token with Object Read & Write permission scoped to `yes-enterprises-public-images`. |
| `R2_SECRET_ACCESS_KEY` | `TO_BE_CONFIGURED` | Generated alongside `R2_ACCESS_KEY_ID`. Shown only once — record it immediately. |

---

## Section 3 — D1 Database Binding

Set in: `wrangler.jsonc` (source-controlled) **and** mirrored in **Pages → Settings → Functions → Bindings**

| Binding variable | Database name | Current `database_id` | Required production value |
|---|---|---|---|
| `DB` | `yes_enterprises_db` | `local-d1-yes-enterprises-db` (**placeholder**) | Real UUID from `wrangler d1 create yes_enterprises_db` |

> [!CAUTION]
> The `database_id` in `wrangler.jsonc` is currently a local development placeholder (`local-d1-yes-enterprises-db`). This **must** be replaced with the real UUID before deploying to production. Deploying with the placeholder will fail or bind to the wrong database.

**Confirmed Schema Tables (8 total):**
Migrations `0001_initial_schema.sql` and `0002_r2_deletion_safety.sql` establish exactly 8 tables:
1. `categories`
2. `products`
3. `product_variants`
4. `product_images`
5. `pending_uploads`
6. `cleanup_claims` (schema upgraded non-destructively in 0002)
7. `inventory_logs`
8. `site_settings` (read-only in current admin UI; initialized via SQL)

**How to get the real database ID:**
```bash
wrangler d1 create yes_enterprises_db
# Output includes: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Then update `wrangler.jsonc`:
```jsonc
"d1_databases": [{
  "binding": "DB",
  "database_name": "yes_enterprises_db",
  "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}]
```

---

## Section 4 — R2 Bucket Binding

Set in: `wrangler.jsonc` (source-controlled) **and** mirrored in **Pages → Settings → Functions → Bindings**

| Binding variable | Bucket name | Access mode | Notes |
|---|---|---|---|
| `PRODUCT_BUCKET` | `yes-enterprises-public-images` | Private (not public) | Images are served through the `/uploads/` Pages Function. Do NOT enable the R2 public URL on this bucket. |

**Current `wrangler.jsonc` R2 configuration (confirmed correct):**
```jsonc
"r2_buckets": [{
  "binding": "PRODUCT_BUCKET",
  "bucket_name": "yes-enterprises-public-images"
}]
```

---

## Section 5 — Cloudflare Access Configuration

Configured in: **Cloudflare Zero Trust dashboard** (not in source code)

| Configuration item | Description | Target Production Value | Notes |
|---|---|---|---|
| Application hostname | The domain/path protected by Access | `yesenterprises.net.in/admin` | Protected administrative entry path |
| Identity provider | How administrators authenticate | `TO_BE_CONFIGURED` | Google, Microsoft, GitHub, or one-time PIN |
| Policy — allowed emails | Which email addresses can reach `/admin` | `TO_BE_CONFIGURED` | Must match every email in `ADMIN_EMAILS` |
| Team name | Zero Trust organization subdomain | `yes-enterprises` (or your org slug) | Record the production team name for `CF_ACCESS_TEAM_NAME` |
| Audience tag (AUD) | JWT audience identifier | `TO_BE_CONFIGURED` | Record from Access application overview for `CF_ACCESS_AUD` |

> [!IMPORTANT]
> **Access Path Coverage & JWT Distribution Model:**
> - Cloudflare Access application hostname is configured for `yesenterprises.net.in/admin` (the administrative frontend SPA entry point). It presents an interactive login barrier for browsers navigating to the admin dashboard.
> - Upon successful login, Cloudflare Access issues an RS256 JWT stored in the domain cookie `CF_Authorization`.
> - The frontend API client (`src/services/api/client.js`) uses `credentials: 'include'`, ensuring that browser requests to `/api/admin/*` and `/uploads/*` automatically carry this `CF_Authorization` cookie.
> - **Backend self-protection:** `/api/admin/*` endpoints and draft/archived `/uploads/*` image routes are NOT covered by the Access edge login wall; they are independently and cryptographically verified server-side on every request by `validateAdminSession()` in `functions/_shared/auth.js`.
> - `/uploads/*` CANNOT and MUST NOT be protected by Cloudflare Access at the edge, because public active product images must remain accessible anonymously. Private images (draft/archived) are guarded internally within `functions/uploads/[[key]].js` using `validateAdminSession()`.

---

## Section 6 — Local Development Variables Only

Set in: `.dev.vars` (never committed to git — excluded by `.gitignore`)

| Variable | Dev value | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | Required for dev bypass to activate |
| `ENABLE_DEV_ADMIN_BYPASS` | `true` | **Never set in production.** Enables a dev-only bypass when ALL four conditions are met simultaneously: `ENVIRONMENT=development`, `ENABLE_DEV_ADMIN_BYPASS=true`, request from localhost/127.0.0.1, and `x-dev-admin-bypass: true` header present. |
| `DEV_BYPASS_EMAIL` | `admin@yesenterprises.net.in` | Injected as the bypass user email in dev mode. Not validated against Access. |
| `CF_ACCESS_TEAM_NAME` | `yes-enterprises` | Dev placeholder — not verified against real Cloudflare Access |
| `CF_ACCESS_AUD` | `local-dev-audience-tag` | Dev placeholder — bypassed in dev mode |
| `R2_ACCOUNT_ID` | `local-account-id` | Dev placeholder |
| `R2_ACCESS_KEY_ID` | `local-access-key` | Dev placeholder |
| `R2_SECRET_ACCESS_KEY` | `local-secret-key-placeholder` | Dev placeholder |
| `R2_BUCKET_NAME` | `yes-enterprises-public-images` | Same as production — matches the binding |
| `R2_PUBLIC_URL` | *(Omitted / Inactive)* | Unused by application runtime — images served via `/uploads/` |

**How the dev bypass works (confirmed secure):**

The dev bypass requires all four conditions to be true simultaneously:

1. `ENVIRONMENT` environment variable equals `development`
2. `ENABLE_DEV_ADMIN_BYPASS` environment variable equals `true`
3. Request host is `localhost` or `127.0.0.1`
4. Request has the header `x-dev-admin-bypass: true`

In production: condition 1 is false (`ENVIRONMENT=production`), condition 2 is unset, and conditions 3–4 cannot be satisfied from an external request. The dev bypass is impossible in production without direct modification of the production environment variables.

---

## Section 7 — Domain Configuration Status (CONFIRMED: `yesenterprises.net.in`)

The official production domain `yesenterprises.net.in` is registered and active on Cloudflare nameservers. Local codebase updates have been completed:

| Item | File / Location | Value in Codebase | Status |
|---|---|---|---|
| CSRF origin allowlist | `functions/_shared/auth.js` lines 328–333 | `yesenterprises.net.in`, `www.yesenterprises.net.in`, `yes-enterprises.pages.dev`, `*.yes-enterprises.pages.dev`, `localhost`, `127.0.0.1` | ✅ Configured |
| Production site URL | `src/config/site.config.js` → `siteUrl` | `'https://yesenterprises.net.in'` | ✅ Configured |
| Runtime dependency | `package.json` → `dependencies` | `"aws4fetch": "^1.0.20"` moved to `dependencies` | ✅ Configured |
| Node engine requirement | `package.json` → `engines` | `"node": ">=22.0.0"` | ✅ Configured |
| Pages build Node version | Pages Build environment variable | `NODE_VERSION=22` (mandatory in Pages dashboard) | Documented |
| Wrangler compatibility date | `wrangler.jsonc` | Retained `"2024-11-01"` (stable D1/R2/WebCrypto/nodejs_compat_v2 runtime) | ✅ Configured |
| Wrangler bindings | `wrangler.jsonc` | Preserved `DB` and `PRODUCT_BUCKET`, documented `database_id` placeholder | ✅ Configured |
| R2 CORS Configuration | Cloudflare dashboard / wrangler command | Target: `AllowedMethods: ["PUT"]`, `AllowedHeaders: ["Content-Type"]`, `AllowedOrigins: ["https://yesenterprises.net.in", "https://www.yesenterprises.net.in", "https://yes-enterprises.pages.dev"]` | Pending remote bucket creation |
| Access application hostname | Cloudflare Zero Trust dashboard | Target: `yesenterprises.net.in/admin` | Pending Cloudflare account |
| CF_ACCESS_AUD env var | Pages production environment | `TO_BE_CONFIGURED` | Record from Access application after creating it |
| Pages custom domain | Pages dashboard | `yesenterprises.net.in` and `www.yesenterprises.net.in` | Configure after Pages deployment |

---

## Section 8 — Package Dependency Status

The `aws4fetch` package is now located in `dependencies` in `package.json` (moved from `devDependencies`). This guarantees that Cloudflare Pages Functions bundling includes `aws4fetch` at runtime for presigned R2 upload URL generation in `functions/_shared/r2.js`.

---

## Section 9 — `.dev.vars.example` Reference

The file `d:\webpage\.dev.vars.example` documents the required local development variables using `admin@yesenterprises.net.in`. Use this as the template when setting up a new development environment. Never copy real production secrets into this file.

**To set up local development:**
```bash
cp .dev.vars.example .dev.vars
# Then fill in .dev.vars with actual development values
```

---

## Unresolved Items Summary

The following items are remaining manual tasks for live Cloudflare deployment (Phase 5.2):

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Production domain name | ✅ RESOLVED | `yesenterprises.net.in` (purchased, nameservers active) |
| 2 | `aws4fetch` moved to dependencies | ✅ RESOLVED | Moved to `dependencies` in `package.json` |
| 3 | Cloudflare Account ID | ⏳ Pending remote setup | Required for R2 API, D1 creation, all dashboard operations |
| 4 | D1 `database_id` | ⏳ Pending remote setup | Placeholder `local-d1-yes-enterprises-db` must be replaced after `wrangler d1 create yes_enterprises_db` |
| 5 | `CF_ACCESS_AUD` | ⏳ Pending remote setup | Available only after creating the Access application for `yesenterprises.net.in/admin` |
| 6 | R2 API credentials | ⏳ Pending remote setup | Available only after creating an R2 API token in Cloudflare dashboard |
| 7 | `ADMIN_EMAILS` production value | ⏳ Pending business confirmation | Real administrator email addresses to be supplied |
| 8 | Business email in `site.config.js` | ⏳ Pending business confirmation | Currently empty string |
| 9 | Business address in `site.config.js` | ⏳ Pending business confirmation | Currently empty string |
| 10 | Business hours in `site.config.js` | ⏳ Pending business confirmation | Currently empty string |
