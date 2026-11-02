import { useLanguage } from '../../i18n'
import { getCategoryName } from '../../data/products'

export default function CategoryFilter({ categories, activeCategory, onCategoryChange }) {
  const { t, lang } = useLanguage()

  return (
    <div className="space-y-0.5">
      <FilterBtn
        active={activeCategory === 'all'}
        onClick={() => onCategoryChange('all')}
      >
        {t('categories.all')}
      </FilterBtn>
      {categories.map(cat => (
        <FilterBtn
          key={cat.id}
          active={activeCategory === cat.id}
          onClick={() => onCategoryChange(cat.id)}
        >
          {getCategoryName(cat, lang)}
        </FilterBtn>
      ))}
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-brand-navy text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-brand-navy'
      }`}
    >
      {children}
    </button>
  )
}
