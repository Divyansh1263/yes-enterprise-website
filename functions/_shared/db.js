/**
 * Database connection and query helper utilities for Cloudflare D1.
 */

import { errorResponse } from './responses.js';

export class DatabaseBindingError extends Error {
  constructor(message = 'D1 database binding "DB" is not configured in the execution environment.') {
    super(message);
    this.name = 'DatabaseBindingError';
  }
}

/**
 * Retrieves and validates the D1 database binding from the Pages Functions context.
 *
 * @param {EventContext<any, any, any>} context - Cloudflare Pages Functions context.
 * @returns {D1Database}
 * @throws {DatabaseBindingError}
 */
export function getDatabase(context) {
  const db = context?.env?.DB;
  if (!db || typeof db.prepare !== 'function') {
    throw new DatabaseBindingError();
  }
  return db;
}

/**
 * Handles database execution errors securely.
 * Server logs the exact error details for debugging, while the client receives
 * a generic, secure response that does not expose table names, SQL, or stack traces.
 *
 * @param {unknown} err - Caught error object.
 * @param {string} [publicMessage='A database error occurred while processing your request.'] - Safe message for client.
 * @returns {Response}
 */
export function handleDbError(err, publicMessage = 'A database error occurred while processing your request.') {
  if (err instanceof DatabaseBindingError) {
    console.error('[DATABASE_CONFIG_ERROR]', err.message);
    return errorResponse(
      'Database service is temporarily unavailable.',
      500,
      'DATABASE_UNAVAILABLE'
    );
  }

  // Log internal details to Cloudflare Workers / Miniflare console securely
  console.error('[DATABASE_QUERY_ERROR]', {
    message: err?.message || String(err),
    cause: err?.cause?.message || undefined,
    stack: err?.stack || undefined
  });

  return errorResponse(publicMessage, 500, 'DATABASE_ERROR');
}

