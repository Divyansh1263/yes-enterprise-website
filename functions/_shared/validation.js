/**
 * Request validation and query parameter parsing utilities.
 */

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates and extracts pagination parameters from a URL.
 *
 * @param {URL} url - Parsed request URL.
 * @param {number} [defaultLimit=20] - Default page size.
 * @param {number} [maxLimit=50] - Maximum allowed page size.
 * @returns {{ limit: number, offset: number, error: string | null }}
 */
export function parsePagination(url, defaultLimit = 20, maxLimit = 50) {
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');

  let limit = defaultLimit;
  let offset = 0;

  if (limitParam !== null) {
    if (!/^\d+$/.test(limitParam)) {
      return { limit: 0, offset: 0, error: 'Query parameter "limit" must be a positive integer.' };
    }
    const parsed = parseInt(limitParam, 10);
    if (parsed < 1) {
      return { limit: 0, offset: 0, error: 'Query parameter "limit" must be at least 1.' };
    }
    limit = Math.min(parsed, maxLimit);
  }

  if (offsetParam !== null) {
    if (!/^\d+$/.test(offsetParam)) {
      return { limit: 0, offset: 0, error: 'Query parameter "offset" must be a non-negative integer.' };
    }
    offset = parseInt(offsetParam, 10);
    if (offset < 0) {
      return { limit: 0, offset: 0, error: 'Query parameter "offset" cannot be negative.' };
    }
  }

  return { limit, offset, error: null };
}

/**
 * Validates a product or category slug.
 *
 * @param {string} slug - The slug string to check.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug parameter is required.' };
  }
  const trimmed = slug.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    return { valid: false, error: 'Slug length must be between 1 and 100 characters.' };
  }
  if (!SLUG_REGEX.test(trimmed)) {
    return { valid: false, error: 'Slug may only contain lowercase alphanumeric characters and hyphens.' };
  }
  return { valid: true };
}

/**
 * Safely sanitizes query string values.
 *
 * @param {string | null} value - Raw string value.
 * @param {number} [maxLength=200] - Max allowable length.
 * @returns {string | null}
 */
export function sanitizeSearchQuery(value, maxLength = 200) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

