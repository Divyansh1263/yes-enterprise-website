/**
 * Environment and binding helper functions.
 */

/**
 * Retrieves an environment variable with a fallback default.
 *
 * @param {Record<string, any>} env - Context env object.
 * @param {string} key - Variable key name.
 * @param {string} [defaultValue=''] - Default value if undefined.
 * @returns {string}
 */
export function getEnv(env, key, defaultValue = '') {
  if (!env || typeof env !== 'object') return defaultValue;
  const val = env[key];
  return typeof val === 'string' ? val : defaultValue;
}

/**
 * Checks whether the current environment is local development.
 *
 * @param {Record<string, any>} env
 * @returns {boolean}
 */
export function isDevelopment(env) {
  return getEnv(env, 'ENVIRONMENT') === 'development';
}

