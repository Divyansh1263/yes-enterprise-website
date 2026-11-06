import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts } from '../../services/api/products.js';
import { getPublicCategories } from '../../services/api/categories.js';
import { getInventoryLogs } from '../../services/api/inventory.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatInr } from '../../utils/currency.js';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0,
    totalCategories: 0,
    recentProducts: [],
    recentLogs: []
  });

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsRes, catsRes, logsRes] = await Promise.all([
        getAdminProducts({ limit: 50 }),
        getPublicCategories(),
        getInventoryLogs({ limit: 5 })
      ]);

      const products = prodsRes.data || [];
      const totalProducts = prodsRes.pagination?.total ?? products.length;
      const activeProducts = products.filter(p => p.status === 'active').length;
      const outOfStockProducts = products.filter(p => (p.stock_quantity ?? 0) === 0).length;
      const lowStockProducts = products.filter(p => {
        const stock = p.stock_quantity ?? 0;
        const threshold = p.low_stock_threshold ?? 5;
        return stock > 0 && stock <= threshold;
      }).length;

      // Sort recent products by updated_at or created_at descending
      const sortedRecent = [...products].sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      }).slice(0, 5);

      setMetrics({
        totalProducts,
        activeProducts,
        outOfStockProducts,
        lowStockProducts,
        totalCategories: (catsRes || []).length,
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
    return <LoadingSpinner message="Loading live dashboard statistics from database..." />;
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 border border-red-100 text-center">
        <h3 className="text-base font-bold text-red-800 mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Live metrics from Cloudflare D1 database and R2 storage.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh Data
          </button>
          <Link
            to="/admin/products/new"
            className="px-4 py-2 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy-light shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>➕</span> Add Product
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Products</span>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-3xl font-extrabold text-brand-navy">{metrics.activeProducts}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">{metrics.totalProducts} total in database</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Categories</span>
            <span className="text-lg">🏷️</span>
          </div>
          <p className="text-3xl font-extrabold text-brand-navy">{metrics.totalCategories}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Public catalogue lines</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock</span>
            <span className="text-lg">⚠️</span>
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{metrics.lowStockProducts}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">At or below threshold</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Out of Stock</span>
            <span className="text-lg">🚫</span>
          </div>
          <p className="text-3xl font-extrabold text-red-600">{metrics.outOfStockProducts}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">0 units remaining</p>
        </div>
      </div>

      {/* ── Quick Action Tiles ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/products"
          className="group p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-navy/30 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-brand-navy text-sm">Manage Products</h3>
            <p className="text-xs text-gray-500 mt-0.5">Edit, duplicate, delete and configure variants</p>
          </div>
          <span className="text-gray-400 group-hover:text-brand-navy font-bold text-lg">→</span>
        </Link>

        <Link
          to="/admin/categories"
          className="group p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-navy/30 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-brand-navy text-sm">Manage Categories</h3>
            <p className="text-xs text-gray-500 mt-0.5">Add, reorder and update category lines</p>
          </div>
          <span className="text-gray-400 group-hover:text-brand-navy font-bold text-lg">→</span>
        </Link>

        <Link
          to="/admin/inventory"
          className="group p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-navy/30 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-brand-navy text-sm">Update Stock & Logs</h3>
            <p className="text-xs text-gray-500 mt-0.5">Quick inventory changes and audit trail</p>
          </div>
          <span className="text-gray-400 group-hover:text-brand-navy font-bold text-lg">→</span>
        </Link>
      </div>

      {/* ── Recent Activity & Products ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recently Updated Products</h2>
            <Link to="/admin/products" className="text-xs font-semibold text-brand-navy hover:underline">
              View All ({metrics.totalProducts})
            </Link>
          </div>

          {metrics.recentProducts.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">No products found in database.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {metrics.recentProducts.map((prod) => (
                <div key={prod.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/products/${prod.id}/edit`}
                      className="text-sm font-semibold text-gray-900 hover:text-brand-navy truncate block"
                    >
                      {prod.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      SKU: <span className="font-mono text-gray-600">{prod.sku || 'N/A'}</span> • Stock: {prod.stock_quantity ?? 0}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-gray-900 block">{formatInr(prod.base_price_paise)}</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${
                        prod.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : prod.status === 'draft'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {prod.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Inventory Adjustments */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Stock Adjustments</h2>
            <Link to="/admin/inventory" className="text-xs font-semibold text-brand-navy hover:underline">
              View History
            </Link>
          </div>

          {metrics.recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">No inventory logs recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {metrics.recentLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900">{log.reason || 'Stock Update'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">
                      {log.updated_by || 'Admin'} • {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold ${
                        (log.change_amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {(log.change_amount ?? 0) > 0 ? `+${log.change_amount}` : log.change_amount}
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {log.previous_quantity} → {log.new_quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
