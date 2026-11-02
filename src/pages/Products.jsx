export default function Products() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-brand-navy mb-2">Our Products</h1>
      <p className="text-gray-600 mb-8">
        Browse our complete catalogue of baby feeding bottles and products.
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filter sidebar placeholder */}
        <aside className="md:w-56 shrink-0">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-brand-navy mb-3">Categories</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="cursor-pointer hover:text-brand-navy">All Products</li>
              <li className="cursor-pointer hover:text-brand-navy">Glass Bottles</li>
              <li className="cursor-pointer hover:text-brand-navy">Plastic Bottles</li>
              <li className="cursor-pointer hover:text-brand-navy">Silicone Sleeve</li>
              <li className="cursor-pointer hover:text-brand-navy">Stainless Steel</li>
              <li className="cursor-pointer hover:text-brand-navy">Sippers</li>
              <li className="cursor-pointer hover:text-brand-navy">Lunch Boxes</li>
            </ul>
          </div>
        </aside>

        {/* Product grid placeholder */}
        <div className="flex-1">
          {/* Search bar placeholder */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy"
              disabled
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gray-100 aspect-square flex items-center justify-center text-gray-400">
                  <span className="text-sm">Product Image {i}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-brand-navy mb-1">Product Name {i}</h3>
                  <p className="text-sm text-gray-500 mb-3">Category • 250 ml</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Contact for price</span>
                    <button className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors">
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

