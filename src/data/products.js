/**
 * Mock product data for YE Baby Products
 *
 * Sourced from actual assets in /assets/ and product_image_mapping.csv.
 * Will be replaced by Supabase queries in Milestone C.
 *
 * CONTENT RULES:
 * - Hindi names/descriptions added (name_hi, description_hi)
 * - Brand names (YE, Moon Baby) not translated
 * - Units (ml, SS 304) not translated
 * - No prices, certifications or invented specifications
 * - Provisional notes retained
 */

// ─────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────
const categories = [
  {
    id: 'glass-bottles',
    name: 'Glass Feeding Bottles',
    name_hi: 'कांच की फीडिंग बोतलें',
    slug: 'glass-bottles',
    sort_order: 1,
    description: 'Borosilicate glass feeding bottles in various sizes',
    description_hi: 'विभिन्न आकारों में बोरोसिलिकेट कांच की फीडिंग बोतलें',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg',
  },
  {
    id: 'plastic-bottles',
    name: 'Plastic Feeding Bottles',
    name_hi: 'प्लास्टिक फीडिंग बोतलें',
    slug: 'plastic-bottles',
    sort_order: 2,
    description: 'BPA-free plastic feeding bottles',
    description_hi: 'BPA-मुक्त प्लास्टिक फीडिंग बोतलें',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM.jpeg',
  },
  {
    id: 'silicone-sleeve',
    name: 'Silicone Sleeve Bottles',
    name_hi: 'सिलिकॉन स्लीव बोतलें',
    slug: 'silicone-sleeve',
    sort_order: 3,
    description: 'Glass bottles with protective silicone sleeves',
    description_hi: 'सुरक्षात्मक सिलिकॉन स्लीव के साथ कांच की बोतलें',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg',
  },
  {
    id: 'ss-bottles',
    name: 'Stainless Steel Bottles',
    name_hi: 'स्टेनलेस स्टील बोतलें',
    slug: 'ss-bottles',
    sort_order: 4,
    description: 'SS 304 grade stainless steel feeding bottles',
    description_hi: 'SS 304 ग्रेड स्टेनलेस स्टील फीडिंग बोतलें',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg',
  },
  {
    id: 'ss-accessories',
    name: 'Stainless Steel Accessories',
    name_hi: 'स्टेनलेस स्टील एक्सेसरीज़',
    slug: 'ss-accessories',
    sort_order: 5,
    description: 'Stainless steel sippers and lunch boxes',
    description_hi: 'स्टेनलेस स्टील सिपर और लंच बॉक्स',
    heroImage: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg',
  },
]

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────
const products = [
  // ── Glass Feeding Bottles ──
  {
    id: 'prod-01',
    name: 'Glass Feeding Bottle — 250 ml',
    name_hi: 'कांच की फीडिंग बोतल — 250 मिली',
    slug: 'glass-feeding-bottle-250ml-blue',
    category_id: 'glass-bottles',
    description: 'Standard glass feeding bottle with blue cap and printed design. Made in India.',
    description_hi: 'नीले ढक्कन और प्रिंटेड डिज़ाइन के साथ मानक कांच की फीडिंग बोतल। भारत में निर्मित।',
    material: 'Borosilicate glass',
    capacity_ml: [250],
    colours: ['Blue'],
    brand_label: 'Moon Baby',
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.51 PM.jpeg', alt: 'Glass feeding bottle 250ml blue cap', is_primary: true },
    ],
    notes: 'Moon Baby branding visible. Relationship with YE unconfirmed.',
  },
  {
    id: 'prod-02',
    name: 'Glass Feeding Bottle — 60 ml (Newborn)',
    name_hi: 'कांच की फीडिंग बोतल — 60 मिली (नवजात शिशु)',
    slug: 'glass-feeding-bottle-60ml-pink',
    category_id: 'glass-bottles',
    description: 'Small glass feeding bottle designed for newborns. Pink cap with scale markings.',
    description_hi: 'नवजात शिशुओं के लिए डिज़ाइन की गई छोटी कांच की फीडिंग बोतल। गुलाबी ढक्कन के साथ स्केल मार्किंग।',
    material: 'Borosilicate glass',
    capacity_ml: [60],
    colours: ['Pink'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 2,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.51 PM (1).jpeg', alt: 'Glass feeding bottle 60ml pink newborn', is_primary: true },
    ],
    notes: null,
  },
  {
    id: 'prod-08',
    name: 'Glass Feeding Bottle — 250 ml (Red Print)',
    name_hi: 'कांच की फीडिंग बोतल — 250 मिली (लाल प्रिंट)',
    slug: 'glass-feeding-bottle-250ml-red',
    category_id: 'glass-bottles',
    description: 'Clear glass feeding bottle with red cap and cartoon animal print.',
    description_hi: 'लाल ढक्कन और कार्टून एनिमल प्रिंट के साथ साफ कांच की फीडिंग बोतल।',
    material: 'Borosilicate glass',
    capacity_ml: [250],
    colours: ['Red'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 3,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg', alt: 'Glass feeding bottle 250ml red cap front', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (2).jpeg', alt: 'Glass feeding bottle 250ml red cap alternate', is_primary: false },
    ],
    notes: null,
  },
  {
    id: 'prod-11',
    name: 'Glass Feeding Bottle — 120 ml (Weather Print)',
    name_hi: 'कांच की फीडिंग बोतल — 120 मिली (वेदर प्रिंट)',
    slug: 'glass-feeding-bottle-120ml-blue-weather',
    category_id: 'glass-bottles',
    description: 'Short glass feeding bottle with blue cap and cloud/weather print design.',
    description_hi: 'नीले ढक्कन और क्लाउड/वेदर प्रिंट डिज़ाइन के साथ छोटी कांच की फीडिंग बोतल।',
    material: 'Borosilicate glass',
    capacity_ml: [120],
    colours: ['Blue'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 4,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (2).jpeg', alt: 'Glass feeding bottle 120ml weather print', is_primary: true },
    ],
    notes: null,
  },
  {
    id: 'prod-12',
    name: 'Glass Feeding Bottle — 120 ml (Rainbow Print)',
    name_hi: 'कांच की फीडिंग बोतल — 120 मिली (रेनबो प्रिंट)',
    slug: 'glass-feeding-bottle-120ml-blue-rainbow',
    category_id: 'glass-bottles',
    description: 'Short glass feeding bottle with blue cap and rainbow/butterfly print design.',
    description_hi: 'नीले ढक्कन और रेनबो/बटरफ्लाई प्रिंट डिज़ाइन के साथ छोटी कांच की फीडिंग बोतल।',
    material: 'Borosilicate glass',
    capacity_ml: [120],
    colours: ['Blue'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 5,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (3).jpeg', alt: 'Glass feeding bottle 120ml rainbow print', is_primary: true },
    ],
    notes: null,
  },

  // ── Plastic Feeding Bottles ──
  {
    id: 'prod-03',
    name: 'Plastic Feeding Bottle — 125 ml',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 125 मिली',
    slug: 'plastic-feeding-bottle-125ml-teal',
    category_id: 'plastic-bottles',
    description: 'Frosted plastic feeding bottle with teal/green cap. Made in India.',
    description_hi: 'टील/हरे ढक्कन के साथ फ्रॉस्टेड प्लास्टिक फीडिंग बोतल। भारत में निर्मित।',
    material: 'BPA-free plastic',
    capacity_ml: [125],
    colours: ['Teal / Green'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM.jpeg', alt: 'Plastic feeding bottle 125ml teal cap', is_primary: true },
    ],
    notes: null,
  },
  {
    id: 'prod-04',
    name: 'Plastic Feeding Bottle with Handles — 120 ml',
    name_hi: 'हैंडल के साथ प्लास्टिक फीडिंग बोतल — 120 मिली',
    slug: 'plastic-feeding-bottle-120ml-handles-blue',
    category_id: 'plastic-bottles',
    description: 'Frosted plastic feeding bottle with two side handles and blue cap.',
    description_hi: 'दो साइड हैंडल और नीले ढक्कन के साथ फ्रॉस्टेड प्लास्टिक फीडिंग बोतल।',
    material: 'BPA-free plastic',
    capacity_ml: [120],
    colours: ['Blue'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 2,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (1).jpeg', alt: 'Plastic feeding bottle 120ml with handles blue', is_primary: true },
    ],
    notes: null,
  },
  {
    id: 'prod-06',
    name: 'Plastic Feeding Bottle — 120 ml (Red)',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 120 मिली (लाल)',
    slug: 'plastic-feeding-bottle-120ml-red',
    category_id: 'plastic-bottles',
    description: 'Frosted plastic feeding bottle with red cap and cloud print.',
    description_hi: 'लाल ढक्कन और क्लाउड प्रिंट के साथ फ्रॉस्टेड प्लास्टिक फीडिंग बोतल।',
    material: 'BPA-free plastic',
    capacity_ml: [120],
    colours: ['Red'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 3,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (3).jpeg', alt: 'Plastic feeding bottle 120ml red cap', is_primary: true },
    ],
    notes: null,
  },
  {
    id: 'prod-09',
    name: 'Plastic Feeding Bottle — 250 ml (Red)',
    name_hi: 'प्लास्टिक फीडिंग बोतल — 250 मिली (लाल)',
    slug: 'plastic-feeding-bottle-250ml-red',
    category_id: 'plastic-bottles',
    description: 'Large frosted plastic feeding bottle with red or pink cap. Weather print design.',
    description_hi: 'लाल या गुलाबी ढक्कन के साथ बड़ी फ्रॉस्टेड प्लास्टिक फीडिंग बोतल। वेदर प्रिंट डिज़ाइन।',
    material: 'BPA-free plastic',
    capacity_ml: [250],
    colours: ['Red', 'Pink'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 4,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (1).jpeg', alt: 'Plastic feeding bottle 250ml red cap', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (3).jpeg', alt: 'Plastic feeding bottle 250ml pink variant', is_primary: false },
    ],
    notes: null,
  },
  {
    id: 'prod-13',
    name: 'Plastic Feeding Bottle with Handles — 250 ml',
    name_hi: 'हैंडल के साथ प्लास्टिक फीडिंग बोतल — 250 मिली',
    slug: 'plastic-feeding-bottle-250ml-handles-blue',
    category_id: 'plastic-bottles',
    description: 'Large frosted plastic feeding bottle with handles and blue cap.',
    description_hi: 'हैंडल और नीले ढक्कन के साथ बड़ी फ्रॉस्टेड प्लास्टिक फीडिंग बोतल।',
    material: 'BPA-free plastic',
    capacity_ml: [250],
    colours: ['Blue'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 5,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM.jpeg', alt: 'Plastic feeding bottle 250ml handles blue', is_primary: true },
    ],
    notes: null,
  },

  // ── Silicone Sleeve Bottles ──
  {
    id: 'prod-05',
    name: 'Silicone Sleeve Glass Bottle — 250 ml',
    name_hi: 'सिलिकॉन स्लीव कांच की बोतल — 250 मिली',
    slug: 'silicone-sleeve-glass-bottle-250ml',
    category_id: 'silicone-sleeve',
    description: 'Glass feeding bottle with star-pattern silicone protective sleeve. Multiple colours available.',
    description_hi: 'स्टार-पैटर्न सिलिकॉन सुरक्षात्मक स्लीव के साथ कांच की फीडिंग बोतल। कई रंगों में उपलब्ध।',
    material: 'Glass + Silicone sleeve',
    capacity_ml: [250],
    colours: ['Blue', 'Green', 'Sky Blue'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg', alt: 'Silicone sleeve glass bottles 250ml pair', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM.jpeg', alt: 'Silicone sleeve glass bottle 250ml blue', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (2).jpeg', alt: 'Silicone sleeve glass bottle 250ml sky blue', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (3).jpeg', alt: 'Silicone sleeve glass bottle accessories', is_primary: false },
    ],
    notes: 'Multiple colour variants visible.',
  },
  {
    id: 'prod-07',
    name: 'Silicone Sleeve Glass Bottle — 120 ml',
    name_hi: 'सिलिकॉन स्लीव कांच की बोतल — 120 मिली',
    slug: 'silicone-sleeve-glass-bottle-120ml',
    category_id: 'silicone-sleeve',
    description: 'Small glass feeding bottle with star-pattern silicone sleeve. With and without handles.',
    description_hi: 'स्टार-पैटर्न सिलिकॉन स्लीव के साथ छोटी कांच की फीडिंग बोतल। हैंडल के साथ और बिना।',
    material: 'Glass + Silicone sleeve',
    capacity_ml: [120],
    colours: ['Mint Green', 'Red'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 2,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (1).jpeg', alt: 'Silicone sleeve glass bottle 120ml mint green', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM.jpeg', alt: 'Silicone sleeve glass bottle 120ml red handles', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (1).jpeg', alt: 'Silicone sleeve glass bottle 120ml red alt', is_primary: false },
    ],
    notes: null,
  },

  // ── Stainless Steel Bottles ──
  {
    id: 'prod-14',
    name: 'Stainless Steel Feeding Bottle — SS 304',
    name_hi: 'स्टेनलेस स्टील फीडिंग बोतल — SS 304',
    slug: 'stainless-steel-feeding-bottle-ss304',
    category_id: 'ss-bottles',
    description: 'SS 304 grade stainless steel feeding bottle with YE branding. Available in multiple sizes.',
    description_hi: 'YE ब्रांडिंग के साथ SS 304 ग्रेड स्टेनलेस स्टील फीडिंग बोतल। कई आकारों में उपलब्ध।',
    material: 'SS 304 Stainless Steel',
    capacity_ml: [150, 200, 250, 300],
    colours: ['Silver'],
    brand_label: 'YE',
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg', alt: 'SS 304 feeding bottle YE logo', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (1).jpeg', alt: 'SS feeding bottle 300ml', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (2).jpeg', alt: 'SS feeding bottle 250ml', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (3).jpeg', alt: 'SS feeding bottle 200ml', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM.jpeg', alt: 'SS feeding bottle 150ml', is_primary: false },
    ],
    notes: 'YE logo clearly engraved. Available in 150/200/250/300 ml.',
  },

  // ── Stainless Steel Accessories ──
  {
    id: 'prod-15',
    name: 'Stainless Steel Lunch Box Set',
    name_hi: 'स्टेनलेस स्टील लंच बॉक्स सेट',
    slug: 'stainless-steel-lunch-box-set',
    category_id: 'ss-accessories',
    description: 'Stainless steel lunch box / tiffin set with teal silicone clip-lock. Two sizes.',
    description_hi: 'टील सिलिकॉन क्लिप-लॉक के साथ स्टेनलेस स्टील लंच बॉक्स / टिफिन सेट। दो आकारों में।',
    material: 'Stainless Steel',
    capacity_ml: null,
    colours: ['Silver with Teal clips'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg', alt: 'Stainless steel lunch box set studio', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (3).jpeg', alt: 'Stainless steel lunch box lifestyle', is_primary: false },
    ],
    notes: null,
  },
  {
    id: 'prod-16',
    name: 'Stainless Steel Vacuum Sipper',
    name_hi: 'स्टेनलेस स्टील वैक्यूम सिपर',
    slug: 'stainless-steel-vacuum-sipper',
    category_id: 'ss-accessories',
    description: 'Cola-shaped stainless steel vacuum insulated sipper / water bottle with YE branding.',
    description_hi: 'YE ब्रांडिंग के साथ कोला-आकार का स्टेनलेस स्टील वैक्यूम इंसुलेटेड सिपर / पानी की बोतल।',
    material: 'Stainless Steel',
    capacity_ml: null,
    colours: ['Silver'],
    brand_label: 'YE',
    status: 'active',
    is_featured: false,
    sort_order: 2,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM.jpeg', alt: 'Stainless steel vacuum sipper', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM (1).jpeg', alt: 'Stainless steel sipper YE logo closeup', is_primary: false },
    ],
    notes: 'YE logo engraved — visible in close-up.',
  },
]

// ─────────────────────────────────────────────
// Helper functions (replaced by Supabase in Milestone C)
// ─────────────────────────────────────────────

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
      desc.toLowerCase().includes(q) ||
      p.material.toLowerCase().includes(q) ||
      (p.colours && p.colours.some(c => c.toLowerCase().includes(q)))
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
