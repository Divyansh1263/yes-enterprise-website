import { Link } from 'react-router-dom'
import { buildWhatsAppUrl } from '../../lib/whatsapp'
import Badge from './Badge'

/**
 * ProductCard — displays a single product in the catalogue grid.
 * Uses actual product images from /assets/.
 */
export default function ProductCard({ product }) {
  const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0]
  const categoryLabel = product.category_id?.replace(/-/g, ' ').replace(/\bss\b/g, 'SS')

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300"
    >
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {primaryImage ? (
          <img
            src={primaryImage.src}
            alt={primaryImage.alt || product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        {product.status === 'out_of_stock' && (
          <div className="absolute top-3 left-3">
            <Badge variant="warning">Out of Stock</Badge>
          </div>
        )}

        {/* Image count indicator */}
        {product.images?.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {product.images.length} photos
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {/* Category */}
        <p className="text-xs font-medium text-brand-navy/60 uppercase tracking-wider mb-1.5">
          {categoryLabel}
        </p>

        {/* Product name */}
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug mb-2 group-hover:text-brand-navy transition-colors line-clamp-2">
          {product.name}
        </h3>

        {/* Capacity */}
        {product.capacity_ml && (
          <p className="text-xs text-gray-500 mb-3">
            {product.capacity_ml.length > 1
              ? `${product.capacity_ml.join(' / ')} ml`
              : `${product.capacity_ml[0]} ml`}
          </p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs sm:text-sm font-medium text-gray-500">
            Contact for price
          </span>
          <span
            onClick={(e) => {
              e.preventDefault()
              const url = buildWhatsAppUrl({ productName: product.name })
              if (url !== '#') window.open(url, '_blank', 'noopener')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            role="button"
            aria-label={`Enquire about ${product.name} on WhatsApp`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.494A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.306-2.65.887.886-2.648-.335-.433A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
            </svg>
            Enquire
          </span>
        </div>
      </div>
    </Link>
  )
}

