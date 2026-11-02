import siteConfig from '../config/site.config'

/**
 * Build a WhatsApp click-to-chat URL with a wholesale-oriented pre-filled message.
 * Supports English and Hindi.
 *
 * @param {Object} options
 * @param {string} options.productName   - Product name (in target language)
 * @param {string} [options.productUrl]  - Full URL of the product page
 * @param {number|string} [options.quantity] - Optional quantity
 * @param {string} [options.lang]        - 'en' (default) or 'hi'
 * @returns {string} WhatsApp wa.me URL
 */
export function buildWhatsAppUrl({ productName, productUrl, quantity, lang = 'en' }) {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#'

  let message
  if (lang === 'hi') {
    const parts = [
      `नमस्ते! मुझे *${productName}* के बारे में थोक रेट और जानकारी चाहिए।`
    ]
    if (productUrl) parts.push(productUrl)
    if (quantity && parseInt(quantity) > 0) parts.push(`मात्रा: ${quantity} यूनिट`)
    message = parts.join('\n')
  } else {
    const parts = [
      `Hello! I would like to enquire about *${productName}* for wholesale / bulk order.`
    ]
    if (productUrl) parts.push(productUrl)
    if (quantity && parseInt(quantity) > 0) parts.push(`Quantity required: ${quantity} units`)
    message = parts.join('\n')
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * General wholesale contact WhatsApp URL.
 * @param {string} [lang] - 'en' (default) or 'hi'
 */
export function buildWhatsAppContactUrl(lang = 'en') {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#'
  const message =
    lang === 'hi'
      ? 'नमस्ते! मुझे थोक ऑर्डर के बारे में जानकारी चाहिए। कृपया रेट और उपलब्धता बताएं।'
      : 'Hello! I would like to enquire about wholesale pricing and bulk orders for your products.'
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Wholesale pricing enquiry WhatsApp URL.
 * @param {string} [lang]
 */
export function buildWholesaleEnquiryUrl(lang = 'en') {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#'
  const message =
    lang === 'hi'
      ? 'नमस्ते! मुझे आपके प्रोडक्ट का थोक रेट और मिनिमम ऑर्डर क्वांटिटी जाननी है।'
      : 'Hello! I am interested in wholesale pricing for your feeding bottles and steel products. Please share your catalogue and MOQ.'
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
