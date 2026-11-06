import { useState, useEffect, useCallback } from 'react';
import { getPublicProducts } from '../services/api/products.js';
import { isFixtureFallbackAllowed } from '../services/api/client.js';

/**
 * Custom hook to fetch public products from Pages Functions backend.
 *
 * In production:
 * - The live API is the sole source of truth.
 * - On failure or network error, returns an error state and an empty list.
 * - Stale fixture product prices and stock quantities are NEVER displayed in production.
 *
 * In local development:
 * - Static fixtures are only permitted if explicitly enabled via VITE_ENABLE_FIXTURE_FALLBACK === 'true'.
 *
 * @param {{ category?: string, search?: string, featured?: boolean, limit?: number, offset?: number }} [params]
 * @param {Array<any>} [devFallback=[]] Optional local development-only fallback data
 */
export function useProducts(params = {}, devFallback = []) {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categoryParam = params.category;
  const searchParam = params.search;
  const featuredParam = params.featured;
  const limitParam = params.limit;
  const offsetParam = params.offset;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublicProducts({
        category: categoryParam,
        search: searchParam,
        featured: featuredParam,
        limit: limitParam,
        offset: offsetParam
      });

      if (res && res.data) {
        setProducts(res.data);
        setTotal(res.pagination?.total ?? res.data.length);
      } else {
        setProducts([]);
        setTotal(0);
      }
    } catch (err) {
      const errMsg = err.message || 'Unable to connect to catalogue database.';
      setError(errMsg);

      // Fixture fallback is strictly disabled in production builds
      if (isFixtureFallbackAllowed() && devFallback && devFallback.length > 0) {
        console.info('[useProducts] Using local dev fixture fallback (VITE_ENABLE_FIXTURE_FALLBACK=true).');
        setProducts(devFallback);
        setTotal(devFallback.length);
      } else {
        setProducts([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryParam, searchParam, featuredParam, limitParam, offsetParam]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    total,
    loading,
    error,
    refetch: fetchProducts
  };
}
