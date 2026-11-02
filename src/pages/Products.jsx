import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAllProducts, getAllCategories, getProductsByCategory, searchProducts, getCategoryById } from '../data/products'
import ProductGrid from '../components/ui/ProductGrid'
import CategoryFilter from '../components/ui/CategoryFilter'
import SearchBar from '../components/ui/SearchBar'
import SectionHeading from '../components/ui/SectionHeading'

const categories = getAllCategories()

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || 'all'

  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState(getAllProducts())
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Update products when category or search changes
  useEffect(() => {
    let results
    if (searchQuery.trim()) {
      results = searchProducts(searchQuery)
      // Also apply category filter to search results
      if (activeCategory !== 'all') {
        results = results.filter(p => p.category_id === activeCategory)
      }
    } else {
      results = getProductsByCategory(activeCategory)
    }
    setFilteredProducts(results)
  }, [activeCategory, searchQuery])

  const handleCategoryChange = useCallback((categoryId) => {
    setActiveCategory(categoryId)
    if (categoryId === 'all') {
      searchParams.delete('category')
    } else {
      searchParams.set('category', categoryId)
    }
    setSearchParams(searchParams, { replace: true })
    setMobileFiltersOpen(false)
  }, [searchParams, setSearchParams])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
  }, [])

  const activeCategoryInfo = getCategoryById(activeCategory)
  const totalProducts = getAllProducts().length

  return (
    <div>
      {/* Page header */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-2">
            {activeCategoryInfo ? activeCategoryInfo.name : 'Our Products'}
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            {activeCategoryInfo
              ? activeCategoryInfo.description
              : `Browse our complete catalogue of ${totalProducts} baby products.`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Mobile filter toggle ── */}
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
            {activeCategory !== 'all' && (
              <span className="bg-brand-navy text-white text-xs px-2 py-0.5 rounded-full">1</span>
            )}
          </button>

          {/* ── Sidebar ── */}
          <aside className={`lg:w-60 shrink-0 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-24 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-semibold text-brand-navy mb-3 text-sm uppercase tracking-wider">
                  Categories
                </h3>
                <CategoryFilter
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                />
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {/* Search + result count */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center">
              <div className="flex-1 w-full sm:w-auto">
                <SearchBar
                  onSearch={handleSearch}
                  placeholder="Search by name, material, colour..."
                />
              </div>
              <p className="text-sm text-gray-400 shrink-0">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              </p>
            </div>

            {/* Active filter tag */}
            {(activeCategory !== 'all' || searchQuery) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {activeCategory !== 'all' && activeCategoryInfo && (
                  <span className="inline-flex items-center gap-1 bg-brand-navy/5 text-brand-navy text-xs font-medium px-3 py-1.5 rounded-full">
                    {activeCategoryInfo.name}
                    <button
                      onClick={() => handleCategoryChange('all')}
                      className="ml-1 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${activeCategoryInfo.name} filter`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 bg-brand-navy/5 text-brand-navy text-xs font-medium px-3 py-1.5 rounded-full">
                    Search: "{searchQuery}"
                  </span>
                )}
              </div>
            )}

            {/* Product grid */}
            <ProductGrid
              products={filteredProducts}
              emptyMessage={
                searchQuery
                  ? `No products match "${searchQuery}".`
                  : 'No products in this category.'
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
