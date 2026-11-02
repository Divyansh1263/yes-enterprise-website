import siteConfig from '../../config/site.config'

export default function AdminSettings() {
  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Settings will save to Supabase after Milestone C/D.')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Site Settings</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <legend className="text-sm font-semibold text-brand-navy px-2">Business Information</legend>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
            <input type="text" defaultValue={siteConfig.brandName} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input type="text" defaultValue={siteConfig.whatsappNumber} placeholder="e.g. 919876543210" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <p className="text-xs text-gray-400 mt-1">Country code + number, digits only. No spaces or +.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="text" defaultValue={siteConfig.phone} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" defaultValue={siteConfig.email} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea rows={2} defaultValue={siteConfig.address} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Tagline</label>
            <input type="text" defaultValue={siteConfig.tagline} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </fieldset>

        <button type="submit" className="px-6 py-2.5 bg-brand-navy text-white font-semibold rounded-lg hover:bg-brand-navy-light transition-colors">
          Save Settings
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-400 italic">
        Settings will persist to the database after Supabase is connected (Milestone C).
      </p>
    </div>
  )
}
