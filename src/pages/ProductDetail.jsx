import { useParams, Link } from 'react-router-dom'

export default function ProductDetail() {
  const { slug } = useParams()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-brand-navy">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-brand-navy">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-brand-navy font-medium">{slug}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image gallery placeholder */}
        <div>
          <div className="bg-gray-100 aspect-square rounded-xl flex items-center justify-center text-gray-400">
            <span>Product Image</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center text-gray-300 text-xs">
                {i}
              </div>
            ))}
          </div>
        </div>

        {/* Product details placeholder */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-navy mb-2">
            Product: {slug}
          </h1>
          <p className="text-gray-500 mb-4">Category • Material</p>

          <div className="border-t border-gray-200 pt-4 mb-6">
            <dl className="space-y-3 text-sm">
              <div className="flex"><dt className="w-28 text-gray-500">Capacity</dt><dd className="text-gray-800">— ml</dd></div>
              <div className="flex"><dt className="w-28 text-gray-500">Material</dt><dd className="text-gray-800">—</dd></div>
              <div className="flex"><dt className="w-28 text-gray-500">Colours</dt><dd className="text-gray-800">—</dd></div>
              <div className="flex"><dt className="w-28 text-gray-500">MOQ</dt><dd className="text-gray-800">—</dd></div>
            </dl>
          </div>

          <div className="mb-6">
            <span className="text-lg font-semibold text-brand-navy">Contact for price</span>
          </div>

          {/* WhatsApp CTA placeholder */}
          <button className="w-full md:w-auto px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
            <span>💬</span> Enquire on WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

