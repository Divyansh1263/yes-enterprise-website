import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { to: '/admin/inventory', label: 'Inventory', icon: '📈' },
  { to: '/admin/products/new', label: 'Add Product', icon: '➕' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-64 bg-brand-navy text-white shrink-0 hidden md:flex flex-col border-r border-brand-navy-dark shadow-lg">
        {/* Brand header */}
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <Link to="/admin/dashboard" className="flex items-center gap-3 group">
            <img
              src="/assets/logo.jpeg"
              alt="YES ENTERPRISES"
              className="h-9 w-9 rounded-lg bg-white p-1 object-contain shadow-sm"
            />
            <div>
              <span className="font-bold text-sm tracking-tight block">YES ENTERPRISES</span>
              <span className="text-[11px] text-white/50 block font-medium">Admin Control Panel</span>
            </div>
          </Link>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm font-semibold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile & actions footer */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          {user && (
            <div className="mb-3 px-1">
              <p className="text-xs font-semibold text-white truncate">{user.name || 'Admin User'}</p>
              <p className="text-[11px] text-white/50 truncate font-mono">{user.email}</p>
            </div>
          )}

          <div className="space-y-1">
            <Link
              to="/"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span>🌐</span> View Public Website
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors text-left"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-brand-navy text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <Link to="/admin/dashboard" className="font-bold text-sm">
              YES ENTERPRISES Admin
            </Link>
          </div>

          <Link to="/" className="text-xs text-white/70 hover:text-white px-2.5 py-1 rounded bg-white/10">
            Site ↗
          </Link>
        </header>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-brand-navy-dark text-white border-b border-white/10 px-4 py-3 space-y-1.5 z-30 shadow-lg animate-in slide-in-from-top-2">
            {ADMIN_NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-white/20 text-white font-semibold' : 'text-white/70'
                  }`
                }
              >
                <span>{icon}</span> {label}
              </NavLink>
            ))}

            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span className="truncate max-w-[200px]">{user?.email}</span>
              <button onClick={handleSignOut} className="text-red-300 font-semibold">
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Top bar on desktop */}
        <header className="hidden md:flex h-16 bg-white border-b border-gray-200 px-8 items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● API Online
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">Cloudflare Pages Functions + D1 + R2</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-gray-500 font-mono">{user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {(user?.name || user?.email || 'A')[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
