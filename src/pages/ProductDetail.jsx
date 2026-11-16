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
import { getPublicProductBySlug, getPublicProducts } from '../services/api/products.js';
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
  const [similarProducts, setSimilarProducts] = useState([]);

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
              const activeVariants = data.variants.filter(v => v.status === 'active');
              if (activeVariants.length > 0) {
                const parseCap = (str) => {
                  const m = String(str || '').match(/(\d+(?:\.\d+)?)\s*(ml|l|litre|kg|g)?/i);
                  if (!m) return 999999;
                  let val = parseFloat(m[1]);
                  if (m[2] && (m[2].toLowerCase() === 'l' || m[2].toLowerCase() === 'litre')) val *= 1000;
                  return val;
                };

                const sorted = [...activeVariants].sort((a, b) => {
                  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                  const capA = parseCap(a.title);
                  const capB = parseCap(b.title);
                  if (capA !== capB) return capA - capB;
                  return (a.price_paise || 0) - (b.price_paise || 0);
                });
                setSelectedVariant(sorted[0]);
              }
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

  useEffect(() => {
    if (!product) {
      setSimilarProducts([]);
      return;
    }
    const catId = product.category_id || (product.category && (product.category.slug || product.category.id));
    if (!catId) return;

    let isMounted = true;
    getPublicProducts({ category: catId, limit: 12 })
      .then((res) => {
        if (!isMounted) return;
        const filtered = (res.data || [])
          .filter(p => p.id !== product.id && p.slug !== product.slug)
          .slice(0, 4);
        setSimilarProducts(filtered);
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = getRelatedProducts(product, 4);
        setSimilarProducts(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, [product]);

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

  // Calculate active price, wholesale rate per 100, and effective MOQ
  let displayPrice = null;
  let displayExpectedPrice100 = null;
  let effectiveMoq = product.min_order_quantity || null;

  if (selectedVariant) {
    if (selectedVariant.price_paise != null) {
      displayPrice = paiseToInr(selectedVariant.price_paise);
    }
    if (selectedVariant.expected_price_per_100_paise != null) {
      displayExpectedPrice100 = paiseToInr(selectedVariant.expected_price_per_100_paise);
    }
    if (selectedVariant.min_order_quantity != null) {
      effectiveMoq = selectedVariant.min_order_quantity;
    }
  } else if (!product.has_variants) {
    if (product.base_price_paise != null) {
      displayPrice = paiseToInr(product.base_price_paise);
    }
    if (product.expected_price_per_100_paise != null) {
      displayExpectedPrice100 = paiseToInr(product.expected_price_per_100_paise);
    }
  }

  // Gallery images with variant prioritization and shared family fallback
  let displayImages = product.images || [];
  if (product.has_variants && selectedVariant) {
    const variantImages = (product.images || []).filter(img => img.variant_id === selectedVariant.id);
    const sharedImages = (product.images || []).filter(img => !img.variant_id);
    const otherVariantImages = (product.images || []).filter(img => img.variant_id && img.variant_id !== selectedVariant.id);
    if (variantImages.length > 0) {
      displayImages = [...variantImages, ...sharedImages, ...otherVariantImages];
    } else if (sharedImages.length > 0) {
      displayImages = [...sharedImages, ...otherVariantImages];
    }
  }

  // WhatsApp enquiry detail with variant awareness and dual pricing
  const variantTitle = selectedVariant ? ((lang === 'hi' && selectedVariant.title_hi) ? selectedVariant.title_hi : (selectedVariant.title || selectedVariant.sku)) : '';
  const enquiryItemName = selectedVariant
    ? `${productName} (${variantTitle})${displayPrice != null ? ` - ₹${displayPrice}/pc` : ''}${displayExpectedPrice100 != null ? ` (Approx ₹${displayExpectedPrice100.toLocaleString('en-IN')}/100 pcs)` : ''}`
    : productName;

  const effectiveQty = quantity ? parseInt(quantity, 10) : (effectiveMoq || undefined);
  const waUrl = buildWhatsAppUrl({
    productName: enquiryItemName,
    productUrl: typeof window !== 'undefined' ? window.location.href : '',
    quantity: effectiveQty,
    lang,
  });

  // Specifications sanitization and deduplication
  let cleanMaterial = product.material;
  if (cleanMaterial) {
    if (/unconfirmed/i.test(cleanMaterial)) {
      cleanMaterial = cleanMaterial.replace(/inner body material unconfirmed/i, '').replace(/;\s*$/, '').trim();
      if (!cleanMaterial) cleanMaterial = 'Silicone';
    }
  }

  let specsList = [];
  const rawSpecs = [];
  if (product.specifications) {
    if (Array.isArray(product.specifications)) {
      rawSpecs.push(...product.specifications);
    } else if (typeof product.specifications === 'object') {
      rawSpecs.push(...Object.entries(product.specifications).map(([key, value]) => ({ key, value })));
    }
  } else if (product.specifications_json) {
    try {
      const parsed = typeof product.specifications_json === 'string' ? JSON.parse(product.specifications_json) : product.specifications_json;
      if (Array.isArray(parsed)) {
        rawSpecs.push(...parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        rawSpecs.push(...Object.entries(parsed).map(([key, value]) => ({ key, value })));
      }
    } catch {}
  }

  const renderedKeys = new Set();
  if (cleanMaterial) renderedKeys.add('material');
  if (product.capacity) renderedKeys.add('capacity');
  if (product.colours && product.colours.length > 0) {
    renderedKeys.add('colour');
    renderedKeys.add('colours');
  }
  if (product.brand && product.brand !== 'YES ENTERPRISES' && product.brand !== 'YE') renderedKeys.add('brand');

  for (const s of rawSpecs) {
    if (!s || !s.key || !s.value) continue;
    const keyNorm = String(s.key).trim().toLowerCase();
    const valStr = String(s.value).trim();
    if (!valStr) continue;
    if (renderedKeys.has(keyNorm)) continue;
    if (/cannot be confirmed/i.test(valStr)) continue;
    renderedKeys.add(keyNorm);
    specsList.push({ key: s.key, value: valStr });
  }

  const hasSpecs = Boolean(
    cleanMaterial ||
    product.capacity ||
    (product.colours && product.colours.length > 0) ||
    (product.brand && product.brand !== 'YES ENTERPRISES' && product.brand !== 'YE') ||
    specsList.length > 0
  );

  const displayNotes = product.notes && !/cannot be confirmed/i.test(product.notes) ? product.notes : null;

  return (
    <div className="min-h-screen bg-white pb-12">
      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className="bg-brand-ivory border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 leading-normal" aria-label="Breadcrumb">
            <Link to={getLangPath('/')} className="hover:text-brand-navy transition-colors shrink-0 font-medium">
              {t('nav.home')}
            </Link>
            <span className="text-gray-300 shrink-0">/</span>
            <Link to={getLangPath('/products')} className="hover:text-brand-navy transition-colors shrink-0 font-medium">
              {t('nav.products')}
            </Link>
            {category && (
              <>
                <span className="text-gray-300 shrink-0">/</span>
                <Link
                  to={getLangPath(`/products?category=${category.slug || category.id}`)}
                  className="hover:text-brand-navy transition-colors shrink-0 font-medium"
                >
                  {categoryName}
                </Link>
              </>
            )}
            <span className="text-gray-300 shrink-0">/</span>
            <span
              className="text-brand-navy font-semibold truncate max-w-[220px] sm:max-w-md inline-block align-bottom"
              title={productName}
            >
              {productName}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Main product section ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-14">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-start">

          {/* Left: Controlled Image gallery */}
          <div className="mb-6 lg:mb-0">
            <ImageGallery key={selectedVariant?.id || 'default'} images={displayImages} productName={productName} />
          </div>

          {/* Right: Product info */}
          <div className="flex flex-col">
            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-navy leading-snug mb-2">
              {productName}
            </h1>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {category && (
                <Badge variant="primary">{categoryName}</Badge>
              )}
              {product.brand && product.brand !== 'YE' && product.brand !== 'YES ENTERPRISES' && (
                <Badge variant="teal">{product.brand}</Badge>
              )}
              {(product.status === 'unavailable' || product.status === 'out_of_stock') && (
                <Badge variant="warning">{t('detail.outOfStock')}</Badge>
              )}
            </div>

            {/* Description */}
            {productDesc && (
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-4">
                {productDesc}
              </p>
            )}

            {/* Price Header */}
            {displayPrice != null ? (
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-brand-navy">
                  {lang === 'hi' ? 'मूल्य: ' : 'Price: '}₹{displayPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-gray-500">
                  {lang === 'hi' ? '(थोक दर के लिए संपर्क करें)' : '(Wholesale rate)'}
                </span>
              </div>
            ) : (
              <div className="mb-4">
                <span className="text-base sm:text-lg font-bold text-brand-navy">
                  {lang === 'hi' ? 'मूल्य के लिए संपर्क करें' : 'Contact us for pricing'}
                </span>
              </div>
            )}

            {/* Pills: MOQ & Expected Price per 100 */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {effectiveMoq != null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <span className="font-semibold text-emerald-800">
                    {lang === 'hi' ? 'MOQ:' : 'MOQ:'}
                  </span>
                  <span className="font-bold text-emerald-900">
                    {effectiveMoq} {lang === 'hi' ? 'पीस' : 'pcs'}
                  </span>
                </div>
              )}

              {displayExpectedPrice100 != null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-ivory border border-brand-navy/15 rounded-xl text-xs">
                  <span className="font-semibold text-gray-700">
                    {lang === 'hi' ? '100 पीस अनुमानित:' : 'Per 100 pcs:'}
                  </span>
                  <span className="font-bold text-brand-navy">
                    ₹{displayExpectedPrice100.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Variable Product Options / Variant Selection */}
            {product.has_variants && product.variants && product.variants.filter(v => v.status === 'active').length > 0 && (
              <div className="bg-brand-ivory/60 border border-brand-navy/10 rounded-2xl p-4 mb-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    {lang === 'hi' ? 'वेरिएंट चुनें' : 'Select Option / Variant'}
                  </h3>
                  {selectedVariant && (
                    <span className="text-[11px] font-mono text-gray-500">
                      {selectedVariant.sku ? `SKU: ${selectedVariant.sku}` : ''}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {product.variants.filter(v => v.status === 'active').map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const vTitle = (lang === 'hi' && v.title_hi) ? v.title_hi : (v.title || v.sku);
                    const vPrice = v.price_paise != null ? paiseToInr(v.price_paise) : null;
                    const vP100 = v.expected_price_per_100_paise != null ? paiseToInr(v.expected_price_per_100_paise) : null;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] ${
                          isSelected
                            ? 'border-brand-navy bg-white ring-2 ring-brand-navy/20 shadow-sm'
                            : 'border-gray-200 bg-white/70 hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-xs font-bold ${isSelected ? 'text-brand-navy' : 'text-gray-800'}`}>
                          {vTitle}
                        </p>
                        {vPrice != null && (
                          <p className="text-[11px] font-semibold text-brand-navy mt-0.5">
                            ₹{vPrice.toLocaleString('en-IN')}
                          </p>
                        )}
                        {vP100 != null && (
                          <p className="text-[10px] text-gray-500">
                            100 pcs: ₹{vP100.toLocaleString('en-IN')}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specs table */}
            {hasSpecs && (
              <div className="bg-brand-ivory rounded-2xl p-4 sm:p-5 mb-5 border border-brand-navy/10">
                <h2 className="text-xs sm:text-sm font-bold text-brand-navy uppercase tracking-wide mb-3">
                  {t('detail.productDetails')}
                </h2>
                <dl className="divide-y divide-gray-200/60 text-xs sm:text-sm">
                  {cleanMaterial && (
                    <div className="grid grid-cols-3 py-2">
                      <dt className="col-span-1 text-gray-500 font-medium">{t('detail.material')}</dt>
                      <dd className="col-span-2 text-gray-900 font-semibold text-right break-words">{cleanMaterial}</dd>
                    </div>
                  )}
                  {product.capacity && (
                    <div className="grid grid-cols-3 py-2">
                      <dt className="col-span-1 text-gray-500 font-medium">{t('detail.capacity')}</dt>
                      <dd className="col-span-2 text-gray-900 font-semibold text-right break-words">{product.capacity}</dd>
                    </div>
                  )}
                  {product.colours && product.colours.length > 0 && (
                    <div className="grid grid-cols-3 py-2">
                      <dt className="col-span-1 text-gray-500 font-medium">
                        {product.colours.length === 1 ? t('detail.colour') : t('detail.colours')}
                      </dt>
                      <dd className="col-span-2 text-gray-900 font-semibold text-right break-words">
                        {product.colours.join(', ')}
                      </dd>
                    </div>
                  )}
                  {product.brand && product.brand !== 'YES ENTERPRISES' && product.brand !== 'YE' && (
                    <div className="grid grid-cols-3 py-2">
                      <dt className="col-span-1 text-gray-500 font-medium">{t('detail.brand')}</dt>
                      <dd className="col-span-2 text-gray-900 font-semibold text-right break-words">{product.brand}</dd>
                    </div>
                  )}
                  {/* Dynamic specs from D1 */}
                  {specsList.map((spec, i) => (
                    <div key={i} className="grid grid-cols-3 py-2">
                      <dt className="col-span-1 text-gray-500 font-medium">{spec.key}</dt>
                      <dd className="col-span-2 text-gray-900 font-semibold text-right break-words">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Note if valid */}
            {displayNotes && (
              <div className="flex items-start gap-2.5 p-3.5 bg-brand-amber/10 border border-brand-amber/30 rounded-xl mb-5">
                <svg className="w-4 h-4 text-brand-amber shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold">{t('detail.note')}: </span>
                  {displayNotes}
                </p>
              </div>
            )}

            {/* Quantity & WhatsApp card */}
            <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 mb-5 bg-white shadow-sm">
              <p className="text-xs sm:text-sm font-semibold text-brand-navy mb-1">
                {t('detail.contactForPrice')}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {t('detail.contactSub')}
              </p>

              {/* Quantity input */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t('detail.quantityLabel')}
                  {product.min_order_quantity && (
                    <span className="ml-1 text-[11px] text-emerald-600 font-medium">
                      ({lang === 'hi' ? `न्यूनतम: ${product.min_order_quantity} पीस` : `Min: ${product.min_order_quantity} pcs`})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder={product.min_order_quantity ? `${product.min_order_quantity}` : t('detail.quantityPlaceholder')}
                  min={product.min_order_quantity || 1}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy/40 bg-white"
                />
              </div>

              {/* WhatsApp CTA */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="product-enquiry-wa-btn w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20b857] text-white font-bold rounded-xl transition-colors shadow-sm text-sm min-h-[44px]"
              >
                <WaIcon className="w-5 h-5 shrink-0" />
                <span>{t('detail.whatsappCta')}</span>
              </a>
            </div>

            {/* Back to catalogue */}
            <Link
              to={getLangPath('/products')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-brand-navy/70 hover:text-brand-navy transition-colors self-start"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {lang === 'hi' ? 'सभी उत्पाद देखें' : 'Back to all products'}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Similar Products ─────────────────────────────────────────────────── */}
      {similarProducts.length > 0 && (
        <section className="bg-brand-ivory border-t border-gray-200 py-8 sm:py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div ref={relatedRef} className="reveal mb-5 sm:mb-8">
              <h2 className="text-lg sm:text-2xl font-bold text-brand-navy">
                {lang === 'hi' ? 'समान उत्पाद' : 'Similar Products'}
              </h2>
              {category && (
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {lang === 'hi' ? 'इस श्रेणी के अन्य उत्पाद:' : 'More products in'} {categoryName}
                </p>
              )}
            </div>
            {/* 2-column mobile grid for similar products! */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {similarProducts.map(p => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function WaIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.494A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.306-2.65.887.886-2.648-.335-.433A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    </svg>
  );
}
