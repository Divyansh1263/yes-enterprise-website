import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getProductBySlug as getFixtureProductBySlug,
  getRelatedProducts,
  getCategoryById,
  getProductName,
  getProductDescription,
  getCategoryName,
} from '../data/products';
import { useLanguage } from '../i18n';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { buildWhatsAppUrl, buildWhatsAppContactUrl } from '../lib/whatsapp';
import { getPublicProductBySlug } from '../services/api/products.js';
import { isFixtureFallbackAllowed } from '../services/api/client.js';
import { paiseToInr } from '../utils/currency.js';
import ImageGallery from '../components/ui/ImageGallery';
import ProductCard from '../components/ui/ProductCard';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ProductDetail() {
  const { slug } = useParams();
  const { t, lang, getLangPath } = useLanguage();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // 'NOT_FOUND', 'OFFLINE', null
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState('');

  const relatedRef = useScrollReveal();

  const fetchProduct = () => {
    let isMounted = true;
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    getPublicProductBySlug(slug)
      .then((data) => {
        if (isMounted) {
          if (data) {
            setProduct(data);
            if (data.has_variants && data.variants && data.variants.length > 0) {
              setSelectedVariant(data.variants[0]);
            }
          } else {
            setErrorStatus('NOT_FOUND');
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          // In local dev with explicit fallback enabled:
          if (isFixtureFallbackAllowed()) {
            const fixture = getFixtureProductBySlug(slug);
            if (fixture) {
              console.info('[ProductDetail] Using local dev fixture fallback (VITE_ENABLE_FIXTURE_FALLBACK=true).');
              setProduct(fixture);
              setIsLoading(false);
              return;
            }
          }

          // Production & default dev: live API is source of truth
          if (err.status === 404 || err.code === 'PRODUCT_NOT_FOUND') {
            setErrorStatus('NOT_FOUND');
          } else {
            setErrorStatus('OFFLINE');
            setErrorMessage(err.message || 'Unable to connect to live inventory service.');
          }
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner message={lang === 'hi' ? 'उत्पाद विवरण लोड हो रहा है...' : 'Loading product details...'} size="lg" />
      </div>
    );
  }

  // ── Network / Server Offline Error ──────────────────────────────────────────
  if (errorStatus === 'OFFLINE') {
    const directWaUrl = buildWhatsAppContactUrl(lang);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center py-20 space-y-4">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            📡
          </div>
          <h1 className="text-2xl font-bold text-brand-navy">
            {lang === 'hi' ? 'सेवा वर्तमान में अनुपलब्ध है' : 'Unable to Load Product'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {errorMessage || (lang === 'hi' ? 'सर्वर से कनेक्ट करने में समस्या हुई। कृपया पुनः प्रयास करें।' : 'Could not retrieve live pricing and inventory data from the catalogue database.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={fetchProduct}
              className="px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors text-sm"
            >
              🔄 {lang === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
            </button>
            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20b857] transition-colors text-sm"
            >
              <span>💬</span>
              <span>{lang === 'hi' ? 'WhatsApp पूछताछ' : 'Enquire on WhatsApp'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Product not found (404) ────────────────────────────────────────────────
  if (errorStatus === 'NOT_FOUND' || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center py-20">
          <div className="w-20 h-20 bg-brand-ivory rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brand-navy/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-brand-navy mb-3">
            {t('detail.notFound')}
          </h1>
          <p className="text-gray-500 mb-8">
            {t('detail.notFoundSub')}
          </p>
          <Link
            to={getLangPath('/products')}
            className="inline-flex items-center px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors"
          >
            {t('detail.browseProducts')}
          </Link>
        </div>
      </div>
    );
  }

  const category = product.category || getCategoryById(product.category_id);
  const relatedProducts = getRelatedProducts(product, 3);
  const productName = getProductName(product, lang);
  const productDesc = getProductDescription(product, lang);
  const categoryName = category ? getCategoryName(category, lang) : '';

  // WhatsApp enquiry detail with variant awareness
  const enquiryItemName = selectedVariant
    ? `${productName} (${selectedVariant.title || selectedVariant.sku})`
    : productName;

  const waUrl = buildWhatsAppUrl({
    productName: enquiryItemName,
    productUrl: typeof window !== 'undefined' ? window.location.href : '',
    quantity: quantity ? parseInt(quantity, 10) : undefined,
    lang,
  });

  // Calculate active price
  let displayPrice = null;
  if (selectedVariant && selectedVariant.price_paise != null) {
    displayPrice = paiseToInr(selectedVariant.price_paise);
  } else if (product.base_price_paise != null) {
    displayPrice = paiseToInr(product.base_price_paise);
  }

  // Specifications
  let specsList = [];
  if (product.specifications) {
    if (Array.isArray(product.specifications)) {
      specsList = product.specifications;
    } else if (typeof product.specifications === 'object') {
      specsList = Object.entries(product.specifications).map(([key, value]) => ({ key, value }));
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className="bg-brand-ivory border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link to={getLangPath('/')} className="hover:text-brand-navy transition-colors">
              {t('nav.home')}
            </Link>
            <span className="text-gray-300">/</span>
            <Link to={getLangPath('/products')} className="hover:text-brand-navy transition-colors">
              {t('nav.products')}
            </Link>
            {category && (
              <>
                <span className="text-gray-300">/</span>
                <Link
                  to={getLangPath(`/products?category=${category.slug || category.id}`)}
                  className="hover:text-brand-navy transition-colors"
                >
                  {categoryName}
                </Link>
              </>
            )}
            <span className="text-gray-300">/</span>
            <span className="text-brand-navy font-medium truncate max-w-[160px]">
              {productName}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Main product section ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="lg:grid lg:grid-cols-2 lg:gap-14 xl:gap-20">

          {/* Left: Image gallery */}
          <div className="mb-10 lg:mb-0">
            <ImageGallery images={product.images || []} productName={productName} />
          </div>

          {/* Right: Product info */}
          <div className="flex flex-col">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {category && (
                <Badge variant="primary">{categoryName}</Badge>
              )}
              {product.brand && product.brand !== 'YE' && product.brand !== 'YES ENTERPRISES' && (
                <Badge variant="teal">{product.brand}</Badge>
              )}
              {(product.status === 'out_of_stock' || (product.stock_quantity !== undefined && product.stock_quantity <= 0)) && (
                <Badge variant="warning">{t('detail.outOfStock')}</Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy leading-snug mb-3">
              {productName}
            </h1>

            {/* Price Header (if available) */}
            {displayPrice != null && (
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-brand-navy">
                  ₹{displayPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-gray-500">
                  {lang === 'hi' ? '(थोक दर के लिए संपर्क करें)' : '(Wholesale pricing on request)'}
                </span>
              </div>
            )}

            {/* Description */}
            {productDesc && (
              <p className="text-gray-600 leading-relaxed mb-6">
                {productDesc}
              </p>
            )}

            {/* Variable Product Options / Variant Selection */}
            {product.has_variants && product.variants && product.variants.length > 0 && (
              <div className="bg-brand-ivory/60 border border-brand-navy/10 rounded-2xl p-5 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    {lang === 'hi' ? 'वेरिएंट चुनें' : 'Select Option / Variant'}
                  </h3>
                  {selectedVariant && (
                    <span className="text-xs font-mono text-gray-500">
                      SKU: {selectedVariant.sku}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const vTitle = (lang === 'hi' && v.title_hi) ? v.title_hi : (v.title || v.sku);
                    const vPrice = paiseToInr(v.price_paise);

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-brand-navy bg-white ring-2 ring-brand-navy/20 shadow-sm'
                            : 'border-gray-200 bg-white/70 hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-xs font-bold ${isSelected ? 'text-brand-navy' : 'text-gray-800'}`}>
                          {vTitle}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ₹{vPrice.toLocaleString('en-IN')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specs table */}
            <div className="bg-brand-ivory rounded-2xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-brand-navy uppercase tracking-wide mb-4">
                {t('detail.productDetails')}
              </h2>
              <dl className="space-y-3 text-sm">
                {product.material && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-gray-500 font-medium shrink-0">{t('detail.material')}</dt>
                    <dd className="text-gray-800 text-right">{product.material}</dd>
                  </div>
                )}
                {product.capacity && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-gray-500 font-medium shrink-0">{t('detail.capacity')}</dt>
                    <dd className="text-gray-800 text-right">{product.capacity}</dd>
                  </div>
                )}
                {product.colours && product.colours.length > 0 && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-gray-500 font-medium shrink-0">
                      {product.colours.length === 1 ? t('detail.colour') : t('detail.colours')}
                    </dt>
                    <dd className="text-gray-800 text-right">
                      {product.colours.join(', ')}
                    </dd>
                  </div>
                )}
                {product.brand && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-gray-500 font-medium shrink-0">{t('detail.brand')}</dt>
                    <dd className="text-gray-800 text-right">{product.brand}</dd>
                  </div>
                )}
                {/* Dynamic specs from D1 */}
                {specsList.map((spec, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <dt className="text-gray-500 font-medium shrink-0">{spec.key}</dt>
                    <dd className="text-gray-800 text-right">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Provisional note */}
            {product.notes && (
              <div className="flex items-start gap-3 p-4 bg-brand-amber/10 border border-brand-amber/30 rounded-xl mb-6">
                <svg className="w-4 h-4 text-brand-amber shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-amber-800 leading-relaxed">
                  <span className="font-semibold">{t('detail.note')}: </span>
                  {product.notes}
                </p>
              </div>
            )}

            {/* Price / contact */}
            <div className="border border-gray-200 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-brand-navy mb-1">
                {t('detail.contactForPrice')}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {t('detail.contactSub')}
              </p>

              {/* Quantity input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t('detail.quantityLabel')}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder={t('detail.quantityPlaceholder')}
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy/40 bg-white"
                />
              </div>

              {/* WhatsApp CTA */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#25D366] hover:bg-[#20b857] text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t('detail.whatsappCta')}
              </a>
            </div>

            {/* Back to catalogue */}
            <Link
              to={getLangPath('/products')}
              className="inline-flex items-center gap-1.5 text-sm text-brand-navy/70 hover:text-brand-navy transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {lang === 'hi' ? 'सभी उत्पाद देखें' : 'Back to all products'}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Related products ─────────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <section className="bg-brand-ivory border-t border-gray-200 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div ref={relatedRef} className="reveal mb-8">
              <h2 className="text-xl font-bold text-brand-navy">
                {t('detail.relatedTitle')}
              </h2>
              {category && (
                <p className="text-sm text-gray-500 mt-1">
                  {t('detail.relatedSub')} {categoryName}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Sticky WhatsApp button (mobile only) ─────────────────────────────── */}
      <div className="sticky-enquiry lg:hidden">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 px-6 py-4 bg-[#25D366] hover:bg-[#20b857] text-white font-semibold rounded-2xl shadow-lg transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {t('detail.whatsappCta')}
        </a>
      </div>
    </div>
  );
}
