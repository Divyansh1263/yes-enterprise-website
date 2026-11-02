import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../../i18n'

export default function SearchBar({ onSearch, initialValue = '' }) {
  const { t } = useLanguage()
  const [query, setQuery] = useState(initialValue)
  const debounce = useRef(null)

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onSearch(query), 280)
    return () => clearTimeout(debounce.current)
  }, [query, onSearch])

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <svg className="w-4.5 h-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('products.searchPlaceholder')}
        className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-navy/15 focus:border-brand-navy transition-colors"
        aria-label={t('products.searchPlaceholder')}
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          aria-label="Clear"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
