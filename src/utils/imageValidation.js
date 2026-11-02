const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * Validate a product image file before upload.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImage(file) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP.`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return {
      valid: false,
      error: `File too large: ${sizeMB} MB. Maximum: 5 MB.`,
    }
  }

  return { valid: true }
}
