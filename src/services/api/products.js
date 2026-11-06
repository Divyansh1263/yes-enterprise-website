/**
 * YES ENTERPRISES — Products API Service
 * Handles public catalogue and admin product lifecycle operations.
 */

import { apiFetch } from './client.js';

/**
 * Fetches active public products with filtering and pagination.
 * @param {{ category?: string, search?: string, is_featured?: boolean, limit?: number, offset?: number }} [params]
 * @returns {Promise<{ data: any[], pagination: { total: number, limit: number, offset: number, has_more: boolean } }>}
 */
export async function getPublicProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  if (params.is_featured) query.set('is_featured', 'true');
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const res = await apiFetch(`/products${qs ? `?${qs}` : ''}`);
  return {
    data: res.data || [],
    pagination: res.pagination || { total: (res.data || []).length, limit: 50, offset: 0, has_more: false }
  };
}

/**
 * Fetches a single public product by slug.
 * @param {string} slug
 * @returns {Promise<any>}
 */
export async function getPublicProductBySlug(slug) {
  const res = await apiFetch(`/products/${encodeURIComponent(slug)}`);
  return res.data;
}

/**
 * Fetches products for admin management (including draft and archived).
 * @param {{ category_id?: string, status?: string, search?: string, limit?: number, offset?: number }} [params]
 * @returns {Promise<{ data: any[], pagination: any }>}
 */
export async function getAdminProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.category_id && params.category_id !== 'all') query.set('category_id', params.category_id);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const res = await apiFetch(`/admin/products${qs ? `?${qs}` : ''}`);
  return {
    data: res.data || [],
    pagination: res.pagination || { total: (res.data || []).length, limit: 50, offset: 0, has_more: false }
  };
}

/**
 * Fetches a single product by ID for admin editing.
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function getAdminProductById(id) {
  const res = await apiFetch(`/admin/products/${encodeURIComponent(id)}`);
  return res.data;
}

/**
 * Creates a new product (Admin).
 * @param {any} productData
 * @returns {Promise<any>}
 */
export async function createProduct(productData) {
  const res = await apiFetch('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  });
  return res.data;
}

/**
 * Updates an existing product (Admin).
 * @param {string} id
 * @param {any} productData
 * @returns {Promise<any>}
 */
export async function updateProduct(id, productData) {
  const res = await apiFetch(`/admin/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(productData)
  });
  return res.data;
}

/**
 * Duplicates a product, cloning variants and copying R2 images (Admin).
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function duplicateProduct(id) {
  const res = await apiFetch(`/admin/products/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST'
  });
  return res.data;
}

/**
 * Deletes a product, cascading variants, images, and safely cleaning R2 storage (Admin).
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function deleteProduct(id) {
  const res = await apiFetch(`/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return res;
}

