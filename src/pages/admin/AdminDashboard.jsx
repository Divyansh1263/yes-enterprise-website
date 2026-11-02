import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Products', value: '—', color: 'bg-green-50 text-green-700' },
          { label: 'Out of Stock', value: '—', color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Archived', value: '—', color: 'bg-gray-100 text-gray-600' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-5 ${stat.color}`}>
            <p className="text-sm font-medium opacity-75">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-brand-navy mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/products/new"
            className="px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-navy-light transition-colors"
          >
            + Add New Product
          </Link>
          <Link
            to="/admin/products"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            View All Products
          </Link>
          <Link
            to="/admin/settings"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Site Settings
          </Link>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-400 italic">
        Dashboard data will populate after Supabase is connected (Milestone C).
      </p>
    </div>
  )
}

