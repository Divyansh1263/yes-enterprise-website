/**
 * Generate a URL-safe slug from a product name.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '')     // Remove non-word characters
    .replace(/--+/g, '-')        // Replace multiple hyphens
    .replace(/^-+/, '')          // Trim leading hyphens
    .replace(/-+$/, '')          // Trim trailing hyphens
}

