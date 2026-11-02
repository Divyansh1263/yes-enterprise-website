import { Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './i18n'

// Layouts
import Layout from './components/layout/Layout'
import AdminLayout from './components/admin/AdminLayout'

// Public pages
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProductList from './pages/admin/AdminProductList'
import AdminProductNew from './pages/admin/AdminProductNew'
import AdminProductEdit from './pages/admin/AdminProductEdit'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <LanguageProvider>
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

        {/* ── Admin login — standalone (no navbar/footer) ── */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── Admin routes — sidebar layout ── */}
        {/* TODO Milestone C: wrap in <ProtectedRoute> */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProductList />} />
          <Route path="products/new" element={<AdminProductNew />} />
          <Route path="products/:id/edit" element={<AdminProductEdit />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </LanguageProvider>
  )
}
