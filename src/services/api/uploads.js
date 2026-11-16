/**
 * YES ENTERPRISES — Image Upload & Management Service
 * Supports client-side compression, presigned R2 uploads, finalization, and image CRUD.
 */

import { apiFetch, ApiError } from './client.js';

/**
 * Safely encodes a URI path, ensuring spaces and special characters are percent-encoded
 * without double-encoding already percent-encoded sequences (%20, etc.).
 * @param {string} uri
 * @returns {string}
 */
export function safeEncodeURI(uri) {
  if (!uri) return '';
  try {
    return encodeURI(decodeURI(uri));
  } catch {
    return encodeURI(uri);
  }
}

/**
 * Resolves a storage image key or URL into a browser-loadable image URL.
 * Supports relative asset paths, Cloudflare R2 object keys, and absolute CDN URLs.
 * Automatically applies safe URI percent-encoding for paths containing spaces and parentheses.
 * @param {string} [imageKey]
 * @returns {string}
 */
export function getR2ImageUrl(imageKey) {
  if (!imageKey) return '';
  if (imageKey.startsWith('http://') || imageKey.startsWith('https://')) {
    return imageKey;
  }
  if (imageKey.startsWith('/')) {
    return safeEncodeURI(imageKey);
  }
  if (imageKey.startsWith('assets/') || imageKey.startsWith('uploads/')) {
    return safeEncodeURI(`/${imageKey}`);
  }
  return `/uploads/${safeEncodeURI(imageKey)}`;
}

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Reduces 5–6 MB smartphone photographs to ~200–500 KB while preserving quality and aspect ratio.
 *
 * @param {File} file
 * @param {number} [maxDimension=1800] Maximum width or height
 * @param {number} [quality=0.85] JPEG/WebP compression quality (0.0 to 1.0)
 * @returns {Promise<{ blob: Blob, file: File, width: number, height: number }>}
 */
export async function compressImage(file, maxDimension = 1800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    // If not an image or SVG/GIF, return as is
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const img = new Image();
      img.onload = () => resolve({ blob: file, file, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ blob: file, file, width: 800, height: 800 });
      img.src = URL.createObjectURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Downscale only if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ blob: file, file, width, height });
          return;
        }

        // Draw and compress to WebP if supported, otherwise JPEG
        const outputMime = file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ blob: file, file, width, height });
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: outputMime,
              lastModified: Date.now()
            });
            resolve({ blob, file: compressedFile, width, height });
          },
          outputMime,
          outputMime === 'image/png' ? undefined : quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Requests a presigned upload URL from the backend.
 * @param {{ product_id: string, variant_id?: string | null, filename: string, mime_type: string, file_size_bytes: number }} payload
 * @returns {Promise<{ upload_url: string, image_key: string, expires_in_seconds: number }>}
 */
export async function requestPresignedUrl(payload) {
  return apiFetch('/admin/uploads/request-url', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Uploads compressed file bytes directly to Cloudflare R2 using the presigned URL.
 * Signed headers must include the exact Content-Type per security specification.
 *
 * @param {string} uploadUrl Presigned PUT URL
 * @param {Blob | File} fileData File bytes
 * @param {string} contentType MIME type
 * @param {(progressPercent: number) => void} [onProgress] Progress callback
 * @returns {Promise<boolean>}
 */
export async function uploadToR2(uploadUrl, fileData, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    // Check if this is a local development mock presigned URL
    if (uploadUrl.includes('mock-r2.local') || uploadUrl.includes('mock-presigned=true')) {
      if (onProgress) onProgress(100);
      resolve(true);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve(true);
      } else {
        reject(new ApiError(`R2 direct upload failed with HTTP ${xhr.status}: ${xhr.statusText}`, xhr.status, 'R2_UPLOAD_FAILED'));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError('Network error during R2 direct image upload.', 0, 'R2_NETWORK_ERROR'));
    };

    xhr.send(fileData);
  });
}

/**
 * Finalizes an upload after R2 PUT completes, verifying binary and saving metadata.
 * @param {{ image_key: string, product_id: string, variant_id?: string | null, alt_text?: string, alt_text_hi?: string, is_primary?: boolean, sort_order?: number }} payload
 * @returns {Promise<any>} Created product_images record
 */
export async function finalizeUpload(payload) {
  const res = await apiFetch('/admin/uploads/finalize', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Complete workflow: Compress -> Request URL -> Upload to R2 -> Finalize.
 *
 * @param {File} rawFile
 * @param {{ product_id: string, variant_id?: string | null, alt_text?: string, alt_text_hi?: string, is_primary?: boolean, sort_order?: number }} options
 * @param {(stage: string, percent?: number) => void} [onProgress]
 * @returns {Promise<any>} Finalized image record
 */
export async function executeDirectImageUpload(rawFile, options, onProgress) {
  if (onProgress) onProgress('compressing', 10);
  const { file: compressedFile, blob } = await compressImage(rawFile);

  if (onProgress) onProgress('requesting_url', 30);
  const { upload_url, image_key } = await requestPresignedUrl({
    product_id: options.product_id,
    variant_id: options.variant_id || null,
    filename: compressedFile.name,
    mime_type: compressedFile.type,
    file_size_bytes: compressedFile.size
  });

  if (onProgress) onProgress('uploading', 40);
  await uploadToR2(upload_url, blob, compressedFile.type, (pct) => {
    if (onProgress) onProgress('uploading', 40 + Math.round(pct * 0.4)); // 40% to 80%
  });

  if (onProgress) onProgress('finalizing', 85);
  const imageRecord = await finalizeUpload({
    image_key,
    product_id: options.product_id,
    variant_id: options.variant_id || null,
    alt_text: options.alt_text || '',
    alt_text_hi: options.alt_text_hi || '',
    is_primary: Boolean(options.is_primary),
    sort_order: options.sort_order || 0
  });

  if (onProgress) onProgress('done', 100);
  return imageRecord;
}

/**
 * Updates image metadata (alt text, primary flag, sort order).
 * @param {string} id
 * @param {Partial<{ alt_text: string, alt_text_hi: string, is_primary: boolean, sort_order: number, variant_id: string | null }>} payload
 * @returns {Promise<any>}
 */
export async function updateImage(id, payload) {
  const res = await apiFetch(`/admin/images/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Reorders product images.
 * @param {string} productId
 * @param {Array<{ id: string, sort_order: number }>} orders
 * @returns {Promise<any>}
 */
export async function reorderImages(productId, orders) {
  return apiFetch('/admin/images/reorder', {
    method: 'PUT',
    body: JSON.stringify({ product_id: productId, orders })
  });
}

/**
 * Deletes an image from product and R2 storage.
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function deleteImage(id) {
  return apiFetch(`/admin/images/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
