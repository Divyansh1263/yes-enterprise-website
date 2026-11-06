/**
 * YES ENTERPRISES — Categories API Service
 * Handles public and admin category operations.
 */

import { apiFetch } from './client.js';

/**
 * Fetches all public categories with active product counts.
 * @param {RequestInit} [options]
 * @returns {Promise<any[]>}
 */
export async function getPublicCategories(options = {}) {
  const res = await apiFetch('/categories', options);
  return res.data || [];
}

/**
 * Creates a new category (Admin).
 * @param {{ name: string, name_hi?: string, slug: string, description?: string, description_hi?: string, image_url?: string, sort_order?: number, is_active?: boolean }} payload
 * @returns {Promise<any>}
 */
export async function createCategory(payload) {
  const res = await apiFetch('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Updates an existing category (Admin).
 * @param {string} id
 * @param {Partial<{ name: string, name_hi: string, slug: string, description: string, description_hi: string, image_url: string, sort_order: number, is_active: boolean }>} payload
 * @returns {Promise<any>}
 */
export async function updateCategory(id, payload) {
  const res = await apiFetch(`/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Batch reorders categories (Admin).
 * @param {Array<{ id: string, sort_order: number }>} orders
 * @returns {Promise<any>}
 */
export async function reorderCategories(orders) {
  const res = await apiFetch('/admin/categories/reorder', {
    method: 'PUT',
    body: JSON.stringify({ orders })
  });
  return res;
}

/**
 * Deletes an unreferenced category (Admin).
 * Throws 409 Conflict if products still reference this category.
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function deleteCategory(id) {
  const res = await apiFetch(`/admin/categories/${id}`, {
    method: 'DELETE'
  });
  return res;
}

