import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts, duplicateProduct, deleteProduct } from '../../services/api/products.js';
import { getPublicCategories } from '../../services/api/categories.js';
import { getR2ImageUrl } from '../../services/api/uploads.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ConfirmModal from '../../components/admin/ConfirmModal.jsx';
import { formatInr } from '../../utils/currency.js';

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, in_stock, low_stock, out_of_stock

  // Pagination
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Actions state
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminProducts({
        category_id: selectedCategory,
        status: selectedStatus,
        search: search.trim() || undefined,
        limit,
        offset
      });

      let items = res.data || [];

      // Client-side stock filtering if requested
      if (stockFilter === 'out_of_stock') {
        items = items.filter(p => (p.stock_quantity ?? 0) === 0);
      } else if (stockFilter === 'low_stock') {
        items = items.filter(p => {
          const s = p.stock_quantity ?? 0;
          return s > 0 && s <= (p.low_stock_threshold || 5);
        });
      } else if (stockFilter === 'in_stock') {
        items = items.filter(p => (p.stock_quantity ?? 0) > 0);
      }

      setProducts(items);
      setTotalCount(res.pagination?.total ?? items.length);
    } catch (err) {
      setError(err.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, search, limit, offset, stockFilter]);

  useEffect(() => {
    getPublicCategories()
      .then(cats => setCategories(cats || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDuplicate = async (prod) => {
    setDuplicatingId(prod.id);
    setActionSuccess(null);
    setError(null);
    try {
      const duplicated = await duplicateProduct(prod.id);
      setActionSuccess(`Product duplicated successfully as "${duplicated.name}".`);
      await fetchProducts();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to duplicate product: ${err.message}`);
    } finally {
      setDuplicatingId(null);
    }
  };

  const openDeleteModal = (prod) => {
    setProductToDelete(prod);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(productToDelete.id);
      setActionSuccess(`Product "${productToDelete.name}" deleted successfully.`);
      setDeleteModalOpen(false);
      await fetchProducts();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to delete product: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Products Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, edit, duplicate, and configure single and variable products.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-navy text-white text-sm font-bold rounded-xl hover:bg-brand-navy-light shadow-sm transition-colors shrink-0"
        >
          <span>➕</span> Add New Product
        </Link>
      </div>

      {/* ── Notification Banners ────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>✅ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-600">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="font-bold text-red-600">✕</button>
        </div>
      )}

      {/* ── Filters & Search Bar ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Visible)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Stock Availability
            </label>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt; 0)</option>
              <option value="low_stock">Low Stock (≤ threshold)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Products Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Querying products from database..." />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 italic mb-4">No products matching the selected criteria.</p>
            <Link
              to="/admin/products/new"
              className="inline-flex items-center px-4 py-2 bg-brand-navy text-white text-xs font-bold rounded-lg"
            >
              + Create First Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((prod) => {
                  const catName = categoryMap.get(prod.category_id) || prod.category_id;
                  const isVariable = Boolean(prod.has_variants);
                  const isLowStock = (prod.stock_quantity ?? 0) > 0 && (prod.stock_quantity ?? 0) <= (prod.low_stock_threshold || 5);
                  const isOutOfStock = (prod.stock_quantity ?? 0) === 0;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Product details & thumbnail */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {prod.primary_image_key ? (
                              <img
                                src={getR2ImageUrl(prod.primary_image_key)}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <span className="text-gray-300 text-xs">📦</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/products/${prod.id}/edit`}
                              className="font-bold text-gray-900 hover:text-brand-navy truncate block"
                            >
                              {prod.name}
                            </Link>
                            {prod.name_hi && (
                              <p className="text-xs text-gray-500 truncate">{prod.name_hi}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                              {isVariable ? (
                                <span className="bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.2 rounded">
                                  Variable ({prod.variant_count ?? 1} variants)
                                </span>
                              ) : (
                                <span>Simple</span>
                              )}
                              {prod.is_featured ? (
                                <span className="text-amber-600 font-semibold">★ Featured</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 text-gray-600 font-medium">
                        {catName}
                      </td>

                      {/* SKU */}
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">
                        {prod.sku || <span className="text-gray-300 italic">—</span>}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 font-bold text-gray-900">
                        {formatInr(prod.base_price_paise)}
                      </td>

                      {/* Stock */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isOutOfStock
                              ? 'bg-red-50 text-red-700'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {prod.stock_quantity ?? 0} units
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            prod.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : prod.status === 'draft'
                              ? 'bg-gray-100 text-gray-700 border border-gray-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {prod.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/products/${prod.id}/edit`}
                            className="px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-brand-navy/5 rounded-lg transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(prod)}
                            disabled={duplicatingId === prod.id}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {duplicatingId === prod.id ? 'Cloning...' : 'Duplicate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(prod)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Controls ─────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <span className="font-semibold text-gray-700">{products.length}</span> of{' '}
            <span className="font-semibold text-gray-700">{totalCount}</span> products
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0 || loading}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="font-mono text-gray-600 font-medium">
              Page {Math.floor(offset / limit) + 1}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= totalCount || loading}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirm Delete Modal ────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete Product "${productToDelete?.name}"?`}
        message="Are you sure you want to delete this product? All associated variants, image records, and unshared R2 objects will be safely removed."
        confirmLabel="Confirm Delete"
        isDanger={true}
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
