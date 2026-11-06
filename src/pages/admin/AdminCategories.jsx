import { useState, useEffect } from 'react';
import {
  getPublicCategories,
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
      const data = await getPublicCategories({ cache: 'no-cache' });
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

    if (!formData.name.trim()) {
      setFormError('Category name in English is required.');
      setFormSubmitting(false);
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('URL slug is required.');
      setFormSubmitting(false);
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        setSuccessMessage(`Category "${formData.name}" updated successfully.`);
      } else {
        await createCategory(formData);
        setSuccessMessage(`Category "${formData.name}" created successfully.`);
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
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCategory(categoryToDelete.id);
      setSuccessMessage(`Category "${categoryToDelete.name}" deleted successfully.`);
      setDeleteModalOpen(false);
      await fetchCategories();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      // Backend returns 409 if category has products
      if (err.status === 409 || err.code === 'CATEGORY_HAS_PRODUCTS') {
        setDeleteError(`Cannot delete category: ${err.message || 'Products still reference this category. Reassign or delete those products first.'}`);
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

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Category Management</h1>
          <p className="text-sm text-gray-500 mt-1">Organize catalogue categories and manage display ordering.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-navy text-white text-sm font-bold rounded-xl hover:bg-brand-navy-light shadow-sm transition-colors"
        >
          <span>➕</span> Add New Category
        </button>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900 font-bold">✕</button>
        </div>
      )}

      {/* ── Categories Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-bold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5 w-16">Order</th>
                <th className="px-6 py-3.5">Category Name</th>
                <th className="px-6 py-3.5">Hindi Name</th>
                <th className="px-6 py-3.5">URL Slug</th>
                <th className="px-6 py-3.5">Active Products</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    No categories found. Click "Add New Category" above to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat, index) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Order Controls */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-400">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, -1)}
                          disabled={index === 0}
                          className="p-1 hover:text-gray-700 disabled:opacity-20"
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
                          className="p-1 hover:text-gray-700 disabled:opacity-20"
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
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {cat.name_hi || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* Slug */}
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {cat.slug}
                    </td>

                    {/* Product count */}
                    <td className="px-6 py-4 text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {cat.product_count ?? 0} products
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-navy/5 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(cat)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Category Modal ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingCategory ? `Edit "${editingCategory.name}"` : 'Add New Category'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                    placeholder="e.g. Glass Feeding Bottles"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category Name (Hindi)
                  </label>
                  <input
                    type="text"
                    value={formData.name_hi}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_hi: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                    placeholder="उदा. कांच की फीडिंग बोतलें"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                    placeholder="glass-feeding-bottles"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
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
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                    placeholder="सार्वजनिक कैटलॉग के लिए विवरण..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
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

              <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-brand-navy hover:bg-brand-navy-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
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
        title={`Delete Category "${categoryToDelete?.name}"?`}
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to delete this category? If any products reference it, the server will strictly reject deletion to protect data integrity.`
        }
        confirmLabel="Confirm Delete"
        isDanger={true}
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}

