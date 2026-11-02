import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <h1 className="text-6xl font-bold text-brand-navy mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-6 py-3 bg-brand-navy text-white font-semibold rounded-lg hover:bg-brand-navy-light transition-colors"
      >
        ← Back to Home
      </Link>
    </div>
  )
}
