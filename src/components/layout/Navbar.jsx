import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import siteConfig from '../../config/site.config'
import { useLanguage } from '../../i18n'

export default function Navbar() {
  const { t, lang, switchLang, getLangPath } = useLanguage()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Shadow on scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Close lang dropdown on outside click
  useEffect(() => {
    const fn = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const navLinks = [
    { to: getLangPath('/'), label: t('nav.home'), end: true },
    { to: getLangPath('/products'), label: t('nav.products') },
    { to: getLangPath('/about'), label: t('nav.about') },
    { to: getLangPath('/contact'), label: t('nav.contact') },
  ]

  // Correct active matching for Hindi routes
  function isActive(to, end) {
    if (end) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <header className={`bg-brand-navy text-white sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-brand-navy-dark/40' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand ── */}
          <Link to={getLangPath('/')} className="flex items-center gap-2.5 shrink-0">
            <img
              src="/assets/logo.jpeg"
              alt={`${siteConfig.brandName} logo`}
              className="h-9 w-9 rounded-lg object-contain bg-white p-0.5 shrink-0"
            />
            <div className="leading-none">
              <span className="text-base font-bold tracking-wide block">{siteConfig.brandName}</span>
              <span className="text-[10px] text-white/45 tracking-widest uppercase">Baby Products</span>
            </div>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, label, end }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to, end)
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Right: Language selector + WhatsApp ── */}
          <div className="hidden md:flex items-center gap-2">

            {/* Language switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Switch language"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {lang === 'en' ? 'EN' : 'हि'}
                <svg className={`w-3.5 h-3.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              <div className={`lang-menu absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden ${langOpen ? 'open' : 'closed'}`}>
                <button
                  onClick={() => { if (lang !== 'en') { switchLang(); setLangOpen(false) } else setLangOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${lang === 'en' ? 'text-brand-navy font-semibold bg-brand-navy/5' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span className="text-base">🇬🇧</span> English
                </button>
                <button
                  onClick={() => { if (lang !== 'hi') { switchLang(); setLangOpen(false) } else setLangOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${lang === 'hi' ? 'text-brand-navy font-semibold bg-brand-navy/5' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span className="text-base">🇮🇳</span> हिन्दी
                </button>
              </div>
            </div>

            {/* WhatsApp */}
            <a
              href={siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition-colors ${!siteConfig.whatsappNumber ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <WaIcon className="w-4 h-4" />
              {t('nav.whatsapp')}
            </a>
          </div>

          {/* ── Mobile menu toggle ── */}
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            {mobileOpen
              ? <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            }
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-brand-slate">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, end }) => (
              <Link
                key={to}
                to={to}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to, end) ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            {/* Mobile language toggle */}
            <button
              onClick={switchLang}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors mt-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {lang === 'en' ? 'हिन्दी में देखें' : 'View in English'}
            </button>
            {/* Mobile WhatsApp */}
            <a
              href={siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-2.5 mt-1 bg-emerald-500 text-white font-medium rounded-lg text-sm ${!siteConfig.whatsappNumber ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <WaIcon className="w-4 h-4" /> {t('nav.whatsapp')}
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

function WaIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.494A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.306-2.65.887.886-2.648-.335-.433A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    </svg>
  )
}
