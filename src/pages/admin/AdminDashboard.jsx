import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts } from '../../services/api/products.js';
import { getAdminCategories } from '../../services/api/categories.js';
import { getInventoryLogs } from '../../services/api/inventory.js';
import { getR2ImageUrl } from '../../services/api/uploads.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    archivedProducts: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0,
    totalCategories: 0,
    totalImages: 0,
    recentProducts: [],
    recentLogs: []
  });

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsRes, catsRes, logsRes] = await Promise.all([
        getAdminProducts({ limit: 100 }),
        getAdminCategories(),
        getInventoryLogs({ limit: 8 }).catch(() => ({ data: [] }))
      ]);

      const products = prodsRes.data || [];
      const totalProducts = prodsRes.pagination?.total ?? products.length;
      const activeProducts = products.filter(p => p.status === 'active').length;
      const draftProducts = products.filter(p => p.status === 'draft').length;
      const archivedProducts = products.filter(p => p.status === 'archived').length;

      const outOfStockProducts = products.filter(p => (p.stock_quantity ?? 0) === 0).length;
      const lowStockProducts = products.filter(p => {
        const stock = p.stock_quantity ?? 0;
        const threshold = p.low_stock_threshold ?? 5;
        return stock > 0 && stock <= threshold;
      }).length;

      // Calculate total images from products
      const totalImages = products.reduce((acc, p) => acc + (p.image_count ?? (p.primary_image_key ? 1 : 0)), 0);

      // Sort recent products by updated_at or created_at descending
      const sortedRecent = [...products].sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      }).slice(0, 6);

      const allCats = catsRes || [];
      const publicCats = allCats.filter(c => (c.active_count ?? 0) > 0 || c.is_publicly_visible).length;
      const draftCats = allCats.filter(c => (c.active_count ?? 0) === 0 && (c.draft_count ?? 0) > 0).length;

      setMetrics({
        totalProducts,
        activeProducts,
        draftProducts,
        archivedProducts,
        outOfStockProducts,
        lowStockProducts,
        totalCategories: allCats.length,
        publicCategories: publicCats,
        draftCategories: draftCats,
        totalImages,
        recentProducts: sortedRecent,
        recentLogs: logsRes.data || []
      });
    } catch (err) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-2/3 sm:w-1/3 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 sm:p-8 border border-red-200 text-center max-w-lg mx-auto my-8 sm:my-12 shadow-sm">
        <span className="text-4xl block mb-3">⚠️</span>
        <h3 className="text-base font-bold text-red-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-red-700 mb-5 leading-relaxed">{error}</p>
        <button
          onClick={loadDashboardData}
          className="px-5 py-3 min-h-[44px] bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
        >
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
              Admin Overview
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-soft-blue/30 text-brand-navy border border-brand-navy/10">
              Admin Control Panel
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Wholesale catalogue management dashboard &bull; YES ENTERPRISES
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>🌐</span> Public Site ↗
          </a>
          <button
            onClick={loadDashboardData}
            className="px-3.5 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
          <Link
            to="/admin/products/new"
            className="px-4 py-2.5 min-h-[44px] bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy-light shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>➕</span> Add Product
          </Link>
        </div>
      </div>

      {/* ── Primary Statistic Cards ─────────────────────────────────────── */}
      {/* Mobile: 2 compact cards for Products & Categories; Desktop: 5-column grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Products Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Products</span>
              <span className="text-base">📦</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-brand-navy">{metrics.totalProducts}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-2 font-medium">
            <span className="text-emerald-700 font-semibold">{metrics.activeProducts} active</span>
            <span>•</span>
            <span className="text-gray-500">{metrics.draftProducts} draft</span>
          </div>
        </div>

        {/* Categories Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Categories</span>
              <span className="text-base">🏷️</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-brand-navy">{metrics.totalCategories}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-2 font-medium">
            <span className="text-emerald-700 font-semibold">{metrics.publicCategories} public</span>
            <span>•</span>
            <span className="text-amber-800 font-semibold">{metrics.draftCategories} draft only</span>
          </div>
        </div>

        {/* Low Stock Card (Desktop) */}
        <div className="hidden lg:flex bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Low Stock</span>
              <span className="text-base">⚠️</span>
            </div>
            <p className="text-3xl font-extrabold text-amber-600">{metrics.lowStockProducts}</p>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">≤ threshold items</p>
        </div>

        {/* Out of Stock Card (Desktop) */}
        <div className="hidden lg:flex bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-red-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Out of Stock</span>
              <span className="text-base">🚫</span>
            </div>
            <p className="text-3xl font-extrabold text-red-600">{metrics.outOfStockProducts}</p>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">0 units recorded</p>
        </div>

        {/* Total Images Managed Card (Desktop) */}
        <div className="hidden lg:flex bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-purple-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Managed Media</span>
              <span className="text-base">🖼️</span>
            </div>
            <p className="text-3xl font-extrabold text-purple-700">{metrics.totalImages}</p>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">Images in catalogue &amp; R2</p>
        </div>
      </div>

      {/* ── Quick Action Tiles ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Link
          to="/admin/products"
          className="group p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-navy/40 hover:shadow-md transition-all flex items-center justify-between min-h-[56px]"
        >
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-brand-navy text-sm">Product Catalogue</h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage products, pricing, and photos ({metrics.totalProducts})</p>
          </div>
          <span className="text-gray-400 group-hover:text-brand-navy group-hover:translate-x-1 transition-transform font-bold text-lg">→</span>
        </Link>

        <Link
          to="/admin/categories"
          className="group p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-navy/40 hover:shadow-md transition-all flex items-center justify-between min-h-[56px]"
        >
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-brand-navy text-sm">Manage Categories</h3>
            <p className="text-xs text-gray-500 mt-0.5">Organize product categories and display order ({metrics.totalCategories})</p>
          </div>
          <span className="text-gray-400 group-hover:text-brand-navy group-hover:translate-x-1 transition-transform font-bold text-lg">→</span>
        </Link>

        <Link
          to="/admin/products/new"
          className="group p-4 sm:p-5 bg-brand-navy text-white rounded-2xl border border-brand-navy hover:bg-brand-navy-light hover:shadow-md transition-all flex items-center justify-between min-h-[56px]"
        >
          <div>
            <h3 className="font-bold text-white text-sm">Add New Product</h3>
            <p className="text-xs text-white/70 mt-0.5">Publish new wholesale item with name &amp; category</p>
          </div>
          <span className="text-brand-amber font-bold text-xl">+</span>
        </Link>
      </div>

      {/* ── Recent Activity & Products ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recently Updated Products</h2>
              <Link to="/admin/products" className="text-xs font-semibold text-brand-navy hover:underline min-h-[36px] flex items-center">
                View All ({metrics.totalProducts}) →
              </Link>
            </div>

            {metrics.recentProducts.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-8 text-center">No products found in database.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {metrics.recentProducts.map((prod) => (
                  <div key={prod.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
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
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/admin/products/${prod.id}/edit`}
                          className="text-sm font-semibold text-gray-900 hover:text-brand-navy truncate block min-h-[24px]"
                        >
                          {prod.name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 truncate">
                          <span className="capitalize px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {prod.status || 'active'}
                          </span>
                          {prod.slug && (
                            <a
                              href={`/products/${prod.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-navy hover:underline text-[11px]"
                              title="View in Public Catalogue"
                            >
                              Public Link ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/admin/products/${prod.id}/edit`}
                      className="px-3 py-2 bg-gray-50 hover:bg-brand-navy hover:text-white rounded-xl text-xs font-bold text-brand-navy border border-gray-200 transition-colors shrink-0 min-h-[44px] flex items-center"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Catalogue Info & Quick Guidance */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Catalogue Quick Help</h2>
              <span className="text-xs text-gray-400 font-mono">v1.0</span>
            </div>

            <div className="space-y-3 text-xs text-gray-600">
              <div className="p-3.5 bg-brand-ivory/60 rounded-xl border border-brand-navy/10">
                <p className="font-bold text-brand-navy mb-1">🏷️ Mandatory Fields</p>
                <p>Only English Product Name and Category are required to publish any product. All prices, specifications, and images are optional.</p>
              </div>

              <div className="p-3.5 bg-brand-ivory/60 rounded-xl border border-brand-navy/10">
                <p className="font-bold text-brand-navy mb-1">📸 Smartphone Photo Uploads</p>
                <p>Photos can be uploaded directly from phone camera or gallery. High-resolution images are compressed automatically before storage.</p>
              </div>

              <div className="p-3.5 bg-brand-ivory/60 rounded-xl border border-brand-navy/10">
                <p className="font-bold text-brand-navy mb-1">💬 WhatsApp Pricing Enquiry</p>
                <p>If product price is left blank, public visitors will see a direct WhatsApp quotation enquiry button instead.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
