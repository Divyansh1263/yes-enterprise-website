import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from '../../services/api/categories.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import ConfirmModal from '../../components/admin/ConfirmModal.jsx';
import { slugify } from '../../utils/slugify.js';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Edit / Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null for new, object for edit
  const [formData, setFormData] = useState({
    name: '',
    name_hi: '',
    slug: '',
    description: '',
    description_hi: '',
    image_url: '',
    sort_order: 0,
    is_active: true
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminCategories({ cache: 'no-cache' });
      setCategories(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      name_hi: '',
      slug: '',
      description: '',
      description_hi: '',
      image_url: '',
      sort_order: categories.length + 1,
      is_active: true
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      name_hi: cat.name_hi || '',
      slug: cat.slug || '',
      description: cat.description || '',
      description_hi: cat.description_hi || '',
      image_url: cat.image_url || '',
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active !== undefined ? Boolean(cat.is_active) : true
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val) => {
    setFormData(prev => ({
      ...prev,
      name: val,
      // Auto-slugify on creation if slug hasn't been manually diverged
      slug: !editingCategory ? slugify(val) : prev.slug
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      name: formData.name.trim(),
      name_hi: formData.name_hi.trim() || undefined,
      slug: formData.slug.trim().toLowerCase(),
      description: formData.description.trim() || undefined,
      description_hi: formData.description_hi.trim() || undefined,
      sort_order: parseInt(formData.sort_order, 10) || 0,
      is_active: formData.is_active
    };

    if (!payload.name) {
      setFormError('Category name is required.');
      setFormSubmitting(false);
      return;
    }

    if (!payload.slug) {
      setFormError('Slug is required.');
      setFormSubmitting(false);
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        setSuccessMessage(`Category "${payload.name}" updated successfully.`);
      } else {
        await createCategory(payload);
        setSuccessMessage(`Category "${payload.name}" created successfully.`);
      }
      setIsModalOpen(false);
      await fetchCategories();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to save category.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDeleteModal = (cat) => {
    setCategoryToDelete(cat);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    const totalCount = categoryToDelete.total_count ?? categoryToDelete.product_count ?? 0;
    if (totalCount > 0) {
      setDeleteError(`Cannot delete category "${categoryToDelete.name}" because it contains ${totalCount} product(s) (${categoryToDelete.active_count || 0} active, ${categoryToDelete.draft_count || 0} draft). Please reassign or delete these products before deleting this category.`);
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCategory(categoryToDelete.id);
      setSuccessMessage(`Category "${categoryToDelete.name}" deleted.`);
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      await fetchCategories();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      if (err.status === 409 || err.code === 'CATEGORY_IN_USE') {
        setDeleteError(`Cannot delete "${categoryToDelete.name}" because products still reference it.`);
      } else {
        setDeleteError(err.message || 'Failed to delete category.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;

    const orders = newCats.map((cat, i) => ({
      id: cat.id,
      sort_order: i + 1
    }));

    setCategories(newCats);
    try {
      await reorderCategories(orders);
    } catch (err) {
      setError('Failed to update sort order on server.');
      await fetchCategories();
    }
  };

  if (loading && categories.length === 0) {
    return <LoadingSpinner message="Loading categories from database..." />;
  }

  const publicCategoriesCount = categories.filter(c => (c.active_count ?? 0) > 0 || c.is_publicly_visible).length;
  const draftOnlyCategoriesCount = categories.filter(c => ((c.active_count ?? 0) === 0 && (c.draft_count ?? 0) > 0)).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Back Navigation ──────────────────────────────────────────────── */}
      <div>
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy/70 hover:text-brand-navy transition-colors min-h-[36px]"
        >
          <span>←</span> Back to Products
        </Link>
      </div>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Category Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Organize catalogue categories. Exactly <strong className="text-brand-navy">{publicCategoriesCount} categories</strong> are publicly visible with active products; <strong className="text-amber-800">{draftOnlyCategoriesCount} draft-only category</strong> is preserved.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-navy text-white text-sm font-bold rounded-xl hover:bg-brand-navy-light shadow-sm transition-colors min-h-[44px]"
        >
          <span>➕</span> Add New Category
        </button>
      </div>

      {/* ── Guidance Banner ──────────────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 bg-brand-ivory border border-brand-navy/10 rounded-2xl text-xs text-brand-navy flex items-start gap-2.5">
        <span className="text-base shrink-0">ℹ️</span>
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold">Public Catalogue Category Rule</p>
          <p className="text-gray-600">
            The public website displays only categories that contain at least one published, active product. Categories with only draft products (like <em>Plastic Feeding Bottles</em>) remain preserved here in Admin and will automatically appear on the public website as soon as any product inside them is published.
          </p>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between">
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 sm:p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900 font-bold min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
        </div>
      )}

      {/* ── Categories Display (Desktop Table + Mobile Cards) ────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        
        {/* DESKTOP TABLE (Hidden on mobile, preserved on md: and up) */}
        <div data-desktop-category-table="true" className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-bold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5 w-16">Order</th>
                <th className="px-6 py-3.5">Category Name</th>
                <th className="px-6 py-3.5">Hindi Name</th>
                <th className="px-6 py-3.5">URL Slug</th>
                <th className="px-6 py-3.5">Public Visibility</th>
                <th className="px-6 py-3.5">Products Breakdown</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No categories found. Click "Add New Category" above to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => {
                  const activeCount = cat.active_count ?? (cat.status === 'active' ? cat.product_count : 0) ?? 0;
                  const draftCount = cat.draft_count ?? 0;
                  const totalCount = cat.total_count ?? (activeCount + draftCount);
                  const isPublic = activeCount > 0 || cat.is_publicly_visible;

                  return (
                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Order Controls */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-400">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, -1)}
                            disabled={index === 0}
                            className="p-1 hover:text-gray-700 disabled:opacity-20 min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <span className="font-mono text-xs font-semibold text-gray-600 w-4 text-center">
                            {cat.sort_order ?? index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, 1)}
                            disabled={index === categories.length - 1}
                            className="p-1 hover:text-gray-700 disabled:opacity-20 min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {cat.name}
                        {cat.description && (
                          <p className="text-xs text-gray-400 font-normal line-clamp-1 mt-0.5">{cat.description}</p>
                        )}
                      </td>

                      {/* Hindi Name */}
                      <td className="px-6 py-4 text-gray-700 font-medium font-devanagari">
                        {cat.name_hi || <span className="text-gray-300 italic">—</span>}
                      </td>

                      {/* Slug */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        {cat.slug}
                      </td>

                      {/* Public Visibility */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPublic ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <span>✅</span>
                            <span>Public ({activeCount} active)</span>
                          </span>
                        ) : draftCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800" title="Hidden from public catalogue because all products are drafts">
                            <span>🔒</span>
                            <span>Hidden (Drafts Only)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <span>⚪</span>
                            <span>Empty (Hidden)</span>
                          </span>
                        )}
                      </td>

                      {/* Products Count Breakdown */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                            {activeCount} active
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {draftCount} draft
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            (Total: {totalCount})
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            className="px-3 py-1.5 text-xs font-semibold text-brand-navy bg-brand-ivory hover:bg-brand-navy hover:text-white rounded-lg transition-colors border border-brand-navy/20 min-h-[36px]"
                          >
                            Edit
                          </button>
                          {totalCount > 0 ? (
                            <button
                              type="button"
                              disabled
                              title={`Cannot delete category because it contains ${totalCount} product(s). Reassign or delete products first.`}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-100 rounded-lg border border-gray-200 cursor-not-allowed min-h-[36px]"
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(cat)}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-colors border border-red-200 min-h-[36px]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS (Visible on < md screens: compact vertical cards) */}
        <div data-mobile-category-cards="true" className="md:hidden divide-y divide-gray-100">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic text-sm">
              No categories found. Click "Add New Category" above to create one.
            </div>
          ) : (
            categories.map((cat, index) => {
              const activeCount = cat.active_count ?? (cat.status === 'active' ? cat.product_count : 0) ?? 0;
              const draftCount = cat.draft_count ?? 0;
              const totalCount = cat.total_count ?? (activeCount + draftCount);
              const isPublic = activeCount > 0 || cat.is_publicly_visible;

              return (
                <div key={cat.id} className="p-4 space-y-3">
                  {/* Header: Name, Hindi, and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">
                        {cat.name}
                      </h3>
                      {cat.name_hi && (
                        <p className="text-xs text-gray-500 font-devanagari mt-0.5">
                          {cat.name_hi}
                        </p>
                      )}
                      <span className="font-mono text-[11px] text-gray-400 block mt-1">
                        /{cat.slug}
                      </span>
                    </div>

                    <div>
                      {isPublic ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                          ✅ Public ({activeCount})
                        </span>
                      ) : draftCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">
                          🔒 Hidden (Drafts)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                          Empty
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Counts Breakdown */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                      {activeCount} active
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                      {draftCount} draft
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      (Total {totalCount} products)
                    </span>
                  </div>

                  {cat.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {cat.description}
                    </p>
                  )}

                  {/* Bottom Row: Reordering controls and Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                    {/* Reorder controls */}
                    <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-20 min-h-[36px] min-w-[36px] flex items-center justify-center font-bold text-sm"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <span className="font-mono text-xs font-bold text-gray-700 px-1">
                        #{cat.sort_order ?? index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(index, 1)}
                        disabled={index === categories.length - 1}
                        className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-20 min-h-[36px] min-w-[36px] flex items-center justify-center font-bold text-sm"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Actions with >= 44px touch targets */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(cat)}
                        className="px-3.5 py-2.5 text-xs font-bold text-brand-navy bg-brand-ivory hover:bg-brand-navy hover:text-white rounded-xl transition-colors border border-brand-navy/20 min-h-[44px] flex items-center justify-center"
                      >
                        ✏️ Edit
                      </button>
                      {totalCount > 0 ? (
                        <button
                          type="button"
                          disabled
                          title={`Cannot delete category because it contains ${totalCount} products.`}
                          className="px-3 py-2.5 text-xs font-semibold text-gray-400 bg-gray-100 rounded-xl border border-gray-200 cursor-not-allowed min-h-[44px] flex items-center justify-center"
                        >
                          🗑️
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(cat)}
                          className="px-3.5 py-2.5 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 rounded-xl transition-colors border border-red-200 min-h-[44px] flex items-center justify-center"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Add / Edit Category Modal ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-100 my-8">
            <div className="bg-brand-navy px-5 sm:px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base sm:text-lg">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-5 sm:p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm font-medium">
                    ⚠️ {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category Name (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-white"
                    placeholder="e.g. Stainless Steel Feeding Bottles"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Hindi Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.name_hi}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_hi: e.target.value }))}
                    className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 font-devanagari bg-white"
                    placeholder="e.g. स्टेनलेस स्टील फीडिंग बोतलें"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    URL Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-gray-50"
                    placeholder="e.g. ss-feeding-bottles"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Used in catalogue filtering and URLs (lowercase, hyphens only).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-white"
                    placeholder="Brief description for public catalogue..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Description (Hindi)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description_hi}
                    onChange={(e) => setFormData(prev => ({ ...prev, description_hi: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 font-devanagari bg-white"
                    placeholder="सार्वजनिक कैटलॉग के लिए विवरण..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white"
                    />
                  </div>

                  <div className="flex items-center pt-1 sm:pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy w-4 h-4"
                      />
                      Active in Catalogue
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 min-h-[44px] text-sm font-bold text-white bg-brand-navy hover:bg-brand-navy-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={
          (categoryToDelete?.total_count || 0) > 0
            ? `Cannot Delete Category "${categoryToDelete?.name}"`
            : `Delete Category "${categoryToDelete?.name}"?`
        }
        message={
          deleteError
            ? deleteError
            : (categoryToDelete?.total_count || 0) > 0
            ? `This category contains ${categoryToDelete.total_count} product(s) (${categoryToDelete.active_count || 0} active, ${categoryToDelete.draft_count || 0} draft). Categories containing products cannot be deleted. Please reassign or delete these products first.`
            : `Are you sure you want to delete this category? This action cannot be undone.`
        }
        confirmLabel={(categoryToDelete?.total_count || 0) > 0 ? undefined : "Confirm Delete"}
        isDanger={true}
        isLoading={deleting}
        onConfirm={(categoryToDelete?.total_count || 0) > 0 ? () => setDeleteModalOpen(false) : handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
