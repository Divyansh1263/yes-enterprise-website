import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n';
import { getProductName } from '../../data/products';
import { getR2ImageUrl } from '../../services/api/uploads.js';
import { paiseToInr, expPrice100PaiseToPieceInr } from '../../utils/currency.js';

export default function ProductCard({ product }) {
  const { t, lang, getLangPath } = useLanguage();
  const primary = product.images?.find(i => i.is_primary) || product.images?.[0];
  const name = getProductName(product, lang);

  const isVariable = Boolean(product.has_variants);
  const activeVariants = Array.isArray(product.variants)
    ? product.variants.filter(v => v.status === 'active')
    : [];

  // Determine starting price for variable products
  let minPricePaise = product.min_variant_price_paise ?? null;
  if (minPricePaise == null && activeVariants.length > 0) {
    const prices = activeVariants.map(v => v.price_paise).filter(p => p != null);
    if (prices.length > 0) minPricePaise = Math.min(...prices);
  }

  // Wholesale & Crossed-out pricing resolution
  let cardCrossedOutInr = null;
  let cardActualInr = null;

  if (isVariable) {
    if (activeVariants.length > 0) {
      const parsedVariants = activeVariants.map(v => {
        let vCrossed = v.compare_at_price_paise != null && v.compare_at_price_paise > 0 ? paiseToInr(v.compare_at_price_paise) : null;
        let vAct = v.price_paise != null && v.price_paise > 0 ? paiseToInr(v.price_paise) : null;
        if (vCrossed == null && v.expected_price_per_100_paise != null && (v.expected_price_per_100_paise / 100) < (v.price_paise || 0)) {
          vCrossed = paiseToInr(v.price_paise);
          vAct = expPrice100PaiseToPieceInr(v.expected_price_per_100_paise);
        }
        return { crossed: vCrossed, actual: vAct };
      }).filter(v => v.actual != null);

      if (parsedVariants.length > 0) {
        parsedVariants.sort((a, b) => a.actual - b.actual);
        cardActualInr = parsedVariants[0].actual;
        cardCrossedOutInr = parsedVariants[0].crossed;
      }
    }
  } else {
    if (product.compare_at_price_paise != null && product.compare_at_price_paise > 0) {
      cardCrossedOutInr = paiseToInr(product.compare_at_price_paise);
    }
    if (product.base_price_paise != null && product.base_price_paise > 0) {
      cardActualInr = paiseToInr(product.base_price_paise);
    }
    if (cardCrossedOutInr == null && product.expected_price_per_100_paise != null && (product.expected_price_per_100_paise / 100) < (product.base_price_paise || 0)) {
      cardCrossedOutInr = paiseToInr(product.base_price_paise);
      cardActualInr = expPrice100PaiseToPieceInr(product.expected_price_per_100_paise);
    }
  }

  // Determine available capacities for variable products
  let capacities = product.available_capacities || [];
  if ((!capacities || capacities.length === 0) && product.variant_capacities_summary) {
    capacities = product.variant_capacities_summary.split(', ').map(s => s.trim()).filter(Boolean);
  }
  if ((!capacities || capacities.length === 0) && activeVariants.length > 0) {
    capacities = activeVariants.map(v => (lang === 'hi' && v.title_hi) ? v.title_hi : v.title).filter(Boolean);
  }

  // Simple product capacity display fallback
  const simpleCapacity = Array.isArray(product.capacity)
    ? product.capacity.join(' / ')
    : product.capacity;

  const simpleCapacityDisplay = simpleCapacity
    || (product.capacity_ml
      ? (Array.isArray(product.capacity_ml) ? `${product.capacity_ml.join(' / ')} ml` : `${product.capacity_ml} ml`)
      : product.material);

  // Robust image source resolution across fixtures, R2 keys, and direct URLs
  const rawImage = primary?.image_key
    || product.primary_image_key
    || primary?.src
    || primary?.url;
  const imageSrc = rawImage ? getR2ImageUrl(rawImage) : null;

  const imageAlt = primary?.alt || primary?.alt_text || name;

  // Category name resolution
  const categoryDisplay = (lang === 'hi' && (product.category?.name_hi || product.category_name_hi))
    ? (product.category?.name_hi || product.category_name_hi)
    : (product.category?.name || product.category_name || (typeof product.category_id === 'string' ? product.category_id.replace(/-/g, ' ') : ''));

  return (
    <Link
      to={`${getLangPath('/products')}/${product.slug}`}
      className="product-card group bg-white rounded-xl sm:rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-card hover:shadow-lg transition-all"
    >
      {/* Image Container with neutral background and contain fit */}
      <div className="relative aspect-square bg-[#F7F5EF] overflow-hidden flex items-center justify-center p-2.5 sm:p-3.5">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt}
            width="300"
            height="300"
            decoding="async"
            className="product-card-img w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <NoImageIcon />
          </div>
        )}

        {/* Unavailable overlay */}
        {(product.status === 'unavailable' || product.status === 'out_of_stock') && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
            <span className="bg-white/95 text-gray-800 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              {t('detail.outOfStock')}
            </span>
          </div>
        )}

        {/* Image count badge */}
        {(product.images?.length > 1 || product.images_count > 1) && (
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 bg-black/50 backdrop-blur-sm text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            {product.images?.length || product.images_count} 📷
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-3.5 flex flex-col flex-1">
        {/* Category pill */}
        {categoryDisplay && (
          <p className="text-[9px] sm:text-[10px] font-semibold text-brand-amber uppercase tracking-wider mb-1 truncate">
            {categoryDisplay}
          </p>
        )}

        {/* Name (approx 2 lines) */}
        <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug mb-1 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] group-hover:text-brand-navy transition-colors">
          {name}
        </h3>

        {/* Capacity Display */}
        {isVariable ? (
          capacities.length > 0 && (
            <div className="flex flex-wrap gap-1 my-1.5">
              {capacities.slice(0, 4).map((cap, idx) => (
                <span
                  key={idx}
                  className="inline-block px-1.5 py-0.5 bg-brand-ivory text-brand-navy border border-brand-navy/10 text-[9px] sm:text-[10px] font-semibold rounded"
                >
                  {cap}
                </span>
              ))}
              {capacities.length > 4 && (
                <span className="inline-block px-1 py-0.5 text-gray-400 text-[9px] font-semibold">
                  +{capacities.length - 4}
                </span>
              )}
            </div>
          )
        ) : (
          simpleCapacityDisplay && (
            <p className="text-[10px] sm:text-xs text-gray-500 truncate mb-1">
              {simpleCapacityDisplay}
            </p>
          )
        )}

        {/* Wholesale & Crossed-out Pricing Slot */}
        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
          {cardActualInr != null ? (
            <div className="flex flex-col items-start w-full">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {cardCrossedOutInr != null && cardCrossedOutInr > cardActualInr && (
                  <span className="line-through text-gray-400 text-xs sm:text-sm font-medium">
                    ₹{cardCrossedOutInr.toLocaleString('en-IN')}
                  </span>
                )}
                {isVariable && (
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-500">
                    {lang === 'hi' ? 'से शुरू: ' : 'From '}
                  </span>
                )}
                <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                  ₹{cardActualInr.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-medium tracking-tight">
                {lang === 'hi' ? 'थोक मूल्य / पीस' : 'Wholesale / piece'}
              </span>
            </div>
          ) : (
            <span className="text-[10px] sm:text-xs font-semibold text-brand-navy">
              {lang === 'hi' ? 'मूल्य के लिए संपर्क करें' : 'Contact for Price'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function NoImageIcon() {
  return (
    <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
