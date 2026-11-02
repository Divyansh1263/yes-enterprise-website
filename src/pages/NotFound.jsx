import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 bg-brand-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-brand-navy/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-brand-navy mb-3">404</h1>
        <p className="text-lg text-gray-600 mb-2">Page Not Found</p>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-6 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-brand-navy hover:text-brand-navy transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  )
}
