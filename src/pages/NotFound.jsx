import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n'

export default function NotFound() {
  const { t, getLangPath } = useLanguage()

  return (
    <div className="min-h-[70vh] bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center py-20">
        {/* Icon */}
        <div className="w-20 h-20 bg-brand-ivory rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-brand-navy/30"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* 404 */}
        <h1 className="text-6xl font-bold text-brand-navy mb-3">
          {t('notFound.heading')}
        </h1>

        {/* Title */}
        <p className="text-xl font-semibold text-gray-700 mb-2">
          {t('notFound.title')}
        </p>

        {/* Subtitle */}
        <p className="text-gray-400 text-sm mb-10">
          {t('notFound.sub')}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={getLangPath('/')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors"
          >
            {t('notFound.backHome')}
          </Link>
          <Link
            to={getLangPath('/products')}
            className="inline-flex items-center justify-center px-6 py-3 border border-brand-navy text-brand-navy font-semibold rounded-xl hover:bg-brand-navy hover:text-white transition-colors"
          >
            {t('notFound.browse')}
          </Link>
        </div>
      </div>
    </div>
  )
}
