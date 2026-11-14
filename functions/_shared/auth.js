/**
 * Cloudflare Access JWT validation middleware and development bypass.
 *
 * Implements server-side cryptographic verification (RS256) of Cloudflare Access
 * JWTs, claims validation (iss, aud, exp, nbf), admin email allowlist enforcement,
 * and a strictly scoped 4-condition local development bypass.
 */

// In-memory JWKS cache: { keys: JWK[], expiresAt: number, teamDomain: string }
let jwksCache = null;
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Base64URL decode helper using standard Web APIs.
 *
 * @param {string} str - Base64URL string.
 * @returns {string}
 */
export function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Parses JWT header and payload without verifying signature.
 *
 * @param {string} token - Raw JWT string.
 * @returns {{ header: any, payload: any, signature: string } | null}
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
}

/**
 * Fetches and caches the Cloudflare Access public certificates (JWKS).
 *
 * @param {string} teamDomain - Cloudflare Access team name or team domain.
 * @param {typeof fetch} [fetchFn=fetch] - Fetch function.
 * @param {boolean} [forceRefresh=false] - Bypass cache and refresh JWKS immediately.
 * @returns {Promise<any[]>} Array of JWK public keys.
 */
export async function getAccessCerts(teamDomain, fetchFn = fetch, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now && jwksCache.teamDomain === teamDomain) {
    return jwksCache.keys;
  }

  const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetchFn(certsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Cloudflare Access certificates from ${certsUrl} (HTTP ${response.status})`);
  }

  const data = await response.json();
  const keys = data?.keys || [];
  jwksCache = {
    teamDomain,
    keys,
    expiresAt: now + JWKS_CACHE_TTL_MS
  };
  return keys;
}

/**
 * Converts a Base64URL signature string into a Uint8Array.
 *
 * @param {string} base64UrlStr
 * @returns {Uint8Array}
 */
function base64UrlToUint8Array(base64UrlStr) {
  const binaryString = base64UrlDecode(base64UrlStr);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Cryptographically verifies an RS256 Cloudflare Access JWT.
 * Fails closed if teamDomain or expectedAud is not configured.
 *
 * @param {string} token - Raw JWT token.
 * @param {Record<string, any>} env - Cloudflare environment variables.
 * @param {typeof fetch} [fetchFn=fetch] - Fetch function.
 * @returns {Promise<{ valid: boolean, payload?: any, error?: string, code?: string }>}
 */
export async function verifyAccessJwt(token, env, fetchFn = fetch) {
  const teamDomain = env?.CF_ACCESS_TEAM_NAME;
  if (!teamDomain) {
    return {
      valid: false,
      code: 'CONFIGURATION_ERROR',
      error: 'Cloudflare Access team name (CF_ACCESS_TEAM_NAME) is not configured. Failing closed.'
    };
  }

  const expectedAud = env?.CF_ACCESS_AUD;
  if (!expectedAud) {
    return {
      valid: false,
      code: 'CONFIGURATION_ERROR',
      error: 'Cloudflare Access audience (CF_ACCESS_AUD) is not configured. Failing closed.'
    };
  }

  const parsed = parseJwt(token);
  if (!parsed) {
    return { valid: false, code: 'INVALID_TOKEN', error: 'Malformed Cloudflare Access token format.' };
  }

  const { header, payload } = parsed;

  // 1. Strict Algorithm Check: ONLY RS256 is accepted
  if (header.alg !== 'RS256') {
    return { valid: false, code: 'INVALID_ALGORITHM', error: `Unsupported JWT algorithm: ${header.alg}. Expected RS256.` };
  }

  if (!header.kid) {
    return { valid: false, code: 'INVALID_TOKEN', error: 'Missing key ID (kid) in token header.' };
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // 2. Expiration Check
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    return { valid: false, code: 'EXPIRED_TOKEN', error: 'Cloudflare Access token has expired.' };
  }

  // 3. Not-Before Check
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec) {
    return { valid: false, code: 'INVALID_TOKEN', error: 'Cloudflare Access token is not yet valid.' };
  }

  // 4. Strict Issuer Check
  const expectedIssuer = `https://${teamDomain}.cloudflareaccess.com`;
  if (payload.iss !== expectedIssuer) {
    return { valid: false, code: 'INVALID_ISSUER', error: `Invalid token issuer: ${payload.iss}. Expected ${expectedIssuer}.` };
  }

  // 5. Strict Audience Check
  const tokenAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!tokenAud.includes(expectedAud)) {
    return { valid: false, code: 'INVALID_AUDIENCE', error: 'Invalid token audience.' };
  }

  // 6. Cryptographic Signature Verification using Web Crypto API
  try {
    let keys = await getAccessCerts(teamDomain, fetchFn, false);
    let matchingKey = keys.find(k => k.kid === header.kid);

    // If key not found in cache, force fresh refresh once to support key rotation
    if (!matchingKey) {
      keys = await getAccessCerts(teamDomain, fetchFn, true);
      matchingKey = keys.find(k => k.kid === header.kid);
    }

    if (!matchingKey) {
      return { valid: false, code: 'KEY_NOT_FOUND', error: `No certificate found matching key ID: ${header.kid}.` };
    }

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      matchingKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const parts = token.split('.');
    const dataToVerify = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signatureBytes = base64UrlToUint8Array(parts[2]);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      dataToVerify
    );

    if (!isValid) {
      return { valid: false, code: 'INVALID_SIGNATURE', error: 'Cloudflare Access cryptographic signature verification failed.' };
    }
  } catch (cryptoErr) {
    return { valid: false, code: 'VERIFICATION_ERROR', error: `Cryptographic verification failed: ${cryptoErr.message}` };
  }

  return { valid: true, payload };
}

/**
 * Checks if the request qualifies for the secure local development bypass.
 * Requires all four conditions simultaneously:
 * 1. env.ENVIRONMENT === 'development'
 * 2. Host is localhost / 127.0.0.1
 * 3. Request header 'x-dev-admin-bypass: true'
 * 4. env.ENABLE_DEV_ADMIN_BYPASS === 'true'
 *
 * @param {Request} request
 * @param {Record<string, any>} env
 * @returns {boolean}
 */
export function isLocalDevBypassPermitted(request, env) {
  // Condition 1: Server environment must be development
  if (env?.ENVIRONMENT !== 'development') {
    return false;
  }

  // Condition 2: Server configuration must explicitly enable dev bypass
  if (env?.ENABLE_DEV_ADMIN_BYPASS !== 'true') {
    return false;
  }

  // Condition 3: Request host must be localhost or 127.0.0.1
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const hostHeader = (request.headers.get('host') || '').toLowerCase().split(':')[0];

  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isLocalHostHeader = hostHeader === 'localhost' || hostHeader === '127.0.0.1';

  if (!isLocalHost && !isLocalHostHeader) {
    return false;
  }

  // Condition 4: Explicit request bypass header must be present
  const bypassHeader = request.headers.get('x-dev-admin-bypass');
  if (bypassHeader !== 'true') {
    return false;
  }

  return true;
}

/**
 * Validates admin authentication for an incoming Pages Functions request.
 *
 * @param {EventContext<any, any, any>} context - Pages Functions context.
 * @param {typeof fetch} [fetchFn=fetch] - Fetch function for test injection.
 * @returns {Promise<{ ok: true, user: { email: string, name: string, auth_type: string, verified_at: string } } | { ok: false, status: number, code: string, message: string }>}
 */
export async function validateAdminSession(context, fetchFn = fetch) {
  const { request, env } = context;

  // 1. Check development bypass safety
  if (isLocalDevBypassPermitted(request, env)) {
    const devEmail = env?.DEV_BYPASS_EMAIL || 'admin@yesenterprises.net.in';
    
    // Enforce allowlist in dev bypass
    const allowlist = (env?.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowlist.length === 0 || !allowlist.includes(devEmail.toLowerCase())) {
      return {
        ok: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Dev bypass email is not permitted by ADMIN_EMAILS allowlist.'
      };
    }

    return {
      ok: true,
      user: {
        email: devEmail,
        name: 'Local Admin (Dev Bypass)',
        auth_type: 'development_bypass',
        verified_at: new Date().toISOString()
      }
    };
  }

  // 2. Extract Cloudflare Access token from header or cookie
  // Prefer the official signed assertion header injected by Cloudflare Access at the edge
  let token = request.headers.get('cf-access-jwt-assertion') || request.headers.get('CF_Authorization');
  let isCookieAuth = false;

  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/CF_Authorization=([^;]+)/);
    if (match) {
      token = match[1].trim();
      isCookieAuth = true;
    }
  } else {
    token = token.trim();
  }

  if (!token) {
    return {
      ok: false,
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Missing Cloudflare Access authorization credentials.'
    };
  }

  // 2a. CSRF Protection for Cookie-Based Authentication on State-Changing Requests
  const method = (request.method || 'GET').toUpperCase();
  if (isCookieAuth && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const secFetchSite = request.headers.get('sec-fetch-site');
    if (secFetchSite && secFetchSite === 'cross-site') {
      return {
        ok: false,
        status: 403,
        code: 'CSRF_REJECTED',
        message: 'Cross-site request blocked by CSRF protection.'
      };
    }

    const origin = request.headers.get('origin');
    if (!origin) {
      return {
        ok: false,
        status: 403,
        code: 'CSRF_REJECTED',
        message: 'Missing Origin header on cookie-authenticated write request.'
      };
    }

    try {
      const originUrl = new URL(origin);
      const host = originUrl.hostname.toLowerCase();
      const isAllowedOrigin =
        host === 'yesenterprises.net.in' ||
        host === 'www.yesenterprises.net.in' ||
        host === 'yes-enterprises.pages.dev' ||
        host.endsWith('.yes-enterprises.pages.dev') ||
        host === 'localhost' ||
        host === '127.0.0.1';

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
  }

  // 3. Cryptographically verify JWT and validate claims (fails closed if misconfigured)
  const verification = await verifyAccessJwt(token, env, fetchFn);
  if (!verification.valid) {
    return {
      ok: false,
      status: 401,
      code: verification.code || 'UNAUTHENTICATED',
      message: verification.error || 'Invalid Cloudflare Access credentials.'
    };
  }

  const { payload } = verification;
  const userEmail = (payload.email || payload.sub || '').trim();

  if (!userEmail) {
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Cloudflare Access token does not contain a valid email identity.'
    };
  }

  // 4. Enforce Admin Email Allowlist (fails closed if allowlist is empty or user is missing)
  const allowlist = (env?.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0 || !allowlist.includes(userEmail.toLowerCase())) {
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Authenticated identity is not authorized for administrative access.'
    };
  }

  return {
    ok: true,
    user: {
      email: userEmail,
      name: payload.name || userEmail,
      auth_type: 'cloudflare_access',
      verified_at: new Date().toISOString()
    }
  };
}
