import siteConfig from '../config/site.config'

/**
 * Build a WhatsApp click-to-chat URL with a pre-filled message.
 * Supports English and Hindi message generation.
 *
 * @param {Object} options
 * @param {string} options.productName   - Product name (already in target language)
 * @param {string} [options.productUrl]  - Full URL of the product page
 * @param {number} [options.quantity]    - Optional quantity
 * @param {string} [options.lang]        - 'en' (default) or 'hi'
 * @returns {string} WhatsApp wa.me URL or '#' if not configured
 */
export function buildWhatsAppUrl({ productName, productUrl, quantity, lang = 'en' }) {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#'

  let message
  if (lang === 'hi') {
    const parts = [`नमस्ते! मुझे *${productName}* में रुचि है।`]
    if (productUrl) parts.push(productUrl)
    if (quantity && quantity > 0) parts.push(`आवश्यक मात्रा: ${quantity}`)
    message = parts.join('\n')
  } else {
    const parts = [`Hi! I'm interested in *${productName}*.`]
    if (productUrl) parts.push(productUrl)
    if (quantity && quantity > 0) parts.push(`Quantity needed: ${quantity}`)
    message = parts.join('\n')
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Build a general WhatsApp contact URL.
 * @param {string} [lang] - 'en' (default) or 'hi'
 * @returns {string}
 */
export function buildWhatsAppContactUrl(lang = 'en') {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#'
  const message =
    lang === 'hi'
      ? 'नमस्ते! मैं आपके उत्पादों के बारे में जानना चाहता/चाहती हूँ।'
      : 'Hi! I would like to enquire about your products.'
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
