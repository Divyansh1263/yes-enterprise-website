import { Link } from 'react-router-dom'
import siteConfig from '../config/site.config'
import WhatsAppButton from '../components/ui/WhatsAppButton'

export default function Contact() {
  return (
    <div>
      {/* Page header */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-2">Contact Us</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Get in touch for product enquiries, wholesale orders, or any questions.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* ── Left: Contact details + WhatsApp ── */}
          <div className="lg:col-span-3 space-y-6">
            {/* WhatsApp — Primary CTA */}
            <div className="bg-emerald-50 rounded-2xl p-6 sm:p-8 border border-emerald-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.494A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.306-2.65.887.886-2.648-.335-.433A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">WhatsApp — Fastest Way to Reach Us</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Send us a message on WhatsApp for quick responses on product enquiries, 
                    pricing, wholesale orders, and delivery information.
                  </p>
                  <WhatsAppButton size="md">
                    Chat on WhatsApp
                  </WhatsAppButton>
                  {!siteConfig.whatsappNumber && (
                    <p className="text-xs text-amber-600 mt-2 italic">
                      WhatsApp number will be configured after manufacturer confirmation.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Business details */}
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
              <div className="p-5 sm:p-6">
                <h3 className="font-semibold text-brand-navy text-sm uppercase tracking-wider mb-4">
                  Business Details
                </h3>
                <dl className="space-y-5">
                  <ContactItem label="Phone" icon="phone">
                    {siteConfig.phone ? (
                      <a href={`tel:${siteConfig.phone}`} className="text-brand-navy hover:underline">
                        {siteConfig.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-sm">To be confirmed</span>
                    )}
                  </ContactItem>

                  <ContactItem label="Email" icon="email">
                    {siteConfig.email ? (
                      <a href={`mailto:${siteConfig.email}`} className="text-brand-navy hover:underline">
                        {siteConfig.email}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-sm">To be confirmed</span>
                    )}
                  </ContactItem>

                  <ContactItem label="Address" icon="location">
                    {siteConfig.address ? (
                      <span className="text-gray-800">{siteConfig.address}</span>
                    ) : (
                      <span className="text-gray-400 italic text-sm">To be confirmed</span>
                    )}
                  </ContactItem>

                  {siteConfig.businessHours && (
                    <ContactItem label="Business Hours" icon="clock">
                      <span className="text-gray-800">{siteConfig.businessHours}</span>
                    </ContactItem>
                  )}
                </dl>
              </div>
            </div>

            {/* Social links — only show if configured */}
            {(siteConfig.instagram || siteConfig.facebook) && (
              <div className="flex gap-3">
                {siteConfig.instagram && (
                  <a
                    href={siteConfig.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {siteConfig.facebook && (
                  <a
                    href={siteConfig.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Right: How to Order ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-brand-navy rounded-2xl p-6 sm:p-8 text-white">
              <h2 className="text-xl font-bold mb-6">How to Order</h2>
              <ol className="space-y-5">
                {[
                  {
                    step: '1',
                    title: 'Browse Products',
                    text: 'Explore our product catalogue and find what you need.',
                  },
                  {
                    step: '2',
                    title: 'Send an Enquiry',
                    text: 'Click the WhatsApp button on any product to send us a message.',
                  },
                  {
                    step: '3',
                    title: 'Discuss Details',
                    text: 'We\'ll discuss pricing, availability, quantities, and delivery.',
                  },
                  {
                    step: '4',
                    title: 'Confirm & Pay',
                    text: 'Confirm your order and payment details directly over WhatsApp.',
                  },
                ].map(({ step, title, text }) => (
                  <li key={step} className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {step}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{title}</p>
                      <p className="text-white/70 text-sm mt-0.5">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Wholesale note */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wholesale Buyers
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                For bulk and wholesale orders, please contact us on WhatsApp with your 
                requirements. We offer competitive manufacturer pricing for volume orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ContactItem — helper component for contact details.
 */
function ContactItem({ label, icon, children }) {
  const icons = {
    phone: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    email: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    location: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    clock: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
        {icons[icon]}
      </div>
      <div>
        <dt className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</dt>
        <dd className="text-sm font-medium">{children}</dd>
      </div>
    </div>
  )
}
