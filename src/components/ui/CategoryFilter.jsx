/**
 * CategoryFilter — sidebar/horizontal filter for product categories.
 */
export default function CategoryFilter({ categories, activeCategory, onCategoryChange }) {
  return (
    <div className="space-y-1">
      <button
        onClick={() => onCategoryChange('all')}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeCategory === 'all'
            ? 'bg-brand-navy text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-brand-navy'
        }`}
      >
        All Products
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === cat.id
              ? 'bg-brand-navy text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-brand-navy'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

