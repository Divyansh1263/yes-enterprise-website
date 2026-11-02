import { Link } from 'react-router-dom'
import siteConfig from '../config/site.config'
import { getFeaturedProducts, getAllCategories } from '../data/products'
import ProductCard from '../components/ui/ProductCard'
import WhatsAppButton from '../components/ui/WhatsAppButton'
import SectionHeading from '../components/ui/SectionHeading'

const featuredProducts = getFeaturedProducts()
const categories = getAllCategories()

export default function Home() {
  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="relative bg-brand-navy overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full border-[40px] border-white" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full border-[50px] border-white" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-amber-300 font-medium text-sm tracking-widest uppercase mb-4">
              Indian Manufacturer
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Quality Baby Products,{' '}
              <span className="text-amber-300">Made in India</span>
            </h1>
            <p className="text-base sm:text-lg text-white/75 mb-8 leading-relaxed max-w-xl">
              From glass feeding bottles to stainless steel essentials — we manufacture 
              safe, reliable products for your little ones. Available for retail and wholesale orders.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                to="/products"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-white text-brand-navy font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-lg shadow-black/10"
              >
                Explore Products
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <WhatsAppButton variant="outline" className="!border-white !text-white hover:!bg-white/10">
                Enquire on WhatsApp
              </WhatsAppButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── USP Strip ── */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Made in India',
                desc: 'Proudly manufactured in India',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Safe Materials',
                desc: 'BPA-free and food-safe products',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                title: 'Direct from Factory',
                desc: 'Manufacturer pricing for all orders',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
                title: 'Wholesale Available',
                desc: 'Bulk orders and custom packaging',
              },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-navy/5 rounded-xl flex items-center justify-center text-brand-navy shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Featured Products"
            subtitle="Our most popular baby feeding bottles and accessories."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.slice(0, 6).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/products"
              className="inline-flex items-center px-7 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors"
            >
              View All Products
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Product Categories ── */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Our Product Range"
            subtitle="We manufacture a wide range of baby feeding products and accessories."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-brand-navy/20 hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 bg-brand-navy/5 rounded-xl flex items-center justify-center text-brand-navy mb-4 group-hover:bg-brand-navy group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-brand-navy transition-colors">
                  {cat.name}
                </h3>
                <p className="text-sm text-gray-500">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── About / Manufacturer Introduction ── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-amber-600 font-medium text-sm tracking-widest uppercase mb-3">
                About the Manufacturer
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-6">
                Trusted Quality from an Indian Manufacturer
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  {siteConfig.brandName} is an Indian manufacturer of baby feeding bottles and 
                  related products. Our range includes glass bottles, BPA-free plastic bottles, 
                  silicone-sleeved bottles, stainless steel feeding bottles, sippers, and lunch boxes.
                </p>
                <p>
                  We serve both individual customers and wholesale buyers across India, offering 
                  competitive manufacturer pricing and consistent product quality.
                </p>
              </div>
              <Link
                to="/about"
                className="inline-flex items-center text-brand-navy font-semibold mt-6 hover:text-brand-navy-light transition-colors"
              >
                Learn more about us
                <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Why Choose Us */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-brand-navy mb-6">Why Choose {siteConfig.brandName}</h3>
              <ul className="space-y-4">
                {[
                  'Made in India — supporting domestic manufacturing',
                  'BPA-free and food-safe materials used in our products',
                  'Direct manufacturer pricing for retail and wholesale',
                  'Wide range of sizes, materials, and styles',
                  'Stainless steel (SS 304) product line',
                  'Easy enquiry and ordering via WhatsApp',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-gray-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wholesale / Bulk Enquiry CTA ── */}
      <section className="py-16 md:py-20 bg-brand-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Looking for Wholesale or Bulk Orders?
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto leading-relaxed">
            We offer competitive manufacturer pricing for bulk and wholesale orders. 
            Contact us on WhatsApp to discuss quantities, pricing, and delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <WhatsAppButton size="lg">
              Get Wholesale Pricing
            </WhatsAppButton>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-8 py-4 text-lg border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact Strip ── */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <div className="w-12 h-12 bg-brand-navy/5 rounded-xl flex items-center justify-center text-brand-navy mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Phone</h3>
              <p className="text-gray-500 text-sm">
                {siteConfig.phone || <span className="italic text-gray-400">To be confirmed</span>}
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-brand-navy/5 rounded-xl flex items-center justify-center text-brand-navy mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Email</h3>
              <p className="text-gray-500 text-sm">
                {siteConfig.email || <span className="italic text-gray-400">To be confirmed</span>}
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-brand-navy/5 rounded-xl flex items-center justify-center text-brand-navy mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Location</h3>
              <p className="text-gray-500 text-sm">
                {siteConfig.address || <span className="italic text-gray-400">To be confirmed</span>}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
