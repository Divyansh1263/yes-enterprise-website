import { createContext, useContext, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { en } from './translations/en'
import { hi } from './translations/hi'

const translations = { en, hi }

export const LanguageContext = createContext(null)

/**
 * LanguageProvider — wraps the app and exposes language state.
 * Language is determined from the URL: /hi prefix → Hindi, otherwise English.
 * localStorage is used only as a preference when landing on /.
 */
export function LanguageProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const lang = location.pathname.startsWith('/hi') ? 'hi' : 'en'
  const langPrefix = lang === 'hi' ? '/hi' : ''

  // Update <html lang="…"> attribute for screen readers and Hindi typography
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // On first visit to /, honour localStorage preference
  useEffect(() => {
    if (location.pathname === '/') {
      const saved = localStorage.getItem('ye_lang')
      if (saved === 'hi') navigate('/hi', { replace: true })
    }
  }, []) // run once on mount

  /**
   * Translate a dot-separated key, e.g. t('hero.headline1')
   */
  function t(key) {
    const keys = key.split('.')
    let val = translations[lang]
    for (const k of keys) {
      if (val == null) return key
      val = val[k]
    }
    return val ?? key
  }

  /**
   * Return a path prefixed for the current language.
   * getLangPath('/products') → '/hi/products' (when lang=hi) or '/products' (en)
   */
  function getLangPath(path) {
    return langPrefix + path
  }

  /**
   * Switch to the other language, navigating to the equivalent page.
   */
  function switchLang() {
    const targetLang = lang === 'en' ? 'hi' : 'en'
    const currentPath = location.pathname + location.search

    let newPath
    if (targetLang === 'hi') {
      // / → /hi, /products → /hi/products
      newPath = currentPath === '/' ? '/hi' : '/hi' + currentPath
    } else {
      // /hi → /, /hi/products → /products
      if (currentPath === '/hi') {
        newPath = '/'
      } else if (currentPath.startsWith('/hi/')) {
        newPath = currentPath.slice(3) // remove '/hi'
      } else {
        newPath = '/'
      }
    }

    localStorage.setItem('ye_lang', targetLang)
    navigate(newPath, { replace: false })
  }

  /**
   * Build an equivalent path in the target language from a source path.
   * Used by the language switcher on specific pages.
   */
  function getEquivalentPath(path, targetLang) {
    if (targetLang === 'hi') {
      return path === '/' ? '/hi' : '/hi' + path
    } else {
      if (path === '/hi') return '/'
      if (path.startsWith('/hi/')) return path.slice(3)
      return path
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, t, getLangPath, switchLang, langPrefix, getEquivalentPath }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}

