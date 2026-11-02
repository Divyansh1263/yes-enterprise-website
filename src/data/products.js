/**
 * YE Baby Products — Corrected Product Data
 *
 * Sourced from visual inspection of /assets/ images and product_image_mapping.csv.
 * Will be replaced by Supabase queries in Milestone C.
 *
 * CONTENT RULES:
 * - Material stated only where confirmed by CSV visual inspection
 * - No invented prices, certifications or specifications
 * - Alternate-view images grouped under their primary product (not listed as separate products)
 * - Provisional notes retained where identity uncertain
 * - Wholesale-only positioning throughout
 * - Hindi names/descriptions use natural conversational Hindi
 * - Brand names (YE, Moon Baby, BPA Free) not translated
 * - Units (ml, SS 304) not translated
 *
 * AUDIT CORRECTIONS vs. previous data:
 * - PROD-05 silicone sleeve bottles: body material NOT confirmed as glass — named neutrally
 * - PROD-07 120ml silicone sleeve: listed as separate product (different size), not PROD-05 variant
 * - PROD-09 frosted plastic 250ml: correctly classified as plastic, not glass
 * - PROD-13 large plastic with handles: correctly classified as plastic, not silicone
 * - PROD-14 SS bottles: grouped as ONE product (same model, 4 sizes) with 5 images
 * - PROD-15 SS tiffin: listed under ss-accessories, not ss-bottles
 * - PROD-16 SS sipper: listed under ss-accessories
 * - No stainless steel sippers in ss-bottles category
 */

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────
const categories = [
  {
    id: 'glass-bottles',
    name: 'Glass Feeding Bottles',
    name_hi: 'कांच की फीडिंग बोतलें',
    slug: 'glass-bottles',
    sort_order: 1,
    description: 'Glass feeding bottles in multiple sizes',
    description_hi: 'विभिन्न साइज़ में कांच की फीडिंग बोतलें',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg',
    // accent: cool blue/lavender
    accentFrom: '#DCECF5',
    accentTo: '#E8DDF7',
  },
  {
    id: 'plastic-bottles',
    name: 'Plastic Feeding Bottles',
    name_hi: 'प्लास्टिक की फीडिंग बोतलें',
    slug: 'plastic-bottles',
    sort_order: 2,
    description: 'BPA-free plastic feeding bottles in various sizes and colours',
    description_hi: 'BPA-फ्री प्लास्टिक की फीडिंग बोतलें, अलग-अलग साइज़ और रंगों में',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM.jpeg',
    // accent: soft blue
    accentFrom: '#DCECF5',
    accentTo: '#C8EDE4',
  },
  {
    id: 'silicone-sleeve',
    name: 'Silicone Sleeve Bottles',
    name_hi: 'सिलिकॉन स्लीव वाली बोतलें',
    slug: 'silicone-sleeve',
    sort_order: 3,
    description: 'Feeding bottles with protective silicone sleeves in multiple sizes',
    description_hi: 'सिलिकॉन स्लीव के साथ फीडिंग बोतलें, अलग-अलग साइज़ में',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg',
    // accent: mint/teal
    accentFrom: '#B9D9CE',
    accentTo: '#C8EDE4',
  },
  {
    id: 'ss-bottles',
    name: 'Stainless Steel Feeding Bottles',
    name_hi: 'स्टेनलेस स्टील फीडिंग बोतलें',
    slug: 'ss-bottles',
    sort_order: 4,
    description: 'SS 304 grade stainless steel feeding bottles in multiple capacities',
    description_hi: 'SS 304 ग्रेड स्टेनलेस स्टील फीडिंग बोतलें, अलग-अलग क्षमता में',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg',
    // accent: silver/blue
    accentFrom: '#DCECF5',
    accentTo: '#B9D9CE',
  },
  {
    id: 'ss-accessories',
    name: 'Steel Sippers & Tiffin Boxes',
    name_hi: 'स्टील सिपर और टिफिन बॉक्स',
    slug: 'ss-accessories',
    sort_order: 5,
    description: 'Stainless steel sippers and tiffin boxes for wholesale supply',
    description_hi: 'थोक सप्लाई के लिए स्टेनलेस स्टील सिपर और टिफिन बॉक्स',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg',
    // accent: peach/amber
    accentFrom: '#F8DFD1',
    accentTo: '#F8E9B7',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Products (12 distinct products after grouping alt-views)
// ─────────────────────────────────────────────────────────────────────────────
const products = [

  // ── Glass Feeding Bottles ──────────────────────────────────────────────────
  {
    id: 'prod-01',
    name: 'Glass Feeding Bottle — 250 ml (Blue)',
    name_hi: 'कांच की फीडिंग बोतल — 250 ml (नीली)',
    slug: 'glass-feeding-bottle-250ml-blue',
    category_id: 'glass-bottles',
    description: 'Glass feeding bottle with blue cap and cartoon print. Available for wholesale enquiries.',
    description_hi: 'नीली कैप और प्रिंट वाली कांच की फीडिंग बोतल (250 ml)। थोक ऑर्डर के लिए संपर्क करें।',
    material: 'Glass',
    capacity: '250 ml',
    colours: ['Blue cap, clear body'],
    brand: 'Moon Baby',
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.51 PM.jpeg',
        alt: 'Glass feeding bottle 250ml blue cap',
        is_primary: true,
      },
    ],
    notes: 'Moon Baby branding visible on label. BPA Free marked.',
  },

  {
    id: 'prod-02',
    name: 'Glass Feeding Bottle — 60 ml (Pink)',
    name_hi: 'कांच की फीडिंग बोतल — 60 ml (गुलाबी)',
    slug: 'glass-feeding-bottle-60ml-pink',
    category_id: 'glass-bottles',
    description: 'Small glass feeding bottle for newborns, with pink cap. Available for wholesale enquiries.',
    description_hi: 'नवजात शिशुओं के लिए छोटी कांच की फीडिंग बोतल, गुलाबी कैप (60 ml)। थोक ऑर्डर के लिए संपर्क करें।',
    material: 'Glass',
    capacity: '60 ml',
    colours: ['Pink cap, clear body'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 2,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.51 PM (1).jpeg',
        alt: 'Glass feeding bottle 60ml pink cap',
        is_primary: true,
      },
    ],
    notes: 'BPA Free marked. Approx 60 ml capacity visible on bottle.',
  },

  {
    id: 'prod-08',
    name: 'Glass Feeding Bottle — 250 ml (Red)',
    name_hi: 'कांच की फीडिंग बोतल — 250 ml (लाल)',
    slug: 'glass-feeding-bottle-250ml-red',
    category_id: 'glass-bottles',
    description: 'Clear glass feeding bottle with red cap and printed cartoon design. Contact us for wholesale pricing.',
    description_hi: 'लाल कैप और प्रिंट वाली कांच की फीडिंग बोतल (250 ml)। थोक रेट के लिए संपर्क करें।',
    material: 'Glass',
    capacity: '250 ml',
    colours: ['Red cap, clear body'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 3,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg',
        alt: 'Glass feeding bottle 250ml red cap',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (2).jpeg',
        alt: 'Glass feeding bottle 250ml red cap alternate angle',
        is_primary: false,
      },
    ],
    notes: null,
  },

  {
    id: 'prod-11',
    name: 'Glass Feeding Bottle — 120 ml (Blue)',
    name_hi: 'कांच की फीडिंग बोतल — 120 ml (नीली)',
    slug: 'glass-feeding-bottle-120ml-blue',
    category_id: 'glass-bottles',
    description: 'Short glass feeding bottle with blue cap and cloud print. Available for wholesale orders.',
    description_hi: 'नीली कैप और क्लाउड प्रिंट वाली कांच की छोटी फीडिंग बोतल (120 ml)। थोक ऑर्डर के लिए संपर्क करें।',
    material: 'Glass',
    capacity: '120 ml',
    colours: ['Blue cap, clear body'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 4,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (2).jpeg',
        alt: 'Glass feeding bottle 120ml blue cap',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (3).jpeg',
        alt: 'Glass feeding bottle 120ml blue cap butterfly print',
        is_primary: false,
      },
    ],
    notes: null,
  },

  // ── Plastic Feeding Bottles ────────────────────────────────────────────────
  {
    id: 'prod-03',
    name: 'Plastic Feeding Bottle — 125 ml (Teal)',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 125 ml (हरी)',
    slug: 'plastic-feeding-bottle-125ml-teal',
    category_id: 'plastic-bottles',
    description: 'BPA-free frosted plastic feeding bottle with teal/green cap and measurement markings. Contact us for wholesale pricing.',
    description_hi: 'BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल, हरी कैप के साथ (125 ml)। थोक रेट के लिए संपर्क करें।',
    material: 'BPA-Free Plastic',
    capacity: '125 ml',
    colours: ['Teal/green cap, frosted body'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 5,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM.jpeg',
        alt: 'Plastic feeding bottle 125ml teal cap',
        is_primary: true,
      },
    ],
    notes: 'BPA Free marked. Made in India label visible.',
  },

  {
    id: 'prod-04',
    name: 'Plastic Feeding Bottle — 120 ml with Handles (Blue)',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 120 ml हैंडल के साथ (नीली)',
    slug: 'plastic-feeding-bottle-120ml-handles-blue',
    category_id: 'plastic-bottles',
    description: 'BPA-free frosted plastic feeding bottle with two side handles and blue cap. Ideal for toddlers. Contact for wholesale orders.',
    description_hi: 'दोनों तरफ हैंडल वाली BPA-फ्री प्लास्टिक फीडिंग बोतल, नीली कैप (120 ml)। थोक ऑर्डर के लिए संपर्क करें।',
    material: 'BPA-Free Plastic',
    capacity: '120 ml',
    colours: ['Blue cap, frosted body'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 6,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (1).jpeg',
        alt: 'Plastic feeding bottle 120ml with handles blue cap',
        is_primary: true,
      },
    ],
    notes: 'BPA Free marked. Two integrated side handles visible.',
  },

  {
    id: 'prod-06',
    name: 'Plastic Feeding Bottle — 120 ml (Red)',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 120 ml (लाल)',
    slug: 'plastic-feeding-bottle-120ml-red',
    category_id: 'plastic-bottles',
    description: 'BPA-free frosted plastic feeding bottle with red cap and weather print design. Available for wholesale orders.',
    description_hi: 'लाल कैप वाली BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल (120 ml)। थोक ऑर्डर के लिए संपर्क करें।',
    material: 'BPA-Free Plastic',
    capacity: '120 ml',
    colours: ['Red cap, frosted body'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 7,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (3).jpeg',
        alt: 'Plastic feeding bottle 120ml red cap',
        is_primary: true,
      },
    ],
    notes: 'BPA Free marked.',
  },

  {
    id: 'prod-09',
    name: 'Plastic Feeding Bottle — 250 ml (Red)',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 250 ml (लाल)',
    slug: 'plastic-feeding-bottle-250ml-red',
    category_id: 'plastic-bottles',
    description: 'Large BPA-free frosted plastic feeding bottle with red cap. Contact for wholesale pricing and availability.',
    description_hi: 'बड़ी BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल, लाल कैप (250 ml)। थोक रेट के लिए संपर्क करें।',
    material: 'BPA-Free Plastic',
    capacity: '250 ml',
    colours: ['Red cap, frosted body'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 8,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (1).jpeg',
        alt: 'Plastic feeding bottle 250ml red cap',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (3).jpeg',
        alt: 'Plastic feeding bottle 250ml alternate angle',
        is_primary: false,
      },
    ],
    notes: 'Dust cap shown separately in primary image.',
  },

  {
    id: 'prod-13',
    name: 'Plastic Feeding Bottle — 250 ml with Handles (Blue)',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 250 ml हैंडल के साथ (नीली)',
    slug: 'plastic-feeding-bottle-250ml-handles-blue',
    category_id: 'plastic-bottles',
    description: 'Large BPA-free frosted plastic feeding bottle with handles and blue cap. Designed for older infants. Contact for wholesale orders.',
    description_hi: 'हैंडल और नीली कैप के साथ बड़ी BPA-फ्री फ्रॉस्टेड प्लास्टिक फीडिंग बोतल (250 ml)। थोक ऑर्डर के लिए संपर्क करें।',
    material: 'BPA-Free Plastic',
    capacity: '250 ml',
    colours: ['Blue cap, frosted body'],
    brand: null,
    status: 'active',
    is_featured: true,
    sort_order: 9,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM.jpeg',
        alt: 'Plastic feeding bottle 250ml with handles blue cap',
        is_primary: true,
      },
    ],
    notes: 'Dust cap shown separately. Handles visible on both sides.',
  },

  // ── Silicone Sleeve Bottles ────────────────────────────────────────────────
  {
    id: 'prod-05',
    name: 'Silicone Sleeve Feeding Bottle — 250 ml',
    name_hi: 'सिलिकॉन स्लीव फीडिंग बोतल — 250 ml',
    slug: 'silicone-sleeve-feeding-bottle-250ml',
    category_id: 'silicone-sleeve',
    description: 'Feeding bottle with star-pattern silicone sleeve and easy-grip design, available in 250 ml. Contact for wholesale pricing and colour variants.',
    description_hi: 'स्टार पैटर्न सिलिकॉन स्लीव वाली फीडिंग बोतल (250 ml)। नीले और हरे रंग में उपलब्ध। थोक रेट के लिए संपर्क करें।',
    material: 'Silicone sleeve; inner body material unconfirmed',
    capacity: '250 ml',
    colours: ['Blue sleeve', 'Green sleeve', 'Sky blue sleeve'],
    brand: null,
    status: 'active',
    is_featured: true,
    sort_order: 10,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg',
        alt: 'Silicone sleeve feeding bottles 250ml pair blue and green',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM.jpeg',
        alt: 'Silicone sleeve feeding bottle 250ml blue single',
        is_primary: false,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (2).jpeg',
        alt: 'Silicone sleeve feeding bottle 250ml sky blue',
        is_primary: false,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (3).jpeg',
        alt: 'Silicone sleeve feeding bottle 250ml with spare cap',
        is_primary: false,
      },
    ],
    notes: 'Inner body material (glass or plastic) cannot be confirmed from images alone. Described neutrally.',
  },

  {
    id: 'prod-07',
    name: 'Silicone Sleeve Feeding Bottle — 120 ml',
    name_hi: 'सिलिकॉन स्लीव फीडिंग बोतल — 120 ml',
    slug: 'silicone-sleeve-feeding-bottle-120ml',
    category_id: 'silicone-sleeve',
    description: 'Compact feeding bottle with star-pattern silicone sleeve, available in 120 ml with and without handles. Contact for wholesale pricing.',
    description_hi: 'स्टार पैटर्न सिलिकॉन स्लीव वाली छोटी फीडिंग बोतल (120 ml)। हैंडल के साथ और बिना हैंडल दोनों विकल्प उपलब्ध। थोक रेट के लिए संपर्क करें।',
    material: 'Silicone sleeve; inner body material unconfirmed',
    capacity: '120 ml',
    colours: ['Green/mint sleeve', 'Red sleeve'],
    brand: null,
    status: 'active',
    is_featured: false,
    sort_order: 11,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (1).jpeg',
        alt: 'Silicone sleeve feeding bottle 120ml mint green',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM.jpeg',
        alt: 'Silicone sleeve feeding bottle 120ml red with handles',
        is_primary: false,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (1).jpeg',
        alt: 'Silicone sleeve feeding bottle 120ml red handles alternate',
        is_primary: false,
      },
    ],
    notes: 'Inner body material (glass or plastic) cannot be confirmed from images alone. Described neutrally.',
  },

  // ── Stainless Steel Feeding Bottles ───────────────────────────────────────
  {
    id: 'prod-14',
    name: 'SS 304 Stainless Steel Feeding Bottle',
    name_hi: 'SS 304 स्टेनलेस स्टील फीडिंग बोतल',
    slug: 'stainless-steel-feeding-bottle-ss304',
    category_id: 'ss-bottles',
    description: 'Food-grade SS 304 stainless steel feeding bottle with YE branding, available in 150 ml, 200 ml, 250 ml and 300 ml. Contact for wholesale pricing.',
    description_hi: 'YE ब्रांड की SS 304 स्टेनलेस स्टील फीडिंग बोतल — 150 ml, 200 ml, 250 ml और 300 ml में उपलब्ध। थोक रेट के लिए संपर्क करें।',
    material: 'SS 304 Stainless Steel',
    capacity: '150 ml, 200 ml, 250 ml, 300 ml',
    colours: ['Silver'],
    brand: 'YE',
    status: 'active',
    is_featured: true,
    sort_order: 12,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg',
        alt: 'SS 304 stainless steel feeding bottle YE logo',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (1).jpeg',
        alt: 'SS 304 stainless steel feeding bottle 300ml',
        is_primary: false,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (2).jpeg',
        alt: 'SS 304 stainless steel feeding bottle 250ml',
        is_primary: false,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (3).jpeg',
        alt: 'SS 304 stainless steel feeding bottle 200ml',
        is_primary: false,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM.jpeg',
        alt: 'SS 304 stainless steel feeding bottle 150ml',
        is_primary: false,
      },
    ],
    notes: 'YE logo and SS 304 grade clearly engraved on bottle. Studio-quality render images.',
  },

  // ── Steel Sippers & Tiffin Boxes ──────────────────────────────────────────
  {
    id: 'prod-15',
    name: 'Stainless Steel Tiffin Box Set',
    name_hi: 'स्टेनलेस स्टील टिफिन बॉक्स सेट',
    slug: 'stainless-steel-tiffin-box-set',
    category_id: 'ss-accessories',
    description: 'Stainless steel tiffin / lunch box set with teal silicone clip-lock lid, available in two sizes. Contact for wholesale enquiries.',
    description_hi: 'टील सिलिकॉन क्लिप-लॉक ढक्कन के साथ स्टेनलेस स्टील टिफिन बॉक्स सेट, दो साइज़ में। थोक ऑर्डर के लिए संपर्क करें।',
    material: 'Stainless Steel',
    capacity: 'Two sizes (small + large)',
    colours: ['Silver body with teal clips'],
    brand: null,
    status: 'active',
    is_featured: true,
    sort_order: 13,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg',
        alt: 'Stainless steel tiffin box set studio',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (3).jpeg',
        alt: 'Stainless steel tiffin box set open with food',
        is_primary: false,
      },
    ],
    notes: null,
  },

  {
    id: 'prod-16',
    name: 'Stainless Steel Vacuum Sipper',
    name_hi: 'स्टेनलेस स्टील वैक्यूम सिपर',
    slug: 'stainless-steel-vacuum-sipper',
    category_id: 'ss-accessories',
    description: 'Cola-shaped stainless steel sipper / water bottle with YE branding engraved. Contact for wholesale pricing.',
    description_hi: 'YE ब्रांड एनग्रेव किया हुआ स्टेनलेस स्टील सिपर / वाटर बोतल। थोक रेट के लिए संपर्क करें।',
    material: 'Stainless Steel',
    capacity: null,
    colours: ['Silver'],
    brand: 'YE',
    status: 'active',
    is_featured: false,
    sort_order: 14,
    images: [
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM.jpeg',
        alt: 'Stainless steel vacuum sipper YE',
        is_primary: true,
      },
      {
        src: '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM (1).jpeg',
        alt: 'Stainless steel sipper YE logo engraved closeup',
        is_primary: false,
      },
    ],
    notes: 'YE logo engraved — visible in close-up image. Vacuum insulation unconfirmed by manufacturer — update site.config.js when confirmed.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions (replaced by Supabase in Milestone C)
// ─────────────────────────────────────────────────────────────────────────────

export function getAllCategories() {
  return [...categories].sort((a, b) => a.sort_order - b.sort_order)
}

export function getAllProducts() {
  return products.filter(p => p.status === 'active').sort((a, b) => a.sort_order - b.sort_order)
}

export function getFeaturedProducts() {
  return products.filter(p => p.is_featured && p.status === 'active').sort((a, b) => a.sort_order - b.sort_order)
}

export function getProductsByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return getAllProducts()
  return getAllProducts().filter(p => p.category_id === categoryId)
}

export function getProductBySlug(slug) {
  return products.find(p => p.slug === slug && p.status === 'active') || null
}

export function getRelatedProducts(product, limit = 3) {
  if (!product) return []
  return getAllProducts()
    .filter(p => p.category_id === product.category_id && p.id !== product.id)
    .slice(0, limit)
}

export function searchProducts(query, lang = 'en') {
  if (!query || !query.trim()) return getAllProducts()
  const q = query.toLowerCase().trim()
  return getAllProducts().filter(p => {
    const name = lang === 'hi' ? (p.name_hi || p.name) : p.name
    const desc = lang === 'hi' ? (p.description_hi || p.description) : p.description
    return (
      name.toLowerCase().includes(q) ||
      (desc && desc.toLowerCase().includes(q)) ||
      (p.material && p.material.toLowerCase().includes(q)) ||
      (p.colours && p.colours.some(c => c.toLowerCase().includes(q))) ||
      (p.capacity && p.capacity.toLowerCase().includes(q))
    )
  })
}

export function getCategoryById(id) {
  return categories.find(c => c.id === id) || null
}

export function getProductName(product, lang = 'en') {
  return lang === 'hi' ? (product.name_hi || product.name) : product.name
}

export function getProductDescription(product, lang = 'en') {
  return lang === 'hi' ? (product.description_hi || product.description) : product.description
}

export function getCategoryName(category, lang = 'en') {
  return lang === 'hi' ? (category.name_hi || category.name) : category.name
}

export { categories, products }
