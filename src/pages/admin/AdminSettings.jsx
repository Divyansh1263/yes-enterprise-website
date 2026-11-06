import siteConfig from '../../config/site.config';

export default function AdminSettings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-brand-navy">Store & Brand Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          General business configuration, contact channels, and WhatsApp enquiry target.
        </p>
      </div>

      {/* Information Banner regarding persistence */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 font-bold">ℹ️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Configuration Source: Static Configuration File
          </span>
        </div>
        <p className="text-xs leading-relaxed text-amber-800">
          The D1 schema contains a <code>site_settings</code> table, but backend API write routes for site settings have not been authorized or implemented in Phase 2 or Phase 3.
          Business details, WhatsApp order lines, and company contacts are actively configured in <code>src/config/site.config.js</code>.
          Interactive editing in the admin UI is marked read-only until dynamic settings endpoints are authorized and deployed.
        </p>
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 space-y-6 shadow-sm">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Active Business Information (Read-Only)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Brand / Company Name
            </label>
            <input
              type="text"
              readOnly
              value={siteConfig.brandName}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              WhatsApp Order Line
            </label>
            <input
              type="text"
              readOnly
              value={siteConfig.whatsappNumber}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-800 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">Digits only with country code (e.g. 919876543210).</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Customer Support Phone
            </label>
            <input
              type="text"
              readOnly
              value={siteConfig.phone}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Business Email
            </label>
            <input
              type="email"
              readOnly
              value={siteConfig.email}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Registered Factory & Office Address
          </label>
          <textarea
            rows={2}
            readOnly
            value={siteConfig.address}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 cursor-not-allowed resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Hero Tagline / Banner Headline
          </label>
          <input
            type="text"
            readOnly
            value={siteConfig.tagline}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
