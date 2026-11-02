import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProductBySlug, getRelatedProducts, getCategoryById } from '../data/products'
import ImageGallery from '../components/ui/ImageGallery'
import WhatsAppButton from '../components/ui/WhatsAppButton'
import ProductCard from '../components/ui/ProductCard'
import Badge from '../components/ui/Badge'
import SectionHeading from '../components/ui/SectionHeading'

export default function ProductDetail() {
  const { slug } = useParams()
  const product = getProductBySlug(slug)
  const [quantity, setQuantity] = useState('')

  // Product not found
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-2xl font-bold text-brand-navy mb-3">Product Not Found</h1>
        <p className="text-gray-500 mb-6">
          The product you're looking for doesn't exist or may have been removed.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors"
        >
          ← Browse Products
        </Link>
      </div>
    )
  }

  const category = getCategoryById(product.category_id)
  const relatedProducts = getRelatedProducts(product, 3)
  const productUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div>
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-brand-navy transition-colors">Home</Link>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link to="/products" className="hover:text-brand-navy transition-colors">Products</Link>
            {category && (
              <>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link
                  to={`/products?category=${category.id}`}
                  className="hover:text-brand-navy transition-colors"
                >
                  {category.name}
                </Link>
              </>
            )}
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-brand-navy font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* ── Image Gallery ── */}
          <div>
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          {/* ── Product Info ── */}
          <div className="space-y-6">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {product.status === 'out_of_stock' && (
                <Badge variant="warning">Out of Stock</Badge>
              )}
              {product.brand_label && (
                <Badge variant="info">{product.brand_label}</Badge>
              )}
              {category && (
                <Badge>{category.name}</Badge>
              )}
            </div>

            {/* Product name */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {/* Specifications table */}
            <div className="bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-100">
              <h3 className="font-semibold text-brand-navy text-sm uppercase tracking-wider mb-4">
                Product Details
              </h3>
              <dl className="space-y-3">
                {product.material && (
                  <div className="flex items-start text-sm">
                    <dt className="w-28 sm:w-32 text-gray-500 shrink-0">Material</dt>
                    <dd className="text-gray-800 font-medium">{product.material}</dd>
                  </div>
                )}
                {product.capacity_ml && (
                  <div className="flex items-start text-sm">
                    <dt className="w-28 sm:w-32 text-gray-500 shrink-0">Capacity</dt>
                    <dd className="text-gray-800 font-medium">
                      {product.capacity_ml.length > 1
                        ? product.capacity_ml.map(c => `${c} ml`).join(', ')
                        : `${product.capacity_ml[0]} ml`}
                    </dd>
                  </div>
                )}
                {product.colours && product.colours.length > 0 && (
                  <div className="flex items-start text-sm">
                    <dt className="w-28 sm:w-32 text-gray-500 shrink-0">
                      {product.colours.length > 1 ? 'Colours' : 'Colour'}
                    </dt>
                    <dd className="text-gray-800 font-medium">
                      {product.colours.join(', ')}
                    </dd>
                  </div>
                )}
                {product.brand_label && (
                  <div className="flex items-start text-sm">
                    <dt className="w-28 sm:w-32 text-gray-500 shrink-0">Brand</dt>
                    <dd className="text-gray-800 font-medium">{product.brand_label}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Pricing */}
            <div className="border-t border-gray-100 pt-6">
              <p className="text-lg font-semibold text-brand-navy mb-1">Contact for Price</p>
              <p className="text-sm text-gray-500 mb-6">
                Send us a WhatsApp message to get the latest pricing and availability.
              </p>

              {/* Quantity input (optional) */}
              <div className="mb-4">
                <label htmlFor="enquiry-quantity" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quantity needed (optional)
                </label>
                <input
                  id="enquiry-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full sm:w-40 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                />
              </div>

              {/* WhatsApp CTA */}
              <WhatsAppButton
                productName={product.name}
                productUrl={productUrl}
                quantity={quantity ? parseInt(quantity, 10) : undefined}
                size="lg"
                className="w-full sm:w-auto"
              />
            </div>

            {/* Notes (provisional) */}
            {product.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-700 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>Note:</strong> {product.notes}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-12 border-t border-gray-100">
            <SectionHeading
              title="Related Products"
              subtitle={`More from ${category?.name || 'this category'}`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
