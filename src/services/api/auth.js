/**
 * YES ENTERPRISES — Authentication API Service
 * Interacts with /api/admin/session and manages Cloudflare Access session verification.
 */

import { apiFetch, setDevBypassActive, isLocalEnvironment } from './client.js';

/**
 * Validates the current admin session with the backend.
 * @returns {Promise<{ ok: boolean, user?: any, error?: string, status?: number }>}
 */
export async function getAdminSession() {
  try {
    const res = await apiFetch('/admin/session');
    return {
      ok: true,
      user: res.data || res.user || res
    };
  } catch (err) {
    return {
      ok: false,
      status: err.status,
      code: err.code,
      error: err.message
    };
  }
}

/**
 * Logs in using local development bypass (available only on localhost).
 */
export async function loginWithDevBypass() {
  if (!isLocalEnvironment()) {
    throw new Error('Development bypass is strictly disabled on non-localhost origins.');
  }
  setDevBypassActive(true);
  return getAdminSession();
}

/**
 * Ends the active session.
 */
export async function signOutAdmin() {
  setDevBypassActive(false);
  // In production with Cloudflare Access, visiting /cdn-cgi/access/logout clears the CF_Authorization cookie
  if (!isLocalEnvironment() && typeof window !== 'undefined') {
    window.location.href = '/cdn-cgi/access/logout';
  }
}

