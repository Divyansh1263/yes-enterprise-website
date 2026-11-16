import { useState } from 'react';
import { getR2ImageUrl } from '../../services/api/uploads.js';

export default function ImageGallery({ images = [], productName = 'Product' }) {
  const [active, setActive] = useState(0);

  if (!images || !images.length) {
    return (
      <div className="aspect-square bg-brand-ivory rounded-2xl flex items-center justify-center text-gray-200 border border-gray-100">
        <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const resolveUrl = (img) => {
    if (!img) return '';
    const raw = img.image_key || img.src || img.url || (typeof img === 'string' ? img : '');
    return getR2ImageUrl(raw);
  };

  const activeImg = images[active] || images[0];
  const activeUrl = resolveUrl(activeImg);

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="w-full max-h-[320px] sm:max-h-[440px] aspect-square bg-[#F7F5EF] rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center p-2 sm:p-4">
        <img
          key={active}
          src={activeUrl}
          alt={activeImg?.alt || activeImg?.alt_text || `${productName} — view ${active + 1}`}
          className="w-full h-full object-contain transition-opacity duration-300"
        />
      </div>

      {/* Thumbnails row (horizontally scrollable on mobile) */}
      {images.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {images.map((img, i) => {
            const thumbUrl = resolveUrl(img);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 aspect-square rounded-xl overflow-hidden border-2 bg-white p-1 transition-all ${
                  i === active
                    ? 'border-brand-navy ring-2 ring-brand-navy/30 scale-105'
                    : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                }`}
                aria-label={`View image ${i + 1}`}
              >
                <img
                  src={thumbUrl}
                  alt={img.alt || img.alt_text || `${productName} thumbnail ${i + 1}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
