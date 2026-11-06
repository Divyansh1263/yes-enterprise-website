/**
 * YES ENTERPRISES — Inventory API Service
 * Handles stock level updates and queries immutable audit logs.
 */

import { apiFetch } from './client.js';

/**
 * Updates stock quantity for a product or variant (Admin).
 * @param {{ product_id: string, variant_id?: string | null, new_quantity: number, reason: string }} payload
 * @returns {Promise<{ previous_quantity: number, new_quantity: number, change_amount: number }>}
 */
export async function updateInventory(payload) {
  const res = await apiFetch('/admin/inventory', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  return res.data;
}

/**
 * Retrieves inventory audit history.
 * @param {{ product_id?: string, limit?: number, offset?: number }} [params]
 * @returns {Promise<{ data: any[], pagination: any }>}
 */
export async function getInventoryLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.product_id) query.set('product_id', params.product_id);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const res = await apiFetch(`/admin/inventory/logs${qs ? `?${qs}` : ''}`);
  return {
    data: res.data || [],
    pagination: res.pagination || { total: (res.data || []).length, limit: 50, offset: 0, has_more: false }
  };
}

