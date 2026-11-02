import { Link } from 'react-router-dom'
import siteConfig from '../config/site.config'
import WhatsAppButton from '../components/ui/WhatsAppButton'

export default function About() {
  return (
    <div>
      {/* Page header */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-2">
            About {siteConfig.brandName}
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Indian manufacturer of quality baby feeding bottles and products.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* ── Company Introduction ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-3 space-y-5 text-gray-600 leading-relaxed">
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-2">
              Who We Are
            </h2>
            <p>
              {siteConfig.brandName} is an Indian manufacturer specialising in baby feeding bottles 
              and related products. We offer a comprehensive range of feeding solutions including 
              glass bottles, BPA-free plastic bottles, silicone-sleeved bottles, stainless steel 
              feeding bottles, sippers, and lunch boxes.
            </p>
            <p>
              Our products are designed with a focus on safety and practicality. We serve both 
              individual customers looking for reliable baby products and wholesale buyers seeking 
              competitive manufacturer pricing.
            </p>
            <p className="text-sm text-gray-400 italic border-l-2 border-gray-200 pl-4">
              Detailed company history and additional information will be provided by the manufacturer.
            </p>
          </div>

          {/* Logo / Brand display */}
          <div className="lg:col-span-2 flex items-start justify-center">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 w-full max-w-sm text-center">
              <img
                src="/assets/logo.jpeg"
                alt={`${siteConfig.brandName} logo`}
                className="w-24 h-24 mx-auto rounded-xl object-contain bg-white p-2 border border-gray-100 mb-4"
              />
              <h3 className="text-xl font-bold text-brand-navy">{siteConfig.brandName}</h3>
              <p className="text-sm text-gray-500 mt-1">{siteConfig.tagline}</p>
              {siteConfig.subBrand && (
                <p className="text-xs text-gray-400 mt-3 bg-gray-100 rounded-full px-3 py-1 inline-block">
                  Sub-brand: {siteConfig.subBrand} (relationship unconfirmed)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Why Choose Us ── */}
        <div className="mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-8 text-center">
            Why Choose {siteConfig.brandName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Made in India',
                desc: 'All our products are proudly manufactured in India, supporting domestic manufacturing and ensuring quick delivery across the country.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Safe Materials',
                desc: 'We use BPA-free plastics, borosilicate glass, food-grade silicone, and SS 304 stainless steel in our products.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Manufacturer Pricing',
                desc: 'Buy directly from the manufacturer. We offer competitive pricing for both retail and wholesale orders with no middlemen.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
                title: 'Wide Product Range',
                desc: 'From 60ml newborn bottles to 300ml stainless steel bottles, sippers, and lunch boxes — we have products for every need.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: 'Wholesale Support',
                desc: 'We welcome bulk and wholesale enquiries. Contact us for volume pricing, custom packaging options, and trade terms.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: 'Easy Communication',
                desc: 'Enquire and order directly via WhatsApp. We make the buying process simple and personal.',
              },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="w-11 h-11 bg-brand-navy/5 rounded-xl flex items-center justify-center text-brand-navy mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Product Range Summary ── */}
        <div className="bg-gray-50 rounded-2xl p-8 sm:p-10 border border-gray-100 mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-6">
            Our Product Range
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              'Glass Feeding Bottles (60–250 ml)',
              'BPA-Free Plastic Bottles (120–250 ml)',
              'Silicone Sleeve Glass Bottles (120–250 ml)',
              'SS 304 Stainless Steel Bottles (150–300 ml)',
              'Stainless Steel Sippers',
              'Stainless Steel Lunch Boxes',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 bg-brand-navy rounded-full shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <Link
            to="/products"
            className="inline-flex items-center text-brand-navy font-semibold text-sm hover:text-brand-navy-light transition-colors"
          >
            View our full product catalogue
            <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* ── CTA ── */}
        <div className="text-center py-8">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-3">
            Interested in Our Products?
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Get in touch with us for product enquiries, wholesale pricing, or any questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <WhatsAppButton size="md">
              Chat on WhatsApp
            </WhatsAppButton>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-brand-navy text-brand-navy font-semibold rounded-xl hover:bg-brand-navy hover:text-white transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
