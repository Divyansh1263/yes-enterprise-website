import { useEffect, useRef } from 'react'

/**
 * useScrollReveal — attaches an IntersectionObserver to the returned ref.
 * When the element scrolls into view it gains the 'is-visible' class,
 * which triggers the CSS transition defined in index.css (.reveal).
 *
 * Respects prefers-reduced-motion: makes the element instantly visible.
 * Uses threshold:0 so any pixel of the element entering the viewport fires.
 */
export function useScrollReveal(options = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      el.classList.add('is-visible')
      return
    }

    // Check if already in viewport on mount (e.g. above-fold content)
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.unobserve(el)
        }
      },
      {
        threshold: options.threshold ?? 0,
        rootMargin: options.rootMargin || '0px 0px -20px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
