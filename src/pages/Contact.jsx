import siteConfig from '../config/site.config'

export default function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-brand-navy mb-2">Contact Us</h1>
      <p className="text-gray-600 mb-8">
        Get in touch with us for product enquiries, wholesale orders, or any questions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Contact information */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-brand-navy mb-4">Business Details</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Phone</dt>
                <dd className="text-gray-800 font-medium">
                  {siteConfig.phone || <span className="text-gray-400 italic">To be confirmed</span>}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Email</dt>
                <dd className="text-gray-800 font-medium">
                  {siteConfig.email || <span className="text-gray-400 italic">To be confirmed</span>}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Address</dt>
                <dd className="text-gray-800 font-medium">
                  {siteConfig.address || <span className="text-gray-400 italic">To be confirmed</span>}
                </dd>
              </div>
              {siteConfig.businessHours && (
                <div>
                  <dt className="text-gray-500 mb-1">Business Hours</dt>
                  <dd className="text-gray-800 font-medium">{siteConfig.businessHours}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* WhatsApp CTA */}
          <button
            className="w-full px-6 py-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-3 text-lg"
            disabled={!siteConfig.whatsappNumber}
          >
            <span className="text-2xl">💬</span>
            Chat with us on WhatsApp
          </button>
          {!siteConfig.whatsappNumber && (
            <p className="text-xs text-gray-400 text-center italic">
              WhatsApp number will be configured after manufacturer confirmation.
            </p>
          )}
        </div>

        {/* Enquiry note */}
        <div className="bg-brand-navy text-white rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-4">How to Order</h2>
          <ol className="space-y-4">
            {[
              { step: '1', text: 'Browse our product catalogue and find what you need.' },
              { step: '2', text: 'Click the WhatsApp button on any product to send an enquiry.' },
              { step: '3', text: 'We\'ll discuss pricing, availability, and delivery directly.' },
              { step: '4', text: 'Confirm your order and payment details over WhatsApp.' },
            ].map(({ step, text }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {step}
                </span>
                <span className="text-white/90 text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
