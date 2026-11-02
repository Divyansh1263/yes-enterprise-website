/**
 * Products hook — will be implemented at Milestone C.
 * Will query Supabase for products with status/category filtering.
 */
export function useProducts() {
  return {
    products: [],
    loading: false,
    error: null,
  }
}

