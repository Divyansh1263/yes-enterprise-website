import siteConfig from '../config/site.config.js';

/**
 * Build a WhatsApp click-to-chat URL with a wholesale-oriented pre-filled message.
 * Supports English and Hindi.
 *
 * @param {Object} options
 * @param {string} options.productName       - Product name (in target language)
 * @param {string} [options.productUrl]      - Full URL of the product page
 * @param {number|string} [options.quantity] - Optional quantity requested
 * @param {number|string} [options.actualPrice] - Actual wholesale per-piece price (₹)
 * @param {number|string} [options.wholesaleRate100] - Wholesale rate per 100 pieces (₹)
 * @param {number|string} [options.moq]      - Minimum order quantity
 * @param {string} [options.lang]            - 'en' (default) or 'hi'
 * @returns {string} WhatsApp wa.me URL
 */
export function buildWhatsAppUrl({
  productName,
  productUrl,
  quantity,
  actualPrice,
  wholesaleRate100,
  moq,
  lang = 'en'
}) {
  const phone = siteConfig.whatsappNumber
  if (!phone) return '#'

  let message
  if (lang === 'hi') {
    const parts = [
      `नमस्ते! मुझे YES ENTERPRISES के *${productName}* के बारे में जानकारी चाहिए।`
    ]
    if (productUrl) parts.push(productUrl)
    if (actualPrice != null && actualPrice !== '') {
      parts.push(`• थोक मूल्य (प्रति पीस): ₹${typeof actualPrice === 'number' ? actualPrice.toLocaleString('en-IN') : actualPrice}`)
    }
    if (wholesaleRate100 != null && wholesaleRate100 !== '') {
      parts.push(`• थोक दर (100 पीस): ₹${typeof wholesaleRate100 === 'number' ? wholesaleRate100.toLocaleString('en-IN') : wholesaleRate100}`)
    }
    if (moq != null && moq !== '') {
      parts.push(`• न्यूनतम ऑर्डर मात्रा (MOQ): ${moq} पीस`)
    }
    if (quantity && parseInt(quantity, 10) > 0) {
      parts.push(`• पूछताछ मात्रा: ${quantity} यूनिट`)
    }
    message = parts.join('\n')
  } else {
    const parts = [
      `Hello! I would like to enquire about *${productName}* from YES ENTERPRISES.`
    ]
    if (productUrl) parts.push(productUrl)
    if (actualPrice != null && actualPrice !== '') {
      parts.push(`• Wholesale Price: ₹${typeof actualPrice === 'number' ? actualPrice.toLocaleString('en-IN') : actualPrice}/pc`)
    }
    if (wholesaleRate100 != null && wholesaleRate100 !== '') {
      parts.push(`• Wholesale Rate (100 pcs): ₹${typeof wholesaleRate100 === 'number' ? wholesaleRate100.toLocaleString('en-IN') : wholesaleRate100}`)
    }
    if (moq != null && moq !== '') {
      parts.push(`• Minimum Order Quantity (MOQ): ${moq} pcs`)
    }
    if (quantity && parseInt(quantity, 10) > 0) {
      parts.push(`• Enquiring Quantity: ${quantity} units`)
    }
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
      ? 'नमस्ते! मुझे YES ENTERPRISES के प्रोडक्ट्स और ऑर्डर के बारे में जानकारी चाहिए।'
      : 'Hello! I would like to enquire about products and orders from YES ENTERPRISES.'
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
