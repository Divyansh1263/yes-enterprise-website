import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop — scrolls window to (0,0) on every route change.
 * Place this inside BrowserRouter but outside your route tree.
 * Anchor links (#section) are excluded — they let the browser handle their own scroll.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Only scroll to top if there is no hash anchor in the URL
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname])

  return null
}

