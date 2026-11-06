import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { getAdminProducts } from '../../services/api/products.js';
import { updateInventory, getInventoryLogs } from '../../services/api/inventory.js';

export default function AdminInventory() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'logs'

  // Products / Current Stock State
  const [products, setProducts] = useState([]);
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low_stock', 'out_of_stock'
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Audit Logs State
  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState({ total: 0, limit: 20, offset: 0, has_more: false });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);

  // Adjustment Modal State
  const [selectedItem, setSelectedItem] = useState(null); // { product_id, variant_id, name, current_stock, sku }
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Load products list
  const loadProducts = () => {
    setLoadingProducts(true);
    setProductsError(null);

    const params = { limit: 100 };
    if (stockFilter !== 'all') {
      params.stock_status = stockFilter;
    }
    if (searchQuery.trim()) {
      params.q = searchQuery.trim();
    }

    getAdminProducts(params)
      .then((res) => {
        setProducts(res.data || []);
        setLoadingProducts(false);
      })
      .catch((err) => {
        setProductsError(err.message || 'Failed to fetch inventory stock.');
        setLoadingProducts(false);
      });
  };

  // Load logs
  const loadLogs = (offset = 0) => {
    setLoadingLogs(true);
    setLogsError(null);
    getInventoryLogs({ limit: 20, offset })
      .then((res) => {
        setLogs(res.data || []);
        setLogsPagination(res.pagination);
        setLoadingLogs(false);
      })
      .catch((err) => {
        setLogsError(err.message || 'Failed to fetch inventory audit trail.');
        setLoadingLogs(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'stock') {
      loadProducts();
    } else {
      loadLogs(0);
    }
  }, [activeTab, stockFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  // Open modal for a product or variant
  const openAdjustModal = (product, variant = null) => {
    setModalError(null);
    if (variant) {
      setSelectedItem({
        product_id: product.id,
        variant_id: variant.id,
        name: `${product.name} — ${variant.title || variant.sku}`,
        sku: variant.sku,
        current_stock: variant.stock_quantity ?? 0
      });
      setNewQuantity(String(variant.stock_quantity ?? 0));
    } else {
      setSelectedItem({
        product_id: product.id,
        variant_id: null,
        name: product.name,
        sku: product.sku || 'N/A',
        current_stock: product.stock_quantity ?? 0
      });
      setNewQuantity(String(product.stock_quantity ?? 0));
    }
    setReason('');
  };

  // Submit stock adjustment
  const handleStockUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const parsedQty = parseInt(newQuantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setModalError('Please enter a valid non-negative integer for stock quantity.');
      return;
    }

    if (!reason.trim()) {
      setModalError('A reason for stock adjustment is required for the audit log.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await updateInventory({
        product_id: selectedItem.product_id,
        variant_id: selectedItem.variant_id,
        new_quantity: parsedQty,
        reason: reason.trim()
      });

      setSuccessToast(`Stock updated for ${selectedItem.name} (${selectedItem.current_stock} → ${parsedQty})`);
      setSelectedItem(null);
      loadProducts();
      // Auto-clear toast
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      setModalError(err.message || 'Failed to adjust stock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Inventory & Stock Control</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time stock monitoring, manual adjustments, and immutable audit logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'stock'
                ? 'bg-white text-brand-navy shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📦 Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'logs'
                ? 'bg-white text-brand-navy shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📜 Audit Trail
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 font-bold text-xs">✕</button>
        </div>
      )}

      {/* ── TAB 1: STOCK LEVELS ─────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Filter pills */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'low_stock', label: '⚠️ Low Stock' },
                { id: 'out_of_stock', label: '🚫 Out of Stock' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStockFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    stockFilter === f.id
                      ? 'bg-brand-navy text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
              <input
                type="text"
                placeholder="Search by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-1.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy-light shrink-0"
              >
                Search
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            {loadingProducts ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner message="Checking inventory levels..." size="lg" />
              </div>
            ) : productsError ? (
              <div className="p-8 text-center text-red-600 text-sm">
                ⚠️ {productsError}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No Products Match Filter"
                description="Try selecting a different filter or search term."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Type / SKU</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Stock Level</th>
                      <th className="px-4 py-3">Low-Stock Alert</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => {
                      const isLowStock = p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold ?? 5);
                      const isOutOfStock = p.stock_quantity <= 0;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-gray-900 block">{p.name}</span>
                            {p.name_hi && (
                              <span className="text-[11px] text-gray-400 block font-devanagari">{p.name_hi}</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {p.has_variants ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Variable ({p.variant_count || 'Multiple'} variants)
                              </span>
                            ) : (
                              <span className="font-mono text-gray-600 font-semibold">
                                {p.sku || '—'}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-gray-600">
                            {p.category_name || 'Uncategorized'}
                          </td>

                          <td className="px-4 py-3.5">
                            {p.has_variants ? (
                              <span className="text-gray-500 italic">Managed per variant</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900">
                                  {p.stock_quantity}
                                </span>
                                {isOutOfStock ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                    Out of stock
                                  </span>
                                ) : isLowStock ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Low stock
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    In stock
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-gray-500">
                            {p.has_variants ? '—' : `≤ ${p.low_stock_threshold ?? 5} units`}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            {p.has_variants ? (
                              <a
                                href={`/admin/products/${p.id}/edit`}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors inline-block text-[11px]"
                              >
                                Edit Variants
                              </a>
                            ) : (
                              <button
                                onClick={() => openAdjustModal(p)}
                                className="px-3 py-1.5 bg-brand-navy text-white font-bold rounded-lg hover:bg-brand-navy-light transition-colors shadow-sm text-[11px]"
                              >
                                ✏️ Adjust Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: AUDIT TRAIL LOGS ─────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            {loadingLogs ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner message="Loading audit history..." size="lg" />
              </div>
            ) : logsError ? (
              <div className="p-8 text-center text-red-600 text-sm">
                ⚠️ {logsError}
              </div>
            ) : logs.length === 0 ? (
              <EmptyState
                icon="📜"
                title="No Audit Records Found"
                description="Inventory changes made via the admin panel will automatically appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Item / SKU</th>
                      <th className="px-4 py-3">Movement</th>
                      <th className="px-4 py-3">Previous → New</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Updated By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {logs.map((log) => {
                      const isPositive = log.change_amount > 0;
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-sans">
                            {new Date(log.created_at).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'medium'
                            })}
                          </td>

                          <td className="px-4 py-3 font-sans">
                            <span className="font-bold text-gray-900 block">{log.product_name || 'Unknown'}</span>
                            {log.variant_title && (
                              <span className="text-[11px] text-gray-500 block">
                                Variant: {log.variant_title} ({log.variant_sku})
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                isPositive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {isPositive ? `+${log.change_amount}` : log.change_amount}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            {log.previous_quantity} → <span className="font-bold">{log.new_quantity}</span>
                          </td>

                          <td className="px-4 py-3 font-sans text-gray-800 font-medium">
                            {log.reason}
                          </td>

                          <td className="px-4 py-3 text-gray-500 font-sans text-[11px]">
                            {log.updated_by}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {logsPagination.total > logsPagination.limit && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                <span>
                  Showing {logsPagination.offset + 1}–{Math.min(logsPagination.offset + logsPagination.limit, logsPagination.total)} of {logsPagination.total} logs
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={logsPagination.offset === 0}
                    onClick={() => loadLogs(logsPagination.offset - logsPagination.limit)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!logsPagination.has_more}
                    onClick={() => loadLogs(logsPagination.offset + logsPagination.limit)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STOCK ADJUSTMENT MODAL ───────────────────────────────────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-brand-navy">
                Adjust Inventory Level
              </h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                ⚠️ {modalError}
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-gray-900">{selectedItem.name}</p>
              <p className="text-gray-500">
                SKU: <span className="font-mono text-gray-700">{selectedItem.sku}</span> | Current Stock: <span className="font-bold text-brand-navy">{selectedItem.current_stock} units</span>
              </p>
            </div>

            <form onSubmit={handleStockUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  New Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="Enter exact count"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason for Adjustment * (Audit Trail)
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Warehouse receipt, Physical stock audit, Damaged write-off"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy-light shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

