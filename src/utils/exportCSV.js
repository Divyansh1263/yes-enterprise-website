/**
 * Export an array of product objects as a downloadable CSV.
 * @param {Array<Object>} products
 * @param {string} [filename='products_export.csv']
 */
export function exportProductsCSV(products, filename = 'products_export.csv') {
  if (!products || products.length === 0) {
    alert('No products to export.')
    return
  }

  const headers = [
    'name', 'slug', 'sku', 'category', 'description', 'material',
    'capacity_ml', 'colours', 'brand', 'moq', 'price_display',
    'price_label', 'status', 'featured',
  ]

  const csvRows = [
    headers.join(','),
    ...products.map((p) =>
      headers.map((h) => {
        const val = p[h]
        if (val === null || val === undefined) return ''
        const str = Array.isArray(val) ? val.join('; ') : String(val)
        // Escape quotes and wrap in quotes if needed
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
