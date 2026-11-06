/**
 * Admin session verification endpoint: GET /api/admin/session
 * Verifies the administrator's Cloudflare Access identity or permitted local dev bypass.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../../_shared/responses.js';
import { validateAdminSession } from '../../_shared/auth.js';

export async function onRequestGet(context) {
  try {
    const authResult = await validateAdminSession(context);

    if (!authResult.ok) {
      return errorResponse(
        authResult.message,
        authResult.status,
        authResult.code
      );
    }

    return jsonResponse(
      {
        success: true,
        data: {
          authenticated: true,
          email: authResult.user.email,
          name: authResult.user.name,
          auth_type: authResult.user.auth_type,
          verified_at: authResult.user.verified_at
        }
      },
      200,
      noCacheHeaders()
    );
  } catch (err) {
    console.error('[ADMIN_SESSION_ERROR]', err);
    return errorResponse('Internal error validating session.', 500, 'INTERNAL_ERROR');
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestGet(context);
}

