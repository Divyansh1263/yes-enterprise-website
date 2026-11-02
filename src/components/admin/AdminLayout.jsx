import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/products/new', label: 'Add Product', icon: '➕' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    // TODO: Milestone C — supabase.auth.signOut()
    alert('Logout will work after Supabase Auth is connected.')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-navy text-white shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <img src="/assets/logo.jpeg" alt="YES ENTERPRISES" className="h-8 w-8 rounded bg-white p-0.5 object-contain" />
            <div>
              <span className="font-bold text-sm">YES ENTERPRISES</span>
              <span className="block text-xs text-white/50">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            ← View Website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-red-300 transition-colors"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile admin header */}
        <header className="md:hidden bg-brand-navy text-white px-4 py-3 flex items-center justify-between">
          <Link to="/admin/dashboard" className="font-bold text-sm">YES ENTERPRISES Admin</Link>
          <Link to="/" className="text-xs text-white/60">← Site</Link>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden bg-brand-navy-dark text-white flex overflow-x-auto border-t border-white/10">
          {adminLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 text-xs whitespace-nowrap shrink-0 ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/60'
                }`
              }
            >
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

