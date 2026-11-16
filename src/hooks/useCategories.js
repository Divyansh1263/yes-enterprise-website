import { useState, useEffect, useCallback } from 'react';
import { getPublicCategories } from '../services/api/categories.js';
import { isFixtureFallbackAllowed } from '../services/api/client.js';

/**
 * Custom hook to fetch public categories from Pages Functions backend.
 *
 * In production:
 * - The live API is the sole source of truth.
 * - On failure or network error, returns an error state and an empty list.
 *
 * In local development:
 * - Static fixtures are only permitted if explicitly enabled via VITE_ENABLE_FIXTURE_FALLBACK === 'true'.
 *
 * @param {Array<any>} [devFallback=[]] Optional local development-only fallback data
 */
export function useCategories(devFallback = []) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicCategories();
      // Ensure only categories with at least one active product are exposed publicly
      const activeCategories = (data || []).filter(c => (c.product_count ?? 0) > 0);
      setCategories(activeCategories);
    } catch (err) {
      const errMsg = err.message || 'Unable to connect to catalogue categories.';
      setError(errMsg);

      // Fixture fallback is strictly disabled in production builds
      if (isFixtureFallbackAllowed() && devFallback && devFallback.length > 0) {
        console.info('[useCategories] Using local dev fixture fallback (VITE_ENABLE_FIXTURE_FALLBACK=true).');
        const activeFallback = (devFallback || []).filter(c => (c.product_count ?? 0) > 0);
        setCategories(activeFallback);
      } else {
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  };
}
