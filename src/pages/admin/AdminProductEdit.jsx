import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import ProductForm from '../../components/admin/ProductForm.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { getAdminProductById, updateProduct } from '../../services/api/products.js';

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    getAdminProductById(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err.message || 'Failed to load product details.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleUpdate = async (payload) => {
    setIsSubmitting(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateProduct(id, payload);
      setProduct(updated);
      setSuccessMessage('Product updated successfully!');
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSaveError(err.message || 'Failed to save product changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Loading product data..." size="lg" />
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white border border-gray-200 rounded-2xl p-8 space-y-4">
        <span className="text-4xl block">⚠️</span>
        <h2 className="text-lg font-bold text-gray-900">Product Not Found</h2>
        <p className="text-sm text-gray-500">{loadError || 'The requested product could not be located.'}</p>
        <Link
          to="/admin/products"
          className="inline-block px-5 py-2.5 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:bg-brand-navy-light"
        >
          Back to Product List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <Link to="/admin/products" className="hover:text-brand-navy">Products</Link>
            <span>/</span>
            <span className="text-brand-navy truncate max-w-xs">{product.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-navy">Edit Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Modify details, variants, specifications, and upload Cloudflare R2 images.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {product.slug && (
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
            >
              <span>View in Catalogue</span>
              <span>↗</span>
            </a>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <ProductForm
        isEdit={true}
        initialData={product}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        apiError={saveError}
      />
    </div>
  );
}
