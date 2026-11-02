export default function AdminProductNew() {
  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Supabase not connected yet. Product creation will work after Milestone C/D.')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Add New Product</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Basic info */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <legend className="text-sm font-semibold text-brand-navy px-2">Basic Information</legend>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30" placeholder="e.g. Glass Feeding Bottle 250ml Blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" disabled>
                <option>Select category...</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" placeholder="Product description..." />
          </div>
        </fieldset>

        {/* Specifications */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <legend className="text-sm font-semibold text-brand-navy px-2">Specifications</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Borosilicate Glass" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (ml)</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. 120, 250" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colours</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Blue, Pink, Green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOQ</label>
              <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Minimum order qty" />
            </div>
          </div>
        </fieldset>

        {/* Pricing & status */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <legend className="text-sm font-semibold text-brand-navy px-2">Pricing & Status</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Display</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. ₹120 or leave blank" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Label</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option>Contact for price</option>
                <option>Starting from</option>
                <option>MRP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="active">Active</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300" />
                Featured product
              </label>
            </div>
          </div>
        </fieldset>

        {/* Image upload placeholder */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6">
          <legend className="text-sm font-semibold text-brand-navy px-2">Product Images</legend>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
            <p className="text-sm">Image upload will be available after Milestone D/E</p>
          </div>
        </fieldset>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-navy text-white font-semibold rounded-lg hover:bg-brand-navy-light transition-colors"
          >
            Save Product
          </button>
          <button
            type="button"
            className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

