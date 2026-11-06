/**
 * YES ENTERPRISES — Centralized API Client
 * Handles base URLs, JSON parsing, error standardisation, and dev bypass headers.
 */

const API_BASE = '/api';

/**
 * Checks whether we are running in a production environment.
 * Evaluates:
 * 1. Test override flag: globalThis.__TEST_IS_PROD__
 * 2. Vite build mode: import.meta.env?.PROD
 * 3. Node environment: process.env.NODE_ENV === 'production'
 *
 * @returns {boolean}
 */
export function isProductionMode() {
  if (typeof globalThis !== 'undefined' && typeof globalThis.__TEST_IS_PROD__ === 'boolean') {
    return globalThis.__TEST_IS_PROD__;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.PROD === 'boolean') {
    return import.meta.env.PROD;
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true;
  }
  return false;
}

/**
 * Checks whether the client is currently running in a local development environment.
 * CRITICAL SECURITY INVARIANT:
 * Always returns false in production builds (isProductionMode() === true),
 * ensuring that production traffic can NEVER activate local development bypasses.
 *
 * @returns {boolean}
 */
export function isLocalEnvironment() {
  if (isProductionMode()) {
    return false;
  }

  if (typeof window === 'undefined') {
    if (typeof globalThis !== 'undefined' && typeof globalThis.__TEST_IS_LOCAL__ === 'boolean') {
      return globalThis.__TEST_IS_LOCAL__;
    }
    return false;
  }

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/**
 * Checks whether static fixture fallback is explicitly permitted.
 * CRITICAL SECURITY & ACCURACY INVARIANT:
 * - Always false in production builds.
 * - Live database/API is the sole source of truth in production.
 * - In local development, requires explicit VITE_ENABLE_FIXTURE_FALLBACK === 'true'.
 *
 * @returns {boolean}
 */
export function isFixtureFallbackAllowed() {
  if (isProductionMode()) {
    return false;
  }
  if (!isLocalEnvironment()) {
    return false;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.__TEST_FIXTURE_FALLBACK__ === 'boolean') {
    return globalThis.__TEST_FIXTURE_FALLBACK__;
  }
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_FIXTURE_FALLBACK === 'true';
}

/**
 * Retrieves the local dev bypass toggle state.
 * Strictly disabled on non-localhost origins and in production.
 *
 * @returns {boolean}
 */
export function isDevBypassActive() {
  if (!isLocalEnvironment()) return false;
  try {
    const stored = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('ye_dev_admin_bypass') : null;
    if (stored === null) return true; // Default active on localhost development
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggles or sets the local dev bypass state.
 * @param {boolean} active
 */
export function setDevBypassActive(active) {
  if (!isLocalEnvironment()) return;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ye_dev_admin_bypass', active ? 'true' : 'false');
    }
  } catch {}
}

/**
 * Custom API Error class with status code, code string, and details.
 */
export class ApiError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Standard fetch wrapper for all API requests.
 *
 * @param {string} endpoint - API path relative to `/api` (e.g. `/products` or `/admin/session`)
 * @param {RequestInit & { bypassAuth?: boolean }} [options] - Standard fetch options
 * @returns {Promise<any>} Parsed JSON response body
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Inject development admin bypass header ONLY when strictly running on localhost in dev mode
  if (isLocalEnvironment() && isDevBypassActive() && !options.bypassAuth) {
    headers.set('x-dev-admin-bypass', 'true');
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: options.credentials || 'include' // include cookies for Cloudflare Access CF_Authorization
  };

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr) {
    throw new ApiError('Unable to connect to the server. Please check your internet connection.', 0, 'NETWORK_ERROR', netErr);
  }

  let body;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    const text = await response.text();
    body = { message: text };
  }

  if (!response.ok) {
    const message = body?.error?.message || body?.message || `Request failed with status ${response.status}`;
    const code = body?.error?.code || body?.code || (response.status === 401 ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');
    throw new ApiError(message, response.status, code, body);
  }

  return body;
}
