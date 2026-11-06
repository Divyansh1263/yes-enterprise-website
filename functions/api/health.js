/**
 * Health check endpoint: GET /api/health
 * Probes backend status and verifies D1 database connectivity.
 */

import { jsonResponse, errorResponse, noCacheHeaders } from '../_shared/responses.js';

export async function onRequestGet(context) {
  const startTime = Date.now();
  let dbStatus = {
    status: 'unhealthy',
    connected: false
  };

  try {
    const db = context?.env?.DB;
    if (db && typeof db.prepare === 'function') {
      const probeStart = Date.now();
      const result = await db.prepare('SELECT 1 as ok').first();
      const latencyMs = Date.now() - probeStart;

      if (result && result.ok === 1) {
        dbStatus = {
          status: 'healthy',
          connected: true,
          latency_ms: latencyMs
        };
      }
    }
  } catch (err) {
    console.error('[HEALTH_CHECK_DB_ERROR]', err?.message || err);
    dbStatus = {
      status: 'unhealthy',
      connected: false
    };
  }

  const isHealthy = dbStatus.connected;
  const statusCode = isHealthy ? 200 : 503;

  return jsonResponse(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'yes-enterprises-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - startTime,
      database: dbStatus
    },
    statusCode,
    noCacheHeaders()
  );
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
  }
  return onRequestGet(context);
}

