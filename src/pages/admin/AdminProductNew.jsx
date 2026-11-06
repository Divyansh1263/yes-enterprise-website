import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ProductForm from '../../components/admin/ProductForm.jsx';
import { createProduct } from '../../services/api/products.js';

export default function AdminProductNew() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createProduct(payload);
      // Navigate to the edit view so seller can immediately upload images if desired
      navigate(`/admin/products/${created.id}/edit`, {
        state: { message: `Product "${created.name}" created successfully! You can now upload images.` }
      });
    } catch (err) {
      setError(err.message || 'Failed to create product. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <Link to="/admin/products" className="hover:text-brand-navy">Products</Link>
            <span>/</span>
            <span className="text-brand-navy">New Product</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-navy">Add New Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a new product with custom variants, pricing, and specifications.
          </p>
        </div>
      </div>

      <ProductForm
        isEdit={false}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        apiError={error}
      />
    </div>
  );
}
