import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import siteConfig from '../../config/site.config'
import { useLanguage } from '../../i18n'

export default function Navbar() {
  const { t, lang, switchLang, getLangPath } = useLanguage()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [isRevealedNav, setIsRevealedNav] = useState(false)
  const langRef = useRef(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Scroll direction detection: hide on scroll-down, reveal direct-navigation on scroll-up
  useEffect(() => {
    const threshold = 6

    const updateScroll = () => {
      const currentScrollY = window.scrollY
      const prevScrollY = lastScrollY.current
      const delta = currentScrollY - prevScrollY

      setScrolled(currentScrollY > 8)

      if (Math.abs(delta) < threshold && currentScrollY > 30) {
        ticking.current = false
        return
      }

      if (currentScrollY <= 30) {
        // At or near page top: show standard branded header
        setHeaderVisible(true)
        setIsRevealedNav(false)
      } else if (delta > 0 && currentScrollY > 70) {
        // Scrolling downwards: compact/hide to save screen space
        if (!mobileOpen) {
          setHeaderVisible(false)
          setIsRevealedNav(false)
        }
      } else if (delta < 0) {
        // Scrolling upwards: automatically reveal compact sticky navigation with direct page links
        setHeaderVisible(true)
        setIsRevealedNav(true)
      }

      lastScrollY.current = currentScrollY
      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScroll)
        ticking.current = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [mobileOpen])

  // Close lang dropdown on outside click
  useEffect(() => {
    const fn = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const navLinks = [
    { to: getLangPath('/'),         label: t('nav.home'),     end: true },
    { to: getLangPath('/products'), label: t('nav.products') },
    { to: getLangPath('/about'),    label: t('nav.about') },
    { to: getLangPath('/contact'),  label: t('nav.contact') },
  ]

  // Correct active matching for Hindi routes
  function isActive(to, end) {
    if (end) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <header
      className={`bg-brand-navy text-white sticky top-0 z-50 transition-transform duration-300 ease-in-out ${
        headerVisible ? 'translate-y-0' : '-translate-y-full'
      } ${
        scrolled ? 'shadow-xl shadow-brand-navy-dark/50 border-b border-white/5' : ''
      }`}
    >
      {/* Top gold accent line */}
      <div className="h-0.5 bg-gradient-to-r from-brand-amber via-yellow-300 to-brand-amber opacity-80" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Mobile Revealed Direct Navigation Header (shown when scrolling upwards) ── */}
        {isRevealedNav ? (
          <div className="lg:hidden flex items-center justify-between h-[54px] gap-1 sm:gap-2">
            {/* Small Brand Logo Icon */}
            <Link
              to={getLangPath('/')}
              onClick={() => setMobileOpen(false)}
              className="shrink-0 flex items-center p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Home"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 shadow-sm ring-1 ring-white/20">
                <img
                  src={siteConfig.logoPath || '/assets/logo.jpeg'}
                  alt="YE"
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>

            {/* Direct Page Navigation Links: Home, Products, About, Contact */}
            <nav className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-center min-w-0" aria-label="Direct mobile navigation">
              {navLinks.map(({ to, label, end }) => {
                const active = isActive(to, end)
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`px-2 sm:px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center transition-all truncate ${
                      active
                        ? 'bg-white/20 text-brand-amber shadow-sm font-bold border border-white/20'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>

            {/* Hamburger Button for Full Drawer (Language, WhatsApp, etc.) */}
            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              className="shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          /* ── Standard Branded Header (at top of page) ── */
          <div className="flex items-center justify-between h-[60px] sm:h-[72px]">
            {/* Brand */}
            <Link
              to={getLangPath('/')}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 sm:gap-3 shrink-0 group py-1"
            >
              <div className="relative shrink-0 w-9 h-8 sm:w-11 sm:h-10">
                <img
                  src={siteConfig.logoPath || '/assets/logo.jpeg'}
                  alt="YES ENTERPRISES"
                  className="w-full h-full rounded-lg sm:rounded-xl object-contain bg-white p-0.5 shadow-md ring-1 ring-white/20 transition-transform group-hover:scale-105"
                />
              </div>
              <div className="leading-tight">
                <span className="text-[14px] sm:text-[17px] font-bold tracking-wide block text-white">
                  {siteConfig.companyName}
                </span>
                <span className="text-[8.5px] sm:text-[10px] text-brand-amber tracking-wider uppercase font-semibold block">
                  Manufacturers &amp; Suppliers
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ to, label, end }) => {
                const active = isActive(to, end)
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'nav-link-active bg-white/12 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>

            {/* Right: Language selector + WhatsApp (Desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Language switcher pill */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all"
                  aria-label="Switch language"
                >
                  <span className="text-base leading-none">{lang === 'en' ? '🇬🇧' : '🇮🇳'}</span>
                  <span className="tracking-wide">{lang === 'en' ? 'EN' : 'हि'}</span>
                  <svg className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                <div className={`lang-menu absolute right-0 top-full mt-2 w-38 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden ${langOpen ? 'open' : 'closed'}`}>
                  <button
                    onClick={() => { if (lang !== 'en') { switchLang(); setLangOpen(false) } else setLangOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${lang === 'en' ? 'text-brand-navy font-semibold bg-brand-soft-blue/30' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="text-base">🇬🇧</span>
                    <span>English</span>
                    {lang === 'en' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-amber" />}
                  </button>
                  <button
                    onClick={() => { if (lang !== 'hi') { switchLang(); setLangOpen(false) } else setLangOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${lang === 'hi' ? 'text-brand-navy font-semibold bg-brand-soft-blue/30' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="text-base">🇮🇳</span>
                    <span>हिन्दी</span>
                    {lang === 'hi' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-amber" />}
                  </button>
                </div>
              </div>

              {/* WhatsApp CTA — gold-accented */}
              <a
                href={siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-shine inline-flex items-center gap-2 px-4 py-2 bg-brand-amber text-brand-navy text-sm font-bold rounded-xl hover:bg-yellow-400 transition-colors shadow-md shadow-brand-amber/25 ${!siteConfig.whatsappNumber ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <WaIcon className="w-4 h-4" />
                <span className="hidden lg:inline">{t('nav.whatsapp')}</span>
                <span className="lg:hidden">WhatsApp</span>
              </a>
            </div>

            {/* Mobile menu toggle button */}
            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
            >
              {mobileOpen
                ? <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile menu Drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-brand-slate shadow-2xl animate-fadeIn">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, end }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive(to, end) ? 'bg-white/15 text-white font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            {/* Mobile language toggle */}
            <button
              onClick={() => { switchLang(); setMobileOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3.5 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors mt-1"
            >
              <span className="text-base">{lang === 'en' ? '🇮🇳' : '🇬🇧'}</span>
              {lang === 'en' ? 'हिन्दी में देखें' : 'View in English'}
            </button>
            {/* Mobile WhatsApp */}
            <a
              href={siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-center gap-2 px-4 py-3 mt-2 bg-brand-amber text-brand-navy font-bold rounded-xl text-sm shadow-md transition-colors ${!siteConfig.whatsappNumber ? 'opacity-50 pointer-events-none' : ''}`}
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
