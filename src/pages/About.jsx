import siteConfig from '../config/site.config'

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-brand-navy mb-6">About {siteConfig.brandName}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p>
            {siteConfig.brandName} is an Indian manufacturer of high-quality baby feeding bottles
            and related products. We serve both individual customers and wholesale buyers across India.
          </p>
          <p>
            Our product range includes glass feeding bottles, BPA-free plastic bottles,
            silicone-sleeved bottles, stainless steel feeding bottles, sippers, and lunch boxes.
          </p>
          <p className="text-sm text-gray-400 italic">
            {/* TODO: Replace with manufacturer-supplied company story */}
            Detailed company information will be provided by the manufacturer.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-8">
          <h2 className="text-xl font-semibold text-brand-navy mb-4">Why Choose Us</h2>
          <ul className="space-y-3">
            {[
              'Made in India — supporting domestic manufacturing',
              'BPA-free and food-safe materials',
              'Direct manufacturer pricing',
              'Wholesale and bulk order support',
              'Wide range of sizes and styles',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
