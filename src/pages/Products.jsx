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

  const activeCategoryObj = categories.find(c => c.id === activeCategory || c.slug === activeCategory);
  const activeCategoryName = activeCategoryObj
    ? getCategoryName(activeCategoryObj, lang)
    : null;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div ref={headerRef} className="reveal">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-2">
              {t('products.pageTitle')}
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              {activeCategoryName
                ? activeCategoryName
                : t('products.pageSubDefault')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Search bar (full width) ── */}
        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('products.searchPlaceholder')}
          />
        </div>

        {/* ── Active filter tag ── */}
        {(activeCategory !== 'all' || searchQuery.trim()) && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {activeCategory !== 'all' && activeCategoryName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-navy/10 text-brand-navy text-sm font-medium rounded-full">
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-amber/20 text-amber-800 text-sm font-medium rounded-full">
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

        {/* ── Error / Offline State ── */}
        {hasError ? (
          <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50/60 border border-red-200 rounded-3xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center text-2xl">
              📡
            </div>
            <h2 className="text-xl font-bold text-brand-navy">
              {lang === 'hi' ? 'कैटलॉग सेवा वर्तमान में अनुपलब्ध है' : 'Catalogue Service Temporarily Offline'}
            </h2>
            <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
              {lang === 'hi'
                ? 'हम इन्वेंटरी डेटाबेस से संपर्क करने में असमर्थ हैं। वर्तमान कीमतें और स्टॉक उपलब्धता प्रदर्शित नहीं की जा सकतीं।'
                : 'Unable to connect to the live product database. Real-time prices and stock availability cannot be verified right now.'}
            </p>

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
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  lang={lang}
                />
              </div>
            </aside>

            {/* ── Mobile filter toggle ── */}
            <div className="lg:hidden mb-5">
              <button
                onClick={() => setMobileFiltersOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-brand-navy bg-white shadow-sm hover:border-brand-navy/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 8a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zm4 8a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1z" />
                  </svg>
                  {activeCategoryName
                    ? `${lang === 'hi' ? 'श्रेणी' : 'Category'}: ${activeCategoryName}`
                    : (lang === 'hi' ? 'श्रेणी फ़िल्टर करें' : 'Filter by Category')}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${mobileFiltersOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {mobileFiltersOpen && (
                <div className="mt-2 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <CategoryFilter
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    lang={lang}
                  />
                </div>
              )}
            </div>

            {/* ── Product grid ── */}
            <div className="lg:col-span-3">
              {/* Result count */}
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-brand-navy">{products.length}</span>{' '}
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
