/**
 * Standardized JSON responses and HTTP headers for Cloudflare Pages Functions.
 */

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

/**
 * Creates a standard JSON success response.
 *
 * @param {any} data - The payload to send under the `data` field or root.
 * @param {number} status - HTTP status code (default 200).
 * @param {Record<string, string>} headers - Additional response headers.
 * @returns {Response}
 */
export function jsonResponse(data, status = 200, headers = {}) {
  const body = JSON.stringify(data);
  return new Response(body, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      ...headers
    }
  });
}

/**
 * Creates a standardized error response.
 * Prevents internal details, stack traces, and database internals from leaking to clients.
 *
 * @param {string} message - Client-safe error message.
 * @param {number} status - HTTP status code.
 * @param {string} code - Machine-readable error code (e.g., 'BAD_REQUEST', 'NOT_FOUND').
 * @param {any} [details=null] - Optional non-sensitive detail object.
 * @param {Record<string, string>} [headers={}] - Optional additional headers.
 * @returns {Response}
 */
export function errorResponse(message, status = 400, code = 'BAD_REQUEST', details = null, headers = {}) {
  const payload = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      ...noCacheHeaders(),
      ...headers
    }
  });
}

/**
 * Cache headers for public, read-mostly catalogue data.
 *
 * @param {number} maxAgeSeconds - Browser cache duration.
 * @param {number} sMaxAgeSeconds - Cloudflare Edge cache duration.
 * @returns {Record<string, string>}
 */
export function publicCacheHeaders(maxAgeSeconds = 60, sMaxAgeSeconds = 300) {
  return {
    'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=60`
  };
}

/**
 * Strict no-cache headers for authenticated admin routes and sensitive responses.
 *
 * @returns {Record<string, string>}
 */
export function noCacheHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

