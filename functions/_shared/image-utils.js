/**
 * Image inspection, MIME validation, and binary dimension parsing utilities.
 * Validates actual binary file signatures (magic bytes) to prevent extension spoofing.
 */

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_IMAGE_DIMENSION = 10;
export const MAX_IMAGE_DIMENSION = 8000;
export const MAX_IMAGE_PIXELS = 32_000_000; // 32 Megapixels (prevents decompression bombs)

export const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

/**
 * Maps a MIME type to a safe file extension.
 *
 * @param {string} mimeType
 * @returns {string}
 */
export function getExtensionForMime(mimeType) {
  return MIME_TO_EXTENSION[mimeType] || 'bin';
}

/**
 * Checks whether a MIME type is allowed.
 *
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isAllowedMimeType(mimeType) {
  return typeof mimeType === 'string' && ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Inspects a binary buffer and verifies its magic bytes match the expected MIME type.
 *
 * @param {Uint8Array} bytes
 * @param {string} expectedMime
 * @returns {{ valid: boolean, detectedMime: string | null, error?: string }}
 */
export function verifyImageFileSignature(bytes, expectedMime) {
  if (!bytes || bytes.length < 12) {
    return { valid: false, detectedMime: null, error: 'File is too small to be a valid image.' };
  }

  let detectedMime = null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    detectedMime = 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    detectedMime = 'image/png';
  }
  // WebP: RIFF .... WEBP
  else if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    detectedMime = 'image/webp';
  }
  // GIF: GIF87a or GIF89a
  else if (
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  ) {
    detectedMime = 'image/gif';
  }
  // AVIF: ....ftypavif or ....ftypavis
  else if (
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
    bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && (bytes[11] === 0x66 || bytes[11] === 0x73)
  ) {
    detectedMime = 'image/avif';
  }

  if (!detectedMime) {
    return {
      valid: false,
      detectedMime: null,
      error: 'Unrecognized file signature. Uploaded data is not a valid supported image format.'
    };
  }

  if (expectedMime && detectedMime !== expectedMime.toLowerCase()) {
    return {
      valid: false,
      detectedMime,
      error: `File signature mismatch: expected ${expectedMime}, but file binary signature is ${detectedMime}.`
    };
  }

  return { valid: true, detectedMime };
}

/**
 * Extracts width and height from PNG binary header.
 *
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number } | null}
 */
function parsePngDimensions(bytes) {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}

/**
 * Extracts width and height from GIF binary header.
 *
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number } | null}
 */
function parseGifDimensions(bytes) {
  if (bytes.length < 10) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  return { width, height };
}

/**
 * Extracts width and height from JPEG binary stream.
 *
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number } | null}
 */
/**
 * Extracts width and height from JPEG binary stream safely with bounds checks.
 *
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number } | null}
 */
function parseJpegDimensions(bytes) {
  let offset = 2; // Skip SOI (FF D8)
  const len = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let markersParsed = 0;
  const MAX_MARKERS = 500; // Bound marker traversal to prevent CPU exhaustion on corrupted files

  while (offset < len - 8 && markersParsed++ < MAX_MARKERS) {
    if (bytes[offset] !== 0xFF) {
      offset++;
      continue;
    }

    const marker = bytes[offset + 1];

    // Standalone markers without length: SOI (D8), EOI (D9), TEM (01), RST0-RST7 (D0-D7)
    if (marker === 0xD8 || marker === 0xD9 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      offset += 2;
      continue;
    }

    // Skip fill bytes FF FF or invalid zero marker
    if (marker === 0xFF || marker === 0x00) {
      offset++;
      continue;
    }

    if (offset + 4 > len) break;
    const markerLength = view.getUint16(offset + 2, false);
    if (markerLength < 2 || offset + 2 + markerLength > len) break;

    // SOF markers: SOF0 (C0), SOF1 (C1), SOF2 (C2), SOF3 (C3), SOF5 (C5), SOF6 (C6), SOF7 (C7),
    //              SOF9 (C9), SOF10 (CA), SOF11 (CB), SOF13 (CD), SOF14 (CE), SOF15 (CF)
    const isSof = (marker >= 0xC0 && marker <= 0xC3) ||
                  (marker >= 0xC5 && marker <= 0xC7) ||
                  (marker >= 0xC9 && marker <= 0xCB) ||
                  (marker >= 0xCD && marker <= 0xCF);

    if (isSof && offset + 9 <= len) {
      const height = view.getUint16(offset + 5, false);
      const width = view.getUint16(offset + 7, false);
      return { width, height };
    }

    offset += 2 + markerLength;
  }

  return null;
}

/**
 * Extracts width and height from AVIF ISOBMFF image spatial extents box (ispe).
 *
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number } | null}
 */
function parseAvifDimensions(bytes) {
  if (bytes.length < 32) return null;
  const len = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Scan for 'ispe' box tag (0x69 0x73 0x70 0x65)
  let offset = 0;
  const MAX_BOXES = 100;
  let boxesScanned = 0;

  while (offset <= len - 16 && boxesScanned++ < MAX_BOXES) {
    if (
      bytes[offset] === 0x69 && bytes[offset + 1] === 0x73 &&
      bytes[offset + 2] === 0x70 && bytes[offset + 3] === 0x65
    ) {
      // ispe payload: 4 bytes version+flags, 4 bytes width, 4 bytes height
      if (offset + 16 <= len) {
        const width = view.getUint32(offset + 8, false);
        const height = view.getUint32(offset + 12, false);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    }
    offset++;
  }

  return null;
}

/**
 * Extracts width and height from WebP binary stream.
 *
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number } | null}
 */
function parseWebpDimensions(bytes) {
  if (bytes.length < 30) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const chunkFourCC = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  // VP8X (Extended WebP)
  if (chunkFourCC === 'VP8X' && bytes.length >= 30) {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width, height };
  }

  // VP8 (Lossy WebP)
  if (chunkFourCC === 'VP8 ' && bytes.length >= 30) {
    // Keyframe signature at 23..25 is 9D 01 2A
    if (bytes[23] === 0x9D && bytes[24] === 0x01 && bytes[25] === 0x2A) {
      const width = view.getUint16(26, true) & 0x3FFF;
      const height = view.getUint16(28, true) & 0x3FFF;
      return { width, height };
    }
  }

  // VP8L (Lossless WebP)
  if (chunkFourCC === 'VP8L' && bytes.length >= 25) {
    if (bytes[20] === 0x2F) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (((b1 & 0x3F) << 8) | b0);
      const height = 1 + ((((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6)));
      return { width, height };
    }
  }

  return null;
}

/**
 * Parses image dimensions from binary buffer based on detected MIME type.
 *
 * @param {Uint8Array} bytes
 * @param {string} mimeType
 * @returns {{ width: number, height: number } | null}
 */
export function parseImageDimensions(bytes, mimeType) {
  try {
    switch (mimeType.toLowerCase()) {
      case 'image/png':
        return parsePngDimensions(bytes);
      case 'image/jpeg':
        return parseJpegDimensions(bytes);
      case 'image/gif':
        return parseGifDimensions(bytes);
      case 'image/webp':
        return parseWebpDimensions(bytes);
      case 'image/avif':
        return parseAvifDimensions(bytes);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Validates complete image binary payload:
 * 1. Checks file size bounds.
 * 2. Verifies magic bytes signature against expected MIME type.
 * 3. Extracts dimensions and checks minimum / maximum bounds and total pixel limits.
 *
 * @param {Uint8Array} bytes
 * @param {string} expectedMime
 * @returns {{ valid: boolean, mimeType: string, width: number | null, height: number | null, sizeBytes: number, error?: string }}
 */
export function validateImagePayload(bytes, expectedMime) {
  const sizeBytes = bytes?.byteLength || bytes?.length || 0;

  if (sizeBytes === 0) {
    return { valid: false, mimeType: '', width: null, height: null, sizeBytes: 0, error: 'Image file is empty.' };
  }

  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      mimeType: expectedMime,
      width: null,
      height: null,
      sizeBytes,
      error: `Image file exceeds maximum allowable size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`
    };
  }

  const sigResult = verifyImageFileSignature(bytes, expectedMime);
  if (!sigResult.valid) {
    return {
      valid: false,
      mimeType: sigResult.detectedMime || expectedMime,
      width: null,
      height: null,
      sizeBytes,
      error: sigResult.error
    };
  }

  const dimensions = parseImageDimensions(bytes, sigResult.detectedMime);
  let width = dimensions?.width || null;
  let height = dimensions?.height || null;

  if (width !== null && height !== null) {
    if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
      return {
        valid: false,
        mimeType: sigResult.detectedMime,
        width,
        height,
        sizeBytes,
        error: `Image dimensions (${width}x${height}) are smaller than minimum allowed (${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}).`
      };
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      return {
        valid: false,
        mimeType: sigResult.detectedMime,
        width,
        height,
        sizeBytes,
        error: `Image dimensions (${width}x${height}) exceed maximum allowed (${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}).`
      };
    }
    if (width * height > MAX_IMAGE_PIXELS) {
      return {
        valid: false,
        mimeType: sigResult.detectedMime,
        width,
        height,
        sizeBytes,
        error: `Image total pixel count (${width * height}) exceeds maximum allowed limit (${MAX_IMAGE_PIXELS}).`
      };
    }
  }

  return {
    valid: true,
    mimeType: sigResult.detectedMime,
    width,
    height,
    sizeBytes
  };
}

