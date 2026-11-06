import { Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import ScrollToTop from './components/ScrollToTop';
import { useAuth } from './hooks/useAuth';
import LoadingSpinner from './components/ui/LoadingSpinner.jsx';
import AccessDenied from './components/admin/AccessDenied.jsx';

// Layouts
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';

// Public pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProductList from './pages/admin/AdminProductList';
import AdminProductNew from './pages/admin/AdminProductNew';
import AdminProductEdit from './pages/admin/AdminProductEdit';
import AdminCategories from './pages/admin/AdminCategories';
import AdminInventory from './pages/admin/AdminInventory';
import AdminSettings from './pages/admin/AdminSettings';

/**
 * ProtectedRoute: Enforces Cloudflare Access authentication with local dev bypass.
 */
function ProtectedRoute({ children }) {
  const { isAdmin, isLoading, isForbidden } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="Verifying admin credentials..." size="lg" />
      </div>
    );
  }

  if (isForbidden) {
    return <AccessDenied />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <LanguageProvider>
      <ScrollToTop />
      <Routes>
        {/* ── English public routes ── */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ── Hindi public routes (/hi prefix) ── */}
        <Route path="/hi" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ── Admin login — standalone ── */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── Admin routes — sidebar layout ── */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProductList />} />
          <Route path="products/new" element={<AdminProductNew />} />
          <Route path="products/:id/edit" element={<AdminProductEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </LanguageProvider>
  );
}
