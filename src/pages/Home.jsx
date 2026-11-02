import { Link } from 'react-router-dom'
import siteConfig from '../config/site.config'

export default function Home() {
  return (
    <div>
      {/* Hero section */}
      <section className="bg-brand-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              {siteConfig.tagline}
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Trusted manufacturer of baby feeding bottles, sippers, and stainless steel products.
              Serving retail and wholesale customers across India.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 bg-white text-brand-navy font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Browse Products
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* USP section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🏭', title: 'Made in India', desc: 'Proudly manufactured in India with quality materials.' },
              { icon: '🍼', title: 'BPA Free', desc: 'Safe, certified products for your little ones.' },
              { icon: '💬', title: 'Direct from Manufacturer', desc: 'Contact us on WhatsApp for the best wholesale and retail prices.' },
            ].map((item) => (
              <div key={item.title} className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold text-brand-navy mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products placeholder */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-brand-navy mb-8 text-center">
            Featured Products
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center text-gray-400">
                <span className="text-sm">Product {i}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-brand-navy text-white font-semibold rounded-lg hover:bg-brand-navy-light transition-colors"
            >
              View All Products →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

