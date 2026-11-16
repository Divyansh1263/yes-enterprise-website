import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { buildWhatsAppContactUrl } from '../lib/whatsapp';
import { getAllCategories, getAllProducts, getCategoryName } from '../data/products';
import ProductGrid from '../components/ui/ProductGrid';
import CategoryFilter from '../components/ui/CategoryFilter';
import SearchBar from '../components/ui/SearchBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Products() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const headerRef = useScrollReveal();
  const gridRef = useScrollReveal();

  // Load live categories and products
  // Note: static fixtures are passed ONLY as optional devFallback and are strictly blocked in production
  const {
    categories,
    loading: loadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useCategories(getAllCategories());

  // Keep the selected category aligned with browser navigation and external URL changes.
  useEffect(() => {
    const category = searchParams.get('category');
    if (!category || category === 'all') {
      setActiveCategory('all');
      return;
    }
    const matched = categories.find(c => c.id === category || c.slug === category);
    setActiveCategory(matched ? (matched.slug || matched.id) : category);
  }, [searchParams, categories]);

  const productParams = {
    category: activeCategory !== 'all' ? activeCategory : undefined,
    search: searchQuery.trim() || undefined,
    limit: 50
  };

  const {
    products,
    loading: loadingProducts,
    error: productsError,
    refetch: refetchProducts
  } = useProducts(productParams, getAllProducts());

  // Sync URL param when category changes
  useEffect(() => {
    const categoryInUrl = searchParams.get('category');
    const nextCategory = activeCategory === 'all' ? null : activeCategory;

    if (categoryInUrl === nextCategory) return;

    if (nextCategory) {
      setSearchParams({ category: nextCategory });
    } else {
      setSearchParams({});
    }
  }, [activeCategory, searchParams, setSearchParams]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setMobileFiltersOpen(false);
  };

  const clearFilter = () => {
    setActiveCategory('all');
    setSearchQuery('');
  };

  // Section 8: Automatically filter out empty categories (zero published products)
  const visibleCategories = (categories || []).filter(c => (c.product_count || 0) > 0);

  const activeCategoryObj = visibleCategories.find(c => c.id === activeCategory || c.slug === activeCategory);
  const activeCategoryName = activeCategoryObj
    ? getCategoryName(activeCategoryObj, lang)
    : null;

  const totalProductCount = visibleCategories.reduce((sum, c) => sum + (c.product_count || 0), 0) || (products ? products.length : 0);

  const handleRetryAll = () => {
    refetchCategories();
    refetchProducts();
  };

  const waContactUrl = buildWhatsAppContactUrl(lang);
  const hasError = Boolean(productsError && products.length === 0);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Page header ── */}
      <div className="bg-brand-ivory border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 md:py-10">
          <div ref={headerRef} className="reveal">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-navy mb-1 sm:mb-2">
              {t('products.pageTitle')}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm md:text-base">
              {activeCategoryName
                ? activeCategoryName
                : t('products.pageSubDefault')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* ── Search bar (full width) ── */}
        <div className="mb-4 sm:mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('products.searchPlaceholder')}
          />
        </div>

        {/* ── Active filter tag ── */}
        {(activeCategory !== 'all' || searchQuery.trim()) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {activeCategory !== 'all' && activeCategoryName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-navy/10 text-brand-navy text-xs sm:text-sm font-medium rounded-full">
                {t('products.activeFilter')} {activeCategoryName}
                <button
                  onClick={() => setActiveCategory('all')}
                  className="ml-1 text-brand-navy/60 hover:text-brand-navy transition-colors"
                  aria-label="Clear category filter"
                >
                  ✕
                </button>
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-amber/20 text-amber-800 text-xs sm:text-sm font-medium rounded-full">
                "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-amber-700 hover:text-amber-900 transition-colors"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={clearFilter}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Category load warning if products succeeded but categories failed ── */}
        {categoriesError && categories.length === 0 && !hasError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800">
            <span>
              {lang === 'hi'
                ? 'श्रेणी फ़िल्टर लोड नहीं हो सके। सभी उपलब्ध उत्पाद नीचे प्रदर्शित हैं।'
                : 'Category filters could not be loaded. Displaying all products below.'}
            </span>
            <button
              onClick={refetchCategories}
              className="font-bold underline underline-offset-2 ml-3 hover:text-amber-950"
            >
              {lang === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
            </button>
          </div>
        )}

        {/* ── Error / Offline State ── */}
        {hasError ? (
          <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50/60 border border-red-200 rounded-3xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center text-2xl">
              📡
            </div>
            <h2 className="text-xl font-bold text-brand-navy">
              {productsError?.toLowerCase().includes('connect') || productsError?.toLowerCase().includes('network') || productsError?.includes('504') || productsError?.includes('502')
                ? (lang === 'hi' ? 'कैटलॉग सेवा से संपर्क नहीं हो पा रहा है' : 'Unable to Connect to Catalogue Service')
                : (lang === 'hi' ? 'कैटलॉग सेवा वर्तमान में अनुपलब्ध है' : 'Catalogue Service Temporarily Offline')}
            </h2>
            <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
              {lang === 'hi'
                ? 'हम इन्वेंटरी डेटाबेस से संपर्क करने में असमर्थ हैं। वर्तमान कीमतें और स्टॉक उपलब्धता प्रदर्शित नहीं की जा सकतीं।'
                : 'Unable to connect to the live product database. Real-time prices and stock availability cannot be verified right now.'}
            </p>
            {productsError && (
              <div className="text-xs font-mono text-red-700 bg-red-100/70 border border-red-200/80 rounded-xl px-3 py-2 max-w-md mx-auto truncate" title={productsError}>
                {productsError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRetryAll}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand-navy text-white text-sm font-bold rounded-xl hover:bg-brand-navy-light transition-colors shadow-sm"
              >
                🔄 {lang === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
              </button>
              <a
                href={waContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#20b857] text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                <span>💬</span>
                <span>{lang === 'hi' ? 'WhatsApp पर सीधा ऑर्डर करें' : 'Enquire Directly on WhatsApp'}</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* ── Sidebar: category filter (desktop sticky) ── */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-2">
                  {lang === 'hi' ? 'श्रेणियाँ' : 'Categories'}
                </p>
                <CategoryFilter
                  categories={visibleCategories}
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  totalCount={totalProductCount}
                  lang={lang}
                />
              </div>
            </aside>

            {/* ── Mobile vertical category filter (zero horizontal scroll) ── */}
            <div className="lg:hidden mb-6 mobile-category-filter">
              <div className="bg-brand-ivory/60 border border-brand-navy/10 rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    {lang === 'hi' ? 'श्रेणी अनुसार उत्पाद' : 'Browse by Category'}
                  </span>
                  {activeCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleCategoryChange('all')}
                      className="text-xs font-semibold text-brand-navy hover:underline"
                    >
                      {lang === 'hi' ? 'सभी देखें' : 'View All'}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('all')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                      activeCategory === 'all'
                        ? 'bg-brand-navy text-white shadow-sm ring-1 ring-brand-navy'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200/80'
                    }`}
                  >
                    <span>{lang === 'hi' ? 'सभी उत्पाद' : 'All Products'}</span>
                    {totalProductCount > 0 && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {totalProductCount}
                      </span>
                    )}
                  </button>
                  {visibleCategories.map((c) => {
                    const cName = getCategoryName(c, lang);
                    const isSelected = activeCategory === c.id || activeCategory === c.slug;
                    const pCount = c.product_count != null ? c.product_count : null;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCategoryChange(c.slug || c.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                          isSelected
                            ? 'bg-brand-navy text-white shadow-sm ring-1 ring-brand-navy'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200/80'
                        }`}
                      >
                        <span className="text-left leading-snug">{cName}</span>
                        {pCount != null && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {pCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Product grid ── */}
            <div className="lg:col-span-3">
              {/* Result count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  <span className="font-bold text-brand-navy">{products.length}</span>{' '}
                  {products.length === 1 ? t('products.result') : t('products.results')}
                  {activeCategoryName ? ` — ${activeCategoryName}` : ''}
                </p>
              </div>

              {loadingProducts ? (
                <div className="py-20 flex justify-center">
                  <LoadingSpinner message={lang === 'hi' ? 'उत्पाद लोड हो रहे हैं...' : 'Loading live catalogue products...'} size="lg" />
                </div>
              ) : (
                <div ref={gridRef} className="reveal">
                  <ProductGrid products={products} lang={lang} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
