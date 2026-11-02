import { Link } from 'react-router-dom'

export default function AdminProductList() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Products</h1>
        <Link
          to="/admin/products/new"
          className="px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-navy-light transition-colors"
        >
          + Add Product
        </Link>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search products..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
          disabled
        />
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
          disabled
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Out of Stock</option>
          <option>Archived</option>
        </select>
      </div>

      {/* Product table placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Image</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Price</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">
                No products yet. Supabase will be connected at Milestone C.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

