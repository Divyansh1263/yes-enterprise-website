import { Link } from 'react-router-dom'
import siteConfig from '../../config/site.config'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-brand-navy text-white/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand column */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img
                src="/assets/logo.jpeg"
                alt={`${siteConfig.brandName} logo`}
                className="h-10 w-10 rounded object-contain bg-white p-0.5"
              />
              <span className="text-lg font-bold text-white">
                {siteConfig.brandName}
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              {siteConfig.tagline}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Products</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              {siteConfig.phone && (
                <li>
                  <span className="inline-block w-5">📞</span>
                  <a href={`tel:${siteConfig.phone}`} className="hover:text-white transition-colors">
                    {siteConfig.phone}
                  </a>
                </li>
              )}
              {siteConfig.email && (
                <li>
                  <span className="inline-block w-5">✉️</span>
                  <a href={`mailto:${siteConfig.email}`} className="hover:text-white transition-colors">
                    {siteConfig.email}
                  </a>
                </li>
              )}
              {siteConfig.address && (
                <li>
                  <span className="inline-block w-5">📍</span>
                  {siteConfig.address}
                </li>
              )}
              {!siteConfig.phone && !siteConfig.email && !siteConfig.address && (
                <li className="text-white/50 italic">Contact details pending</li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-white/50">
          <p>&copy; {currentYear} {siteConfig.brandName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

