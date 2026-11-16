import { useLanguage } from '../../i18n';
import { getCategoryName } from '../../data/products';

export default function CategoryFilter({ categories = [], activeCategory, onCategoryChange, totalCount = null }) {
  const { t, lang } = useLanguage();

  // Filter out empty categories (zero active products) in accordance with Section 8
  const activeCategories = (categories || []).filter(cat => (cat.product_count || 0) > 0);

  return (
    <div className="space-y-1">
      <FilterBtn
        active={activeCategory === 'all'}
        onClick={() => onCategoryChange('all')}
        count={totalCount}
      >
        {t('categories.all')}
      </FilterBtn>
      {activeCategories.map(cat => {
        const isSelected = activeCategory === cat.id || activeCategory === cat.slug;
        return (
          <FilterBtn
            key={cat.id}
            active={isSelected}
            onClick={() => onCategoryChange(cat.slug || cat.id)}
            count={cat.product_count}
          >
            {getCategoryName(cat, lang)}
          </FilterBtn>
        );
      })}
    </div>
  );
}

function FilterBtn({ active, onClick, count, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
        active
          ? 'bg-brand-navy text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-brand-navy'
      }`}
    >
      <span className="truncate text-left">{children}</span>
      {count != null && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
          active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
