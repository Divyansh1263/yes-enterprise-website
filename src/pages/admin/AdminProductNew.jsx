import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ProductForm from '../../components/admin/ProductForm.jsx';
import { createProduct } from '../../services/api/products.js';
import { executeDirectImageUpload } from '../../services/api/uploads.js';

export default function AdminProductNew() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleCreate = async (payload, pendingFiles = []) => {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage('Creating product record...');
    try {
      const created = await createProduct(payload);

      let uploadSuccessCount = 0;
      if (pendingFiles && pendingFiles.length > 0) {
        setStatusMessage(`Uploading ${pendingFiles.length} photo${pendingFiles.length > 1 ? 's' : ''}...`);
        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          try {
            await executeDirectImageUpload(file, {
              product_id: created.id,
              alt_text: file.name.replace(/\.[^/.]+$/, ''),
              is_primary: i === 0,
              sort_order: i + 1
            });
            uploadSuccessCount++;
          } catch (uploadErr) {
            console.error(`Failed to upload ${file.name}:`, uploadErr);
          }
        }
      }

      const msg = uploadSuccessCount > 0
        ? `Product "${created.name}" created with ${uploadSuccessCount} photo${uploadSuccessCount > 1 ? 's' : ''}!`
        : `Product "${created.name}" created successfully!`;

      navigate(`/admin/products/${created.id}/edit`, {
        state: { message: msg }
      });
    } catch (err) {
      setError(err.message || 'Failed to create product. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
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
            Quickly add a product with only Product Name and Category, or expand additional details.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-brand-soft-blue/20 border border-brand-navy/20 text-brand-navy rounded-xl text-sm font-medium flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
          <span>{statusMessage}</span>
        </div>
      )}

      <ProductForm
        isEdit={false}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        apiError={error}
      />
    </div>
  );
}
