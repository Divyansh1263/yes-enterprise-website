import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getAllProducts,
  getAllCategories,
  getProductsByCategory,
  searchProducts,
  getCategoryName,
} from '../data/products'
import { useLanguage } from '../i18n'
import { useScrollReveal } from '../hooks/useScrollReveal'
import ProductGrid from '../components/ui/ProductGrid'
import CategoryFilter from '../components/ui/CategoryFilter'
import SearchBar from '../components/ui/SearchBar'

const categories = getAllCategories()

export default function Products() {
  const { t, lang, getLangPath } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || 'all'

  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState(getAllProducts())
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const headerRef = useScrollReveal()
  const gridRef = useScrollReveal()

  // Update products when category or search changes
  useEffect(() => {
    let results
    if (searchQuery.trim()) {
      results = searchProducts(searchQuery, lang)
      if (activeCategory !== 'all') {
        results = results.filter(p => p.category_id === activeCategory)
      }
    } else {
      results = getProductsByCategory(activeCategory)
    }
    setFilteredProducts(results)
  }, [activeCategory, searchQuery, lang])

  // Sync URL param when category changes
  useEffect(() => {
    if (activeCategory === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ category: activeCategory })
    }
  }, [activeCategory, setSearchParams])

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat)
    setMobileFiltersOpen(false)
  }

  const clearFilter = () => {
    setActiveCategory('all')
    setSearchQuery('')
  }

  const activeCategoryObj = categories.find(c => c.id === activeCategory)
  const activeCategoryName = activeCategoryObj
    ? getCategoryName(activeCategoryObj, lang)
    : null

  const resultCount = filteredProducts.length
  const resultLabel = resultCount === 1 ? t('products.result') : t('products.results')

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
                ? getCategoryName(activeCategoryObj, lang)
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
                <span className="font-semibold text-brand-navy">{resultCount}</span>{' '}
                {resultLabel}
                {activeCategoryName ? ` — ${activeCategoryName}` : ''}
              </p>
            </div>

            <div ref={gridRef} className="reveal">
              <ProductGrid products={filteredProducts} lang={lang} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
