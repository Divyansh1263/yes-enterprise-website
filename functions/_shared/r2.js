/**
 * Cloudflare R2 object storage utilities using native R2 bindings and aws4fetch S3 API.
 * Supports presigned upload URL generation with signed Content-Type headers.
 */

import { AwsClient } from 'aws4fetch';

/**
 * Initializes an S3-compatible client for Cloudflare R2 using aws4fetch.
 *
 * @param {Record<string, any>} env
 * @returns {{ client: AwsClient, accountId: string, bucketName: string } | null}
 */
export function getR2Client(env) {
  const accountId = env?.R2_ACCOUNT_ID || '98fe327a56db792b1d9d04cb65e7f6ee';
  const accessKeyId = env?.R2_ACCESS_KEY_ID;
  const secretAccessKey = env?.R2_SECRET_ACCESS_KEY;
  const bucketName = env?.R2_BUCKET_NAME || 'yes-enterprises-public-images';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto'
  });

  return { client, accountId, bucketName };
}

/**
 * Generates a presigned PUT URL for direct-to-R2 uploads.
 * Signs the Content-Type header using allHeaders: true per security specification.
 *
 * @param {Record<string, any>} env
 * @param {{ key: string, contentType: string, expiresInSeconds?: number }} options
 * @returns {Promise<string>}
 */
export async function generatePresignedUploadUrl(env, { key, contentType, expiresInSeconds = 900 }) {
  const r2 = getR2Client(env);
  if (!r2) {
    // In local development or testing when S3 credentials aren't provided,
    // construct a descriptive mock/simulated upload endpoint URL rather than crashing.
    if (env?.ENVIRONMENT === 'development' || !env?.R2_ACCOUNT_ID) {
      return `https://mock-r2.local/${env?.R2_BUCKET_NAME || 'yes-enterprises-public-images'}/${key}?mock-presigned=true&expires=${expiresInSeconds}`;
    }
    throw new Error('R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not configured.');
  }

  const endpoint = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucketName}/${key}?X-Amz-Expires=${expiresInSeconds}`;

  const signedRequest = await r2.client.sign(
    new Request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      }
    }),
    {
      aws: {
        signQuery: true,
        allHeaders: true
      }
    }
  );

  return signedRequest.url;
}

/**
 * Retrieves an object from R2 (via native Worker binding or S3 REST client).
 *
 * @param {Record<string, any>} env
 * @param {string} key
 * @returns {Promise<{ bytes: Uint8Array, size: number, contentType?: string } | null>}
 */
export async function getR2Object(env, key) {
  // 1. Try native R2 bucket binding first (available in Cloudflare Pages / Wrangler runtime)
  if (env?.PRODUCT_BUCKET && typeof env.PRODUCT_BUCKET.get === 'function') {
    const object = await env.PRODUCT_BUCKET.get(key);
    if (!object) return null;

    const arrayBuffer = await object.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      size: object.size,
      contentType: object.httpMetadata?.contentType
    };
  }

  // 2. Fall back to S3 client via aws4fetch
  const r2 = getR2Client(env);
  if (r2) {
    const endpoint = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucketName}/${key}`;
    const response = await r2.client.fetch(endpoint, { method: 'GET' });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch object from R2: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      size: arrayBuffer.byteLength,
      contentType: response.headers.get('content-type') || undefined
    };
  }

  return null;
}

/**
 * Copies an object within R2 to a new destination key.
 *
 * @param {Record<string, any>} env
 * @param {string} sourceKey
 * @param {string} destinationKey
 * @returns {Promise<boolean>}
 */
export async function copyR2Object(env, sourceKey, destinationKey) {
  // 1. Native R2 bucket binding (e.g. Miniflare / Cloudflare Pages runtime)
  if (env?.PRODUCT_BUCKET && typeof env.PRODUCT_BUCKET.get === 'function') {
    const sourceObj = await env.PRODUCT_BUCKET.get(sourceKey);
    if (!sourceObj) {
      throw new Error(`Source object "${sourceKey}" not found in storage for copy.`);
    }

    const arrayBuffer = await sourceObj.arrayBuffer();
    await env.PRODUCT_BUCKET.put(destinationKey, arrayBuffer, {
      httpMetadata: sourceObj.httpMetadata
    });
    return true;
  }

  // 2. S3 client fallback via aws4fetch (using x-amz-copy-source)
  const r2 = getR2Client(env);
  if (r2) {
    const endpoint = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucketName}/${destinationKey}`;
    const response = await r2.client.fetch(endpoint, {
      method: 'PUT',
      headers: {
        'x-amz-copy-source': `/${r2.bucketName}/${sourceKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to copy object in R2: HTTP ${response.status}`);
    }

    return true;
  }

  throw new Error('R2 storage is not configured for copy.');
}

/**
 * Deletes an object from R2 (via native Worker binding or S3 REST client).
 *
 * @param {Record<string, any>} env
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function deleteR2Object(env, key) {
  // 1. Native R2 bucket binding
  if (env?.PRODUCT_BUCKET && typeof env.PRODUCT_BUCKET.delete === 'function') {
    await env.PRODUCT_BUCKET.delete(key);
    return true;
  }

  // 2. S3 client fallback
  const r2 = getR2Client(env);
  if (r2) {
    const endpoint = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucketName}/${key}`;
    const response = await r2.client.fetch(endpoint, { method: 'DELETE' });
    return response.ok;
  }

  return false;
}

