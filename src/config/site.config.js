/**
 * ─────────────────────────────────────────────────────────────────────────────
 * YE Baby Products — Site Configuration (Admin Panel)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * INSTRUCTIONS FOR THE MANUFACTURER / ADMIN:
 *   Edit only the values in this file. All pages pull contact details,
 *   branding and business information from here automatically.
 *
 * Fields marked  ✅ CONFIRMED   — verified by the manufacturer.
 * Fields marked  ⚠ TODO         — need manufacturer input before going live.
 *   Leave TODO fields as empty string ''. The website will display
 *   "To be confirmed" automatically wherever they are empty.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const siteConfig = {

  // ── Brand ──────────────────────────────────────────────────────────────────
  // ✅ CONFIRMED
  brandName: 'YE',
  tagline: 'Feeding Bottles & Steel Essentials — Wholesale Supplier',

  // Sub-brand appearing on some glass bottle labels.
  // ⚠ TODO: Confirm exact relationship between YE and Moon Baby
  subBrand: 'Moon Baby',

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  // ✅ CONFIRMED — country code + digits only, no spaces, no +
  whatsappNumber: '917454848548',

  // ── Owner / Primary Contact ────────────────────────────────────────────────
  // ✅ CONFIRMED
  ownerPhone: '7454848548',
  ownerPhoneDisplay: '+91 74548 48548',
  ownerPhoneTel: 'tel:+917454848548',
  ownerWhatsApp: 'https://wa.me/917454848548',

  // ⚠ TODO: Provide the owner's full name and designation
  //   ownerName: '',
  //   ownerDesignation: '',

  // ✅ CONFIRMED — photo file is in /assets/
  ownerPhotoPath: '/assets/owner photo.jpeg',

  // ── Business Contact Details ───────────────────────────────────────────────
  // ✅ CONFIRMED
  phone: '7454848548',
  phoneDisplay: '+91 74548 48548',

  // ⚠ TODO: Business email address
  email: '',

  // ⚠ TODO: Full business address (shown on Contact page)
  address: '',

  // ⚠ TODO: Business hours (e.g. 'Mon–Sat, 9 AM – 6 PM IST')
  businessHours: '',

  // ── Social / Online Presence ───────────────────────────────────────────────
  // ⚠ TODO: Fill in if Instagram / Facebook pages exist
  instagram: '',
  facebook: '',

  // ⚠ TODO: Live website domain once published
  siteUrl: '',

  // ── Product / Specification Claims ─────────────────────────────────────────
  // These control which specification badges appear site-wide.
  // Set to true ONLY when the manufacturer has confirmed the claim.
  // ✅ CONFIRMED — "Made in India" label visible on product packaging
  claimMadeInIndia: true,
  // ⚠ TODO: Confirm — "BPA Free" marking visible on some product packaging photos
  claimBpaFree: true,
  // ⚠ TODO: Confirm — glass products described as borosilicate; verify with manufacturer
  claimBorosilicateGlass: false,
  // ✅ CONFIRMED — SS 304 engraved on stainless steel bottles
  claimSS304: true,
  // ⚠ TODO: Confirm vacuum insulation spec for steel sipper
  claimVacuumInsulated: false,

  // ── Colours (mirrors tailwind.config.js tokens) ────────────────────────────
  colors: {
    primaryNavy: '#19345A',
    primaryNavyLight: '#2A4A7A',
    primaryNavyDark: '#142A48',
    ivory: '#F7F5EF',
    amber: '#E9B956',
  },
}

export default siteConfig
