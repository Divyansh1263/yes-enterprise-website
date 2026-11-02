import { useState } from 'react'

/**
 * ImageGallery — product image gallery with thumbnail selection.
 * Supports clicking thumbnails to change the main image.
 */
export default function ImageGallery({ images = [], productName = 'Product' }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 border border-gray-100">
        <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  const activeImage = images[activeIndex]

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
        <img
          src={activeImage.src}
          alt={activeImage.alt || `${productName} image ${activeIndex + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails — only show when multiple images */}
      {images.length > 1 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(images.length, 5)}, 1fr)` }}>
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                index === activeIndex
                  ? 'border-brand-navy ring-1 ring-brand-navy/20'
                  : 'border-gray-100 hover:border-gray-300'
              }`}
              aria-label={`View image ${index + 1} of ${images.length}`}
            >
              <img
                src={img.src}
                alt={img.alt || `${productName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

