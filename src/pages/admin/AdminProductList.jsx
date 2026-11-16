import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts, deleteProduct } from '../../services/api/products.js';
import { getPublicCategories } from '../../services/api/categories.js';
import { getR2ImageUrl } from '../../services/api/uploads.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ConfirmModal from '../../components/admin/ConfirmModal.jsx';
import { paiseToInr } from '../../utils/currency.js';

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load categories for filter dropdown & name mapping
  useEffect(() => {
    getPublicCategories({ cache: 'no-cache' })
      .then(cats => setCategories(cats || []))
      .catch(() => { });
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(c => {
      map.set(c.id, c.name);
      if (c.slug) map.set(c.slug, c.name);
    });
    return map;
  }, [categories]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminProducts({
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: search.trim() || undefined,
        limit: 100,
        offset: 0
      });
      setProducts(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteClick = (prod) => {
    setProductToDelete(prod);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      setActionSuccess(`"${productToDelete.name}" has been deleted.`);
      setDeleteModalOpen(false);
      setProductToDelete(null);
      await fetchProducts();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(`Failed to delete product: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Page Header & Primary Actions ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
            Manage Your Products
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Add, update, and manage the products displayed on your website.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            to="/admin/categories"
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 bg-white text-brand-navy text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors min-h-[44px]"
          >
            <span>🏷️</span>
            <span className="truncate">Categories</span>
          </Link>

          <Link
            to="/admin/products/new"
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 bg-brand-navy text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-brand-navy-light shadow-sm transition-colors min-h-[44px]"
          >
            <span className="text-brand-amber font-bold text-base leading-none">+</span>
            <span className="truncate">Add Product</span>
          </Link>
        </div>
      </div>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-600 text-lg hover:text-emerald-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 sm:p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-red-600 text-lg hover:text-red-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
            &times;
          </button>
        </div>
      )}

      {/* ── Search & Filter Controls ───────────────────────────────────────── */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Search Products
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by product name, Hindi name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count strip */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing <strong className="text-gray-800">{products.length}</strong> product{products.length === 1 ? '' : 's'}
          </span>
          {(searchInput || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('');
                setSelectedCategory('all');
              }}
              className="text-brand-navy hover:underline font-semibold min-h-[36px] flex items-center"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Product Cards Section ─────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Loading products..." size="lg" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            📦
          </div>
          <h3 className="text-lg font-bold text-gray-800">No products found</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            {searchInput || selectedCategory !== 'all'
              ? 'Try adjusting your search terms or selecting a different category.'
              : 'Your catalogue is empty. Get started by adding your first product.'}
          </p>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-brand-navy text-white text-sm font-bold rounded-xl hover:bg-brand-navy-light"
          >
            <span>+</span>
            <span>Add New Product</span>
          </Link>
        </div>
      ) : (
        <>
          {/* ── MOBILE PRODUCT LIST (< sm breakpoint: compact responsive cards) ── */}
          <div data-mobile-list="true" className="sm:hidden flex flex-col gap-3">
            {products.map((prod) => {
              const catName = categoryMap.get(prod.category_id) || prod.category_name || 'Uncategorised';
              const imageUrl = prod.primary_image_key ? getR2ImageUrl(prod.primary_image_key) : null;
              const sellingPrice = prod.base_price_paise != null ? paiseToInr(prod.base_price_paise) : null;
              const expectedPrice100 = prod.expected_price_per_100_paise != null ? paiseToInr(prod.expected_price_per_100_paise) : null;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-3.5 flex flex-col gap-3"
                >
                  <div className="flex gap-3 items-start">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100 relative">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/logo.jpeg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <span className="text-2xl">📷</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-navy/10 text-brand-navy">
                          {catName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${prod.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                          {prod.status || 'active'}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm leading-snug break-words line-clamp-2">
                        {prod.name}
                      </h3>
                      {prod.name_hi && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 font-devanagari">
                          {prod.name_hi}
                        </p>
                      )}

                      {/* Pricing info */}
                      <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs">
                        {sellingPrice != null ? (
                          <span className="font-bold text-brand-navy">
                            ₹{sellingPrice.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Enquiry</span>
                        )}
                        {prod.min_order_quantity != null && (
                          <span className="text-emerald-700 font-semibold text-[11px]">
                            • MOQ: {prod.min_order_quantity}
                          </span>
                        )}
                        {expectedPrice100 != null && (
                          <span className="text-gray-500 text-[11px]">
                            • ₹{expectedPrice100.toLocaleString('en-IN')}/100 pcs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row with >= 44px touch targets */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link
                      to={`/admin/products/${prod.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 px-3 bg-brand-ivory hover:bg-brand-navy hover:text-white text-brand-navy border border-brand-navy/20 text-xs font-bold rounded-xl transition-colors text-center"
                    >
                      <span>✏️</span>
                      <span>Edit Product</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(prod)}
                      className="min-h-[44px] min-w-[44px] py-2.5 px-3 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
                      title="Delete this product"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── DESKTOP/TABLET GRID (sm: and up — Preserves approved desktop layout) ── */}
          <div data-desktop-grid="true" className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((prod) => {
              const catName = categoryMap.get(prod.category_id) || prod.category_name || 'Uncategorised';
              const imageUrl = prod.primary_image_key ? getR2ImageUrl(prod.primary_image_key) : null;
              const sellingPrice = prod.base_price_paise != null ? paiseToInr(prod.base_price_paise) : null;
              const expectedPrice100 = prod.expected_price_per_100_paise != null ? paiseToInr(prod.expected_price_per_100_paise) : null;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group"
                >
                  {/* Product Photograph Container */}
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden border-b border-gray-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/assets/logo.jpeg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <span className="text-4xl">📷</span>
                        <span className="text-xs text-gray-400 mt-1">No image</span>
                      </div>
                    )}

                    {/* Status Tag */}
                    <div className="absolute top-2.5 right-2.5">
                      {prod.status === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-600 text-white shadow-sm">
                          {prod.status}
                        </span>
                      )}
                    </div>

                    {/* Category Pill on Image */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-navy/90 text-white backdrop-blur-sm shadow-sm">
                        {catName}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2" title={prod.name}>
                        {prod.name}
                      </h3>
                      {prod.name_hi && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1" title={prod.name_hi}>
                          {prod.name_hi}
                        </p>
                      )}
                    </div>

                    {/* Pricing Details (Only rendered when set) */}
                    <div className="space-y-1.5 pt-1">
                      {sellingPrice != null && (
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-gray-500 font-medium">Selling Price:</span>
                          <span className="text-base font-bold text-brand-navy">
                            ₹{sellingPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {prod.min_order_quantity != null && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Min Order (MOQ):</span>
                          <span className="font-semibold text-emerald-700">
                            {prod.min_order_quantity} pcs
                          </span>
                        </div>
                      )}

                      {expectedPrice100 != null && (
                        <div className="p-2 rounded-xl bg-brand-ivory border border-brand-navy/10 flex items-center justify-between text-xs">
                          <span className="text-gray-600 font-medium">Price / 100 pcs:</span>
                          <span className="font-bold text-brand-navy">
                            ₹{expectedPrice100.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {sellingPrice == null && expectedPrice100 == null && (
                        <p className="text-xs text-gray-400 italic">
                          Pricing on request (WhatsApp enquiry)
                        </p>
                      )}
                    </div>

                    {/* Action Buttons: Edit and Delete with min-h-[44px] */}
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      <Link
                        to={`/admin/products/${prod.id}/edit`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-3 bg-brand-ivory hover:bg-brand-navy hover:text-white text-brand-navy border border-brand-navy/20 text-xs font-bold rounded-xl transition-colors text-center"
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(prod)}
                        className="min-h-[44px] min-w-[44px] py-2 px-3 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
                        title="Delete this product"
                      >
                        <span>🗑️</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Product"
        message={
          productToDelete
            ? `Are you sure you want to permanently delete "${productToDelete.name}"? This action cannot be undone and will remove the product from your public catalogue.`
            : 'Are you sure you want to delete this product?'
        }
        confirmLabel={deleting ? 'Deleting...' : 'Yes, Delete Product'}
        cancelLabel="Cancel"
        isDanger={true}
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setProductToDelete(null);
          }
        }}
      />

    </div>
  );
}
