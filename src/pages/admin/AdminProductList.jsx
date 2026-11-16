import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts, deleteProduct, updateProduct } from '../../services/api/products.js';
import { getAdminCategories } from '../../services/api/categories.js';
import { getR2ImageUrl } from '../../services/api/uploads.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ConfirmModal from '../../components/admin/ConfirmModal.jsx';
import { paiseToInr, expPrice100PaiseToPieceInr } from '../../utils/currency.js';

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'active' | 'draft'
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'variable' | 'simple'

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

  // Load all categories (including draft-only categories like plastic-bottles)
  useEffect(() => {
    getAdminCategories({ cache: 'no-cache' })
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
        type: selectedType !== 'all' ? selectedType : undefined,
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
  }, [selectedCategory, selectedStatus, selectedType, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Client-side counts for tabs when viewing full list
  const counts = useMemo(() => {
    const total = products.length;
    let active = 0;
    let draft = 0;
    let variable = 0;
    let standalone = 0;

    products.forEach(p => {
      if (p.status === 'active') active++;
      if (p.status === 'draft') draft++;
      if (p.has_variants) variable++;
      else standalone++;
    });

    return { total, active, draft, variable, standalone };
  }, [products]);

  // Quick toggle between Active (Published) and Draft
  const handleToggleStatus = async (prod) => {
    const newStatus = prod.status === 'active' ? 'draft' : 'active';
    setUpdatingId(prod.id);
    setError(null);
    try {
      await updateProduct(prod.id, { status: newStatus });
      setActionSuccess(
        newStatus === 'active'
          ? `"${prod.name}" is now Published to public catalogue!`
          : `"${prod.name}" is now moved to Draft (hidden from public catalogue).`
      );
      await fetchProducts();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

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
            Catalogue manager &bull; <strong className="text-emerald-700">10 Active cards publicly visible</strong> &bull; <strong className="text-gray-600">7 Drafts preserved in admin</strong>.
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

      {/* ── Status Tabs Strip ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[40px] flex items-center gap-2 whitespace-nowrap ${
            selectedStatus === 'all'
              ? 'bg-brand-navy text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>All Products</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
            selectedStatus === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            {counts.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('active')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[40px] flex items-center gap-2 whitespace-nowrap ${
            selectedStatus === 'active'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <span>Active (Public)</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
            selectedStatus === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('draft')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[40px] flex items-center gap-2 whitespace-nowrap ${
            selectedStatus === 'draft'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <span>Draft (Admin Only)</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
            selectedStatus === 'draft' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
          }`}>
            {counts.draft}
          </span>
        </button>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────────────── */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                placeholder="Search by product name, Hindi name, SKU..."
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

          {/* Product Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Product Structure
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
            >
              <option value="all">All Types ({counts.total})</option>
              <option value="variable">Variant Families ({counts.variable})</option>
              <option value="simple">Standalone Products ({counts.standalone})</option>
            </select>
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
                  {c.name} ({c.total_count ?? c.product_count ?? 0})
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
          {(searchInput || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSelectedType('all');
              }}
              className="text-brand-navy hover:underline font-semibold min-h-[36px] flex items-center"
            >
              Clear all filters
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
            {searchInput || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedType !== 'all'
              ? 'Try adjusting your search terms or filter selection.'
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
              const isVariable = Boolean(prod.has_variants);

              // Pricing Resolution
              const minVariantPrice = prod.min_variant_price_paise != null ? paiseToInr(prod.min_variant_price_paise) : null;
              const minVariantExp100 = prod.min_variant_expected_price_100_paise != null ? paiseToInr(prod.min_variant_expected_price_100_paise) : null;
              const minVariantWholesalePc = prod.min_variant_expected_price_100_paise != null ? expPrice100PaiseToPieceInr(prod.min_variant_expected_price_100_paise) : null;

              const standalonePrice = prod.base_price_paise != null ? paiseToInr(prod.base_price_paise) : null;
              const standaloneExp100 = prod.expected_price_per_100_paise != null ? paiseToInr(prod.expected_price_per_100_paise) : null;
              const standaloneWholesalePc = prod.expected_price_per_100_paise != null ? expPrice100PaiseToPieceInr(prod.expected_price_per_100_paise) : null;

              const isUpdating = updatingId === prod.id;

              return (
                <div
                  key={prod.id}
                  className={`bg-white rounded-2xl border shadow-sm p-3.5 flex flex-col gap-3 ${
                    prod.status === 'active' ? 'border-gray-200/90' : 'border-amber-200/80 bg-amber-50/20'
                  }`}
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          prod.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {prod.status === 'active' ? 'Active' : 'Draft'}
                        </span>
                        {isVariable ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            🔀 Variant Family ({prod.variant_count})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                            📦 Standalone
                          </span>
                        )}
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
                      <div className="mt-1.5 text-xs">
                        {isVariable ? (
                          minVariantPrice != null ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-extrabold text-brand-navy">
                                From ₹{minVariantPrice.toLocaleString('en-IN')}
                              </span>
                              {minVariantWholesalePc != null && (
                                <span className="text-emerald-700 font-bold text-[11px]">
                                  • Wholesale: ₹{minVariantWholesalePc.toLocaleString('en-IN')}/pc
                                </span>
                              )}
                              {minVariantExp100 != null && (
                                <span className="text-gray-400 text-[10px]">
                                  (₹{minVariantExp100.toLocaleString('en-IN')}/100)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Pricing on request</span>
                          )
                        ) : (
                          standalonePrice != null ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-extrabold text-brand-navy">
                                ₹{standalonePrice.toLocaleString('en-IN')}
                              </span>
                              {standaloneWholesalePc != null && (
                                <span className="text-emerald-700 font-bold text-[11px]">
                                  • Wholesale: ₹{standaloneWholesalePc.toLocaleString('en-IN')}/pc
                                </span>
                              )}
                              {standaloneExp100 != null && (
                                <span className="text-gray-400 text-[10px]">
                                  (₹{standaloneExp100.toLocaleString('en-IN')}/100)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-800 italic text-[11px]">Draft &bull; Price not set</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                    <Link
                      to={`/admin/products/${prod.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] py-2 px-3 bg-brand-ivory hover:bg-brand-navy hover:text-white text-brand-navy border border-brand-navy/20 text-xs font-bold rounded-xl transition-colors text-center"
                    >
                      <span>✏️</span>
                      <span>Edit</span>
                    </Link>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleStatus(prod)}
                      className={`inline-flex items-center justify-center min-h-[44px] py-2 px-3 text-xs font-bold rounded-xl border transition-colors ${
                        prod.status === 'active'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isUpdating ? '...' : prod.status === 'active' ? 'To Draft' : 'Publish'}
                    </button>

                    {prod.slug && (
                      <a
                        href={`/products/${prod.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-2.5 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
                        title="Preview in Catalogue"
                      >
                        ↗
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(prod)}
                      className="min-h-[44px] min-w-[44px] py-2 px-2.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
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
              const isVariable = Boolean(prod.has_variants);

              // Pricing Resolution
              const minVariantPrice = prod.min_variant_price_paise != null ? paiseToInr(prod.min_variant_price_paise) : null;
              const minVariantExp100 = prod.min_variant_expected_price_100_paise != null ? paiseToInr(prod.min_variant_expected_price_100_paise) : null;
              const minVariantWholesalePc = prod.min_variant_expected_price_100_paise != null ? expPrice100PaiseToPieceInr(prod.min_variant_expected_price_100_paise) : null;

              const standalonePrice = prod.base_price_paise != null ? paiseToInr(prod.base_price_paise) : null;
              const standaloneExp100 = prod.expected_price_per_100_paise != null ? paiseToInr(prod.expected_price_per_100_paise) : null;
              const standaloneWholesalePc = prod.expected_price_per_100_paise != null ? expPrice100PaiseToPieceInr(prod.expected_price_per_100_paise) : null;

              const isUpdating = updatingId === prod.id;

              return (
                <div
                  key={prod.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group ${
                    prod.status === 'active' ? 'border-gray-200/80' : 'border-amber-300/80 bg-amber-50/10'
                  }`}
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
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {isVariable && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-navy/90 text-white shadow-sm">
                          🔀 Variant Family
                        </span>
                      )}
                      {prod.status === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white shadow-sm">
                          Draft
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
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 font-devanagari" title={prod.name_hi}>
                          {prod.name_hi}
                        </p>
                      )}
                      {isVariable && prod.variant_capacities_summary && (
                        <p className="text-[11px] text-brand-navy font-semibold mt-1 line-clamp-1">
                          Capacities: {prod.variant_capacities_summary}
                        </p>
                      )}
                    </div>

                    {/* Pricing Details */}
                    <div className="space-y-1.5 pt-1 border-t border-gray-100">
                      {isVariable ? (
                        minVariantPrice != null ? (
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-gray-500 font-medium">Selling Price:</span>
                              <span className="text-base font-extrabold text-brand-navy">
                                From ₹{minVariantPrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {minVariantWholesalePc != null && (
                              <div className="flex items-baseline justify-between text-xs">
                                <span className="text-gray-500 font-medium">Wholesale Rate:</span>
                                <span className="font-bold text-emerald-700">
                                  ₹{minVariantWholesalePc.toLocaleString('en-IN')} / piece
                                </span>
                              </div>
                            )}
                            {minVariantExp100 != null && (
                              <div className="p-2 rounded-xl bg-brand-ivory border border-brand-navy/10 flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">Price / 100 pcs:</span>
                                <span className="font-bold text-brand-navy">
                                  From ₹{minVariantExp100.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            Pricing on request (WhatsApp enquiry)
                          </p>
                        )
                      ) : (
                        standalonePrice != null ? (
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-gray-500 font-medium">Selling Price:</span>
                              <span className="text-base font-extrabold text-brand-navy">
                                ₹{standalonePrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {standaloneWholesalePc != null && (
                              <div className="flex items-baseline justify-between text-xs">
                                <span className="text-gray-500 font-medium">Wholesale Rate:</span>
                                <span className="font-bold text-emerald-700">
                                  ₹{standaloneWholesalePc.toLocaleString('en-IN')} / piece
                                </span>
                              </div>
                            )}
                            {standaloneExp100 != null && (
                              <div className="p-2 rounded-xl bg-brand-ivory border border-brand-navy/10 flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">Price / 100 pcs:</span>
                                <span className="font-bold text-brand-navy">
                                  ₹{standaloneExp100.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-800 italic">
                            Draft &bull; Pricing not yet configured
                          </p>
                        )
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Link
                        to={`/admin/products/${prod.id}/edit`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-brand-ivory hover:bg-brand-navy hover:text-white text-brand-navy border border-brand-navy/20 text-xs font-bold rounded-xl transition-colors min-h-[44px] text-center"
                      >
                        <span>✏️ Edit</span>
                      </Link>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleStatus(prod)}
                        className={`inline-flex items-center justify-center px-3 py-2.5 text-xs font-bold rounded-xl border transition-colors min-h-[44px] ${
                          prod.status === 'active'
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={prod.status === 'active' ? 'Unpublish to Draft' : 'Publish to Public Catalogue'}
                      >
                        {isUpdating ? '...' : prod.status === 'active' ? 'To Draft' : 'Publish'}
                      </button>

                      {prod.slug && (
                        <a
                          href={`/products/${prod.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
                          title="Preview Product Page"
                        >
                          ↗
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(prod)}
                        className="min-h-[44px] min-w-[44px] p-2.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
                        title="Delete product"
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

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete Product "${productToDelete?.name}"?`}
        message={
          productToDelete?.id?.startsWith('prod-')
            ? `Notice: "${productToDelete?.name}" is a protected core catalogue product. If you want to hide it from customers, set its status to "Draft" or "Archived" instead. Permanent deletion of core catalogue records is blocked.`
            : `Are you sure you want to permanently delete this product? All image records and variant configurations will be permanently removed.`
        }
        confirmLabel="Confirm Delete"
        isDanger={true}
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
      />
    </div>
  );
}
