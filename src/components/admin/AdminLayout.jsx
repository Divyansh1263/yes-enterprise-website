import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileDrawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    setMobileDrawerOpen(false);
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
      {/* ── Top Header Navigation ─────────────────────────────────────────── */}
      <header className="bg-brand-navy text-white sticky top-0 z-40 shadow-md border-b border-brand-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            
            {/* Left: Monogram Logo & Brand Identity */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to="/admin/products" className="flex items-center gap-3 group">
                <img
                  src="/assets/logo.jpeg"
                  alt="YES ENTERPRISES"
                  className="h-9 w-9 rounded-lg bg-white p-1 object-contain shadow-sm shrink-0"
                />
                <div className="leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base sm:text-lg tracking-tight">
                      YES ENTERPRISES
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-brand-amber/20 text-brand-amber border border-brand-amber/40">
                      Admin Panel
                    </span>
                  </div>
                  <span className="text-[11px] text-white/50 hidden sm:block">
                    Catalogue Management
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Center/Right Navigation */}
            <nav className="hidden lg:flex items-center gap-1 sm:gap-2">
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white/15 text-brand-amber shadow-inner font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/admin/products"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white/15 text-brand-amber shadow-inner font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                Products
              </NavLink>
              <NavLink
                to="/admin/categories"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white/15 text-brand-amber shadow-inner font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                Categories
              </NavLink>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors border border-white/20 min-h-[36px]"
                title="Open public website in a new tab"
              >
                <span>View Website</span>
                <span className="text-brand-amber font-bold">↗</span>
              </Link>

              {user && (
                <div className="text-right text-xs hidden xl:block border-l border-white/10 pl-3">
                  <span className="text-white/40 block text-[10px]">Signed in as</span>
                  <span className="text-white/80 font-mono truncate max-w-[150px] block" title={user.email}>
                    {user.email}
                  </span>
                </div>
              )}

              <button
                onClick={handleSignOut}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:text-white hover:bg-red-600/80 transition-colors min-h-[36px]"
              >
                Logout
              </button>
            </div>

            {/* Mobile Header Controls */}
            <div className="flex lg:hidden items-center gap-2">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/80 hover:text-white px-2.5 py-1.5 border border-white/20 rounded-lg flex items-center gap-1 min-h-[44px]"
                title="View Public Website"
              >
                <span>Site</span>
                <span className="text-brand-amber font-bold">↗</span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="p-2.5 rounded-lg text-white hover:bg-white/10 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileDrawerOpen}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer & Backdrop ────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer slide-out panel */}
          <div
            className="relative w-4/5 max-w-xs bg-brand-navy-dark text-white flex flex-col justify-between shadow-2xl z-50 h-full border-r border-white/10"
            role="dialog"
            aria-modal="true"
            aria-label="Admin Navigation Menu"
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/logo.jpeg"
                    alt="YES ENTERPRISES"
                    className="h-8 w-8 rounded-lg bg-white p-1 object-contain shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm tracking-tight leading-tight">
                      YES ENTERPRISES
                    </h3>
                    <p className="text-[11px] text-brand-amber font-semibold">
                      Admin Panel
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close navigation drawer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Links */}
              <nav className="p-3 space-y-1">
                <NavLink
                  to="/admin/dashboard"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-white/15 text-brand-amber font-bold border-l-4 border-brand-amber'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <span className="text-base">📊</span>
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/admin/products"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-white/15 text-brand-amber font-bold border-l-4 border-brand-amber'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <span className="text-base">📦</span>
                  <span>Products</span>
                </NavLink>

                <NavLink
                  to="/admin/categories"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-white/15 text-brand-amber font-bold border-l-4 border-brand-amber'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <span className="text-base">🏷️</span>
                  <span>Categories</span>
                </NavLink>

                <Link
                  to="/admin/products/new"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-brand-amber hover:bg-white/10 transition-colors min-h-[44px]"
                >
                  <span className="text-base">➕</span>
                  <span>Add New Product</span>
                </Link>

                <div className="pt-2 border-t border-white/10 mt-2">
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white min-h-[44px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🌐</span>
                      <span>View Website</span>
                    </div>
                    <span className="text-brand-amber text-xs font-bold">↗</span>
                  </a>
                </div>
              </nav>
            </div>

            {/* Drawer Footer / User & Logout */}
            <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
              {user && (
                <div className="px-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">Signed in as</span>
                  <span className="text-xs text-white/80 font-mono truncate block" title={user.email}>
                    {user.email}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-300 hover:text-white hover:bg-red-600/60 rounded-xl transition-colors min-h-[44px] border border-red-400/20"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Workspace Body ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-4 px-4 text-center text-xs text-gray-500">
        YES ENTERPRISES &bull; Catalogue Management Admin
      </footer>
    </div>
  );
}
