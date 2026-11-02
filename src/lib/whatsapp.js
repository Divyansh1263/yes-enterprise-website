import siteConfig from '../config/site.config'

/**
 * Build a WhatsApp click-to-chat URL with a pre-filled message.
 *
 * @param {Object} options
 * @param {string} options.productName - Name of the product
 * @param {string} [options.productUrl] - Full URL of the product page
 * @param {number} [options.quantity] - Optional quantity
 * @returns {string} WhatsApp wa.me URL
 */
export function buildWhatsAppUrl({ productName, productUrl, quantity }) {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#' // No number configured yet

  const parts = [`Hi! I'm interested in *${productName}*.`]
  if (productUrl) parts.push(productUrl)
  if (quantity && quantity > 0) parts.push(`Quantity needed: ${quantity}`)
  const message = parts.join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Build a general WhatsApp contact URL.
 * @returns {string}
 */
export function buildWhatsAppContactUrl() {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#'
  return `https://wa.me/${phone}?text=${encodeURIComponent('Hi! I would like to enquire about your products.')}`
}
