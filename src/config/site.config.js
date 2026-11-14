/**
 * ─────────────────────────────────────────────────────────────────────────────
 * YES ENTERPRISES — Site Configuration (Admin Panel)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * OFFICIAL COMPANY IDENTITY:
 *   - Official Legal & Trade Name: YES ENTERPRISES
 *   - Logo: Supplied YE monogram logo (/assets/logo.jpeg)
 *   - Constitution: Partnership (verified by GST & Partnership Deed)
 *   - Business Type: Manufacturers & Suppliers
 *   - Core Focus: Baby feeding bottles, water bottles and stainless-steel products
 *   - Registered Location (GST): Village Tewar Patti Urf Kazipura, Kundarki,
 *                                Tehsil Bilari, Moradabad, Uttar Pradesh, PIN 244413
 *
 * INSTRUCTIONS FOR THE ADMIN:
 *   Edit values in this file. All pages pull contact details, branding
 *   and business information from here automatically.
 *
 * Fields marked  ✅ CONFIRMED   — verified by official documents / partner.
 * Fields marked  ⚠ TODO / PENDING — need explicit confirmation before going live.
 *   Leave TODO fields as empty string ''. The website will display
 *   "To be confirmed" automatically wherever they are empty.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const siteConfig = {

  // ── Brand & Company ────────────────────────────────────────────────────────
  // ✅ CONFIRMED — YES ENTERPRISES is the company name; YE is the monogram/logo
  companyName: 'YES ENTERPRISES',
  brandName: 'YES ENTERPRISES',
  monogram: 'YE',
  descriptor: 'Manufacturers & Suppliers of Feeding Bottles, Water Bottles and Stainless Steel Products',
  tagline: 'Manufacturers & Suppliers of Feeding Bottles, Water Bottles & Stainless Steel Products',

  // Constitution: Partnership firm (Uvais Ali & Rukhsar)
  constitution: 'Partnership',

  // Note: Moon Baby relationship is unconfirmed. Do not present as an owned brand or sub-brand.
  subBrand: '',

  // ── Logo ───────────────────────────────────────────────────────────────────
  // ✅ CONFIRMED — official monogram logo supplied in /assets/
  logoPath: '/assets/logo.jpeg',

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  // ✅ CONFIRMED — country code + digits only, no spaces, no +
  whatsappNumber: '917454848548',

  // ── Contact / Primary Representative ───────────────────────────────────────
  // ✅ CONFIRMED & APPROVED
  ownerName: 'Uvais Ali',
  ownerDesignation: 'Partner',
  ownerDesignation_hi: 'पार्टनर',
  ownerPhone: '7454848548',
  ownerPhoneDisplay: '+91 74548 48548',
  ownerPhoneTel: 'tel:+917454848548',
  ownerWhatsApp: 'https://wa.me/917454848548',

  // ✅ CONFIRMED & APPROVED: Uvais Ali personal photograph (public/assets/owner photo.jpeg)
  ownerPhotoPath: '/assets/owner%20photo.jpeg',

  // ── Business Contact Details ───────────────────────────────────────────────
  // ✅ CONFIRMED
  phone: '7454848548',
  phoneDisplay: '+91 74548 48548',

  // ⚠ TODO: Public-facing business email address
  email: '',

  // ⚠ TODO: Public-facing contact address (keep separate from GST registered address until confirmed)
  address: '',

  // ⚠ TODO: Business hours (e.g. 'Mon–Sat, 9 AM – 6 PM IST')
  businessHours: '',

  // ── Social / Online Presence ───────────────────────────────────────────────
  // ⚠ TODO: Fill in if Instagram / Facebook pages exist
  instagram: '',
  facebook: '',

  // ✅ CONFIRMED — Live production website domain (purchased & active)
  siteUrl: 'https://yesenterprises.net.in',

  // ── Product / Specification Claims ─────────────────────────────────────────
  // These control which specification badges appear site-wide.
  // Set to true ONLY when the manufacturer has confirmed the claim.
  // ✅ CONFIRMED — "Made in India" label visible on product packaging
  claimMadeInIndia: true,
  // ✅ CONFIRMED — "BPA Free" marking visible on product packaging photos
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
