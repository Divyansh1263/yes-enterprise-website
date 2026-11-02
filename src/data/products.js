/**
 * Mock product data for YE Baby Products
 *
 * This data is derived from the actual product images in /assets/ and the
 * product_image_mapping.csv. It will be replaced by Supabase queries in Milestone C.
 *
 * IMPORTANT:
 * - Product names are descriptive/provisional — awaiting manufacturer confirmation.
 * - No prices are listed — all products use "Contact for price".
 * - No certifications or safety claims are invented.
 * - Capacities and colours come from what is visible in the product images.
 * - Brand relationship (YE vs Moon Baby) is noted but unconfirmed.
 */

const categories = [
  { id: 'glass-bottles', name: 'Glass Feeding Bottles', slug: 'glass-bottles', sort_order: 1, description: 'Borosilicate glass feeding bottles in various sizes' },
  { id: 'plastic-bottles', name: 'Plastic Feeding Bottles', slug: 'plastic-bottles', sort_order: 2, description: 'BPA-free plastic feeding bottles' },
  { id: 'silicone-sleeve', name: 'Silicone Sleeve Bottles', slug: 'silicone-sleeve', sort_order: 3, description: 'Glass bottles with protective silicone sleeves' },
  { id: 'ss-bottles', name: 'Stainless Steel Bottles', slug: 'ss-bottles', sort_order: 4, description: 'SS 304 grade stainless steel feeding bottles' },
  { id: 'ss-accessories', name: 'Stainless Steel Accessories', slug: 'ss-accessories', sort_order: 5, description: 'Stainless steel sippers and lunch boxes' },
]

const products = [
  // ───── Glass Feeding Bottles ─────
  {
    id: 'prod-01',
    name: 'Glass Feeding Bottle — 250 ml',
    slug: 'glass-feeding-bottle-250ml-blue',
    category_id: 'glass-bottles',
    description: 'Standard glass feeding bottle with blue cap and printed design. Made in India.',
    material: 'Borosilicate glass',
    capacity_ml: [250],
    colours: ['Blue'],
    brand_label: 'Moon Baby', // Provisional — relationship with YE unconfirmed
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.51 PM.jpeg', alt: 'Glass feeding bottle 250ml blue cap front view', is_primary: true },
    ],
    notes: 'Moon Baby branding visible. BPA Free marking visible.',
  },
  {
    id: 'prod-02',
    name: 'Glass Feeding Bottle — 60 ml (Newborn)',
    slug: 'glass-feeding-bottle-60ml-pink',
    category_id: 'glass-bottles',
    description: 'Small glass feeding bottle designed for newborns. Pink cap with printed scale markings.',
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
    notes: 'BPA Free marking visible.',
  },
  {
    id: 'prod-08',
    name: 'Glass Feeding Bottle — 250 ml (Red Print)',
    slug: 'glass-feeding-bottle-250ml-red',
    category_id: 'glass-bottles',
    description: 'Clear glass feeding bottle with red cap and cartoon animal print.',
    material: 'Borosilicate glass',
    capacity_ml: [250],
    colours: ['Red'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 3,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg', alt: 'Glass feeding bottle 250ml red cap front view', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (2).jpeg', alt: 'Glass feeding bottle 250ml red cap alternate angle', is_primary: false },
    ],
    notes: null,
  },
  {
    id: 'prod-11',
    name: 'Glass Feeding Bottle — 120 ml (Weather Print)',
    slug: 'glass-feeding-bottle-120ml-blue-weather',
    category_id: 'glass-bottles',
    description: 'Short glass feeding bottle with blue cap and cloud/weather print design.',
    material: 'Borosilicate glass',
    capacity_ml: [120],
    colours: ['Blue'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 4,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (2).jpeg', alt: 'Glass feeding bottle 120ml blue weather print', is_primary: true },
    ],
    notes: null,
  },
  {
    id: 'prod-12',
    name: 'Glass Feeding Bottle — 120 ml (Rainbow Print)',
    slug: 'glass-feeding-bottle-120ml-blue-rainbow',
    category_id: 'glass-bottles',
    description: 'Short glass feeding bottle with blue cap and rainbow/butterfly print design.',
    material: 'Borosilicate glass',
    capacity_ml: [120],
    colours: ['Blue'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 5,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (3).jpeg', alt: 'Glass feeding bottle 120ml blue rainbow print', is_primary: true },
    ],
    notes: 'BPA Free marking visible.',
  },

  // ───── Plastic Feeding Bottles ─────
  {
    id: 'prod-03',
    name: 'Plastic Feeding Bottle — 125 ml',
    slug: 'plastic-feeding-bottle-125ml-teal',
    category_id: 'plastic-bottles',
    description: 'Frosted plastic feeding bottle with green/teal cap and printed scale. Made in India.',
    material: 'BPA-free plastic',
    capacity_ml: [125],
    colours: ['Teal / Green'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM.jpeg', alt: 'Plastic feeding bottle 125ml teal green cap', is_primary: true },
    ],
    notes: 'BPA Free marking visible. Made in India.',
  },
  {
    id: 'prod-04',
    name: 'Plastic Feeding Bottle with Handles — 120 ml',
    slug: 'plastic-feeding-bottle-120ml-handles-blue',
    category_id: 'plastic-bottles',
    description: 'Frosted plastic feeding bottle with two handles and blue cap. Cloud/weather print design.',
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
    notes: 'BPA Free marking visible.',
  },
  {
    id: 'prod-06',
    name: 'Plastic Feeding Bottle — 120 ml (Red)',
    slug: 'plastic-feeding-bottle-120ml-red',
    category_id: 'plastic-bottles',
    description: 'Frosted plastic feeding bottle with red cap and cloud/weather print. 120 ml capacity.',
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
    notes: 'BPA Free marking visible.',
  },
  {
    id: 'prod-09',
    name: 'Plastic Feeding Bottle — 250 ml (Red)',
    slug: 'plastic-feeding-bottle-250ml-red',
    category_id: 'plastic-bottles',
    description: 'Large frosted plastic feeding bottle with red cap and weather print design.',
    material: 'BPA-free plastic',
    capacity_ml: [250],
    colours: ['Red', 'Pink'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 4,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (1).jpeg', alt: 'Plastic feeding bottle 250ml red cap', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM (3).jpeg', alt: 'Plastic feeding bottle 250ml pink/salmon variant', is_primary: false },
    ],
    notes: null,
  },
  {
    id: 'prod-13',
    name: 'Plastic Feeding Bottle with Handles — 250 ml',
    slug: 'plastic-feeding-bottle-250ml-handles-blue',
    category_id: 'plastic-bottles',
    description: 'Large frosted plastic feeding bottle with handles and blue cap. City/umbrella print.',
    material: 'BPA-free plastic',
    capacity_ml: [250],
    colours: ['Blue'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 5,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM.jpeg', alt: 'Plastic feeding bottle 250ml with handles blue', is_primary: true },
    ],
    notes: null,
  },

  // ───── Silicone Sleeve Glass Bottles ─────
  {
    id: 'prod-05',
    name: 'Silicone Sleeve Glass Bottle — 250 ml',
    slug: 'silicone-sleeve-glass-bottle-250ml',
    category_id: 'silicone-sleeve',
    description: 'Glass feeding bottle with star-pattern silicone protective sleeve. Available in multiple colours.',
    material: 'Glass + Silicone sleeve',
    capacity_ml: [250],
    colours: ['Blue', 'Green', 'Sky Blue'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg', alt: 'Silicone sleeve glass bottles 250ml pair blue and green', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM.jpeg', alt: 'Silicone sleeve glass bottle 250ml blue single', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (2).jpeg', alt: 'Silicone sleeve glass bottle 250ml sky blue', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (3).jpeg', alt: 'Silicone sleeve glass bottle 250ml blue with accessories', is_primary: false },
    ],
    notes: 'Multiple colour variants and handle/no-handle configurations visible.',
  },
  {
    id: 'prod-07',
    name: 'Silicone Sleeve Glass Bottle — 120 ml',
    slug: 'silicone-sleeve-glass-bottle-120ml',
    category_id: 'silicone-sleeve',
    description: 'Small glass feeding bottle with star-pattern silicone sleeve. Available with and without handles.',
    material: 'Glass + Silicone sleeve',
    capacity_ml: [120],
    colours: ['Mint Green', 'Red'],
    brand_label: null,
    status: 'active',
    is_featured: false,
    sort_order: 2,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.53 PM (1).jpeg', alt: 'Silicone sleeve glass bottle 120ml mint green', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM.jpeg', alt: 'Silicone sleeve glass bottle 120ml red with handles', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.55 PM (1).jpeg', alt: 'Silicone sleeve glass bottle 120ml red with handles alternate view', is_primary: false },
    ],
    notes: 'Handle and no-handle variants observed.',
  },

  // ───── Stainless Steel Feeding Bottles ─────
  {
    id: 'prod-14',
    name: 'Stainless Steel Feeding Bottle — SS 304',
    slug: 'stainless-steel-feeding-bottle-ss304',
    category_id: 'ss-bottles',
    description: 'Premium SS 304 grade stainless steel feeding bottle. Available in multiple sizes.',
    material: 'SS 304 Stainless Steel',
    capacity_ml: [150, 200, 250, 300],
    colours: ['Silver'],
    brand_label: 'YE',
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg', alt: 'Stainless steel feeding bottle SS 304 with YE logo', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (1).jpeg', alt: 'Stainless steel feeding bottle 300ml', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (2).jpeg', alt: 'Stainless steel feeding bottle 250ml', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.56 PM (3).jpeg', alt: 'Stainless steel feeding bottle 200ml', is_primary: false },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM.jpeg', alt: 'Stainless steel feeding bottle 150ml', is_primary: false },
    ],
    notes: 'YE logo clearly engraved. Product renders — high quality images. Available in 150/200/250/300 ml.',
  },

  // ───── Stainless Steel Accessories ─────
  {
    id: 'prod-15',
    name: 'Stainless Steel Lunch Box Set',
    slug: 'stainless-steel-lunch-box-set',
    category_id: 'ss-accessories',
    description: 'Stainless steel lunch box / tiffin set with teal silicone clip-lock. Available in two sizes.',
    material: 'Stainless Steel',
    capacity_ml: null,
    colours: ['Silver with Teal clips'],
    brand_label: null,
    status: 'active',
    is_featured: true,
    sort_order: 1,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg', alt: 'Stainless steel lunch box set studio shot', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (3).jpeg', alt: 'Stainless steel lunch box set with food lifestyle shot', is_primary: false },
    ],
    notes: null,
  },
  {
    id: 'prod-16',
    name: 'Stainless Steel Vacuum Sipper',
    slug: 'stainless-steel-vacuum-sipper',
    category_id: 'ss-accessories',
    description: 'Cola-shaped stainless steel vacuum insulated water bottle / sipper. Large capacity.',
    material: 'Stainless Steel',
    capacity_ml: null,
    colours: ['Silver'],
    brand_label: 'YE',
    status: 'active',
    is_featured: false,
    sort_order: 2,
    images: [
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM.jpeg', alt: 'Stainless steel vacuum sipper bottle', is_primary: true },
      { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM (1).jpeg', alt: 'Stainless steel sipper YE logo close-up', is_primary: false },
    ],
    notes: 'YE logo engraved (visible in close-up shot).',
  },
]

/**
 * Helper functions — these will be replaced by Supabase queries in Milestone C.
 */
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

export function getRelatedProducts(product, limit = 4) {
  if (!product) return []
  return getAllProducts()
    .filter(p => p.category_id === product.category_id && p.id !== product.id)
    .slice(0, limit)
}

export function searchProducts(query) {
  if (!query || !query.trim()) return getAllProducts()
  const q = query.toLowerCase().trim()
  return getAllProducts().filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.material.toLowerCase().includes(q) ||
    (p.colours && p.colours.some(c => c.toLowerCase().includes(q)))
  )
}

export function getCategoryById(id) {
  return categories.find(c => c.id === id) || null
}

export { categories, products }

