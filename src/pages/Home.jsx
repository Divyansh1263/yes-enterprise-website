import { Link } from 'react-router-dom'
import siteConfig from '../config/site.config'
import { useLanguage } from '../i18n'
import { getFeaturedProducts, getAllCategories, getCategoryName, getProductName, getProductDescription } from '../data/products'
import { useScrollReveal } from '../hooks/useScrollReveal'
import ProductCard from '../components/ui/ProductCard'
import { buildWhatsAppContactUrl, buildWholesaleEnquiryUrl } from '../lib/whatsapp'

const featured = getFeaturedProducts()
const categories = getAllCategories()

// Hero product images — best quality available
const heroImages = [
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg', alt: 'SS 304 stainless steel feeding bottle with YE logo' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg', alt: 'Silicone sleeve feeding bottles pair' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg', alt: 'Stainless steel tiffin box set' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg', alt: 'Glass feeding bottle red cap' },
]

const uspIcons = [
  <svg key="1" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21l9-18 9 18M12 3v18" /></svg>,
  <svg key="2" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  <svg key="3" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  <svg key="4" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>,
]

// Category accent gradient map
const catAccents = {
  'glass-bottles':  { from: '#DCECF5', to: '#E8DDF7', text: '#2A4A7A' },
  'plastic-bottles':{ from: '#DCECF5', to: '#C8EDE4', text: '#1B5E45' },
  'silicone-sleeve':{ from: '#B9D9CE', to: '#C8EDE4', text: '#1B4D3E' },
  'ss-bottles':     { from: '#DCECF5', to: '#B9D9CE', text: '#1B365D' },
  'ss-accessories': { from: '#F8DFD1', to: '#F8E9B7', text: '#7C4A1A' },
}

export default function Home() {
  const { t, lang, getLangPath } = useLanguage()
  const heroRef = useScrollReveal()
  const uspRef = useScrollReveal()
  const featuredRef = useScrollReveal()
  const catRef = useScrollReveal()
  const aboutRef = useScrollReveal()
  const wholesaleRef = useScrollReveal()

  const uspKeys = ['madeInIndia', 'safeMaterials', 'directFactory', 'wholesale']

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-grad-hero min-h-[88vh] flex items-center overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #DCECF5, #E8DDF7)' }} />
          <div className="absolute top-1/2 -left-20 w-72 h-72 rounded-full opacity-8 animate-float-slow"
            style={{ background: 'radial-gradient(circle, #B9D9CE, #DCECF5)' }} />
          <div className="absolute bottom-10 right-1/4 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #E8B85B, #F8DFD1)' }} />
          {/* Grid dots */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">

            {/* Left: text */}
            <div ref={heroRef} className="reveal">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
                style={{ background: 'rgba(232,184,91,0.18)', color: '#E8B85B', border: '1px solid rgba(232,184,91,0.35)' }}>
                <span className="w-2 h-2 rounded-full bg-brand-amber animate-pulse-soft inline-block" />
                {t('hero.badge')}
              </span>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
                {t('hero.headline1')}<br />
                <span className="text-brand-amber">{t('hero.headline2')}</span>
              </h1>

              <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-xl mb-10">
                {t('hero.sub')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={getLangPath('/products')}
                  className="btn-shine inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-brand-amber text-brand-navy font-bold rounded-2xl hover:bg-yellow-400 transition-colors shadow-lg shadow-brand-amber/30"
                >
                  {t('hero.cta1')}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <a
                  href={buildWholesaleEnquiryUrl(lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 border-2 border-white/30 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {t('hero.cta2')}
                </a>
              </div>
            </div>

            {/* Right: product image grid */}
            <div className="hidden lg:grid grid-cols-2 gap-4 mt-0 hero-img-grid">
              {heroImages.map((img, i) => (
                <div
                  key={i}
                  className={`rounded-2xl overflow-hidden ${i % 2 === 1 ? 'mt-8' : ''} shadow-xl shadow-black/30`}
                  style={{ aspectRatio: '3/4' }}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── USP STRIP ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={uspRef} className="reveal grid grid-cols-2 lg:grid-cols-4 gap-6">
            {uspKeys.map((key, i) => (
              <div key={key} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-brand-ivory transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: ['#DCECF5','#C8EDE4','#F8DFD1','#E8DDF7'][i] }}>
                  <span className="text-brand-navy">{uspIcons[i]}</span>
                </div>
                <div>
                  <p className="font-bold text-brand-navy text-sm">{t(`usp.${key}`)}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t(`usp.${key}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={featuredRef} className="reveal text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
              {lang === 'hi' ? 'चुनिंदा प्रोडक्ट' : 'Featured'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-4">{t('featured.title')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('featured.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} lang={lang} />
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to={getLangPath('/products')}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-brand-navy text-white font-semibold rounded-2xl hover:bg-brand-navy-light transition-colors shadow-md"
            >
              {t('featured.viewAll')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CATEGORY CARDS ────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20" style={{ background: 'linear-gradient(180deg, #F7F5EF 0%, #ffffff 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={catRef} className="reveal text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
              {lang === 'hi' ? 'श्रेणियाँ' : 'Categories'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-4">{t('categories.title')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{t('categories.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {categories.map(cat => {
              const accent = catAccents[cat.id] || { from: '#DCECF5', to: '#E8DDF7', text: '#1B365D' }
              return (
                <Link
                  key={cat.id}
                  to={getLangPath(`/products?category=${cat.id}`)}
                  className="cat-card group relative rounded-2xl overflow-hidden shadow-card"
                  style={{ minHeight: 220 }}
                >
                  {/* Background gradient or image */}
                  {cat.heroImage ? (
                    <div className="absolute inset-0">
                      <img src={cat.heroImage} alt={getCategoryName(cat, lang)}
                        className="cat-card-img w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/40 to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }} />
                  )}

                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-5" style={{ minHeight: 220 }}>
                    <h3 className="font-bold text-white text-base leading-tight mb-1">
                      {getCategoryName(cat, lang)}
                    </h3>
                    <p className="text-white/70 text-xs">
                      {t(`categories.${cat.id}Desc`)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-brand-amber text-xs font-semibold">
                      {lang === 'hi' ? 'देखें' : 'View'}
                      <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── ABOUT STRIP ───────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div ref={aboutRef} className="reveal">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
                {t('about.sectionBadge')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-6">
                {t('about.title')}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>{t('about.p1')}</p>
                <p>{t('about.p2')}</p>
              </div>
              <ul className="mt-6 space-y-2.5">
                {Array.isArray(t('about.reasons')) && t('about.reasons').map((r, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/40 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  to={getLangPath('/about')}
                  className="inline-flex items-center gap-2 text-brand-navy font-semibold hover:gap-3 transition-all"
                >
                  {t('about.learnMore')}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* YE logo panel with colourful gradient */}
            <div className="mt-12 lg:mt-0 relative">
              <div className="rounded-3xl overflow-hidden p-10 flex flex-col items-center justify-center text-center min-h-[320px]"
                style={{ background: 'linear-gradient(135deg, #1B365D 0%, #2A4A7A 50%, #263449 100%)' }}>
                {/* Decorative blobs inside */}
                <div className="absolute top-4 right-4 w-24 h-24 rounded-full opacity-15"
                  style={{ background: 'radial-gradient(circle, #E8B85B, transparent)' }} />
                <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, #DCECF5, transparent)' }} />
                <img src="/assets/logo.jpeg" alt="YE logo"
                  className="h-20 w-20 rounded-xl object-contain bg-white/10 p-2 mb-5 relative z-10"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
                <p className="text-white font-bold text-2xl mb-1 relative z-10">YE</p>
                <p className="text-white/60 text-sm mb-4 relative z-10">
                  {lang === 'hi' ? 'भारतीय निर्माता और थोक सप्लायर' : 'Indian Manufacturer & Wholesale Supplier'}
                </p>
                <div className="flex items-center gap-2 text-xs text-brand-amber font-semibold relative z-10">
                  <span className="w-8 h-px bg-brand-amber/60 inline-block" />
                  {lang === 'hi' ? 'भारत में निर्मित' : 'Made in India'}
                  <span className="w-8 h-px bg-brand-amber/60 inline-block" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHOLESALE CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 relative overflow-hidden" ref={wholesaleRef}
        style={{ background: 'linear-gradient(135deg, #E8DDF7 0%, #DCECF5 50%, #C8EDE4 100%)' }}>
        {/* Decorative shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1B365D, transparent)' }} />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #263449, transparent)' }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="reveal">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-navy/60 mb-3 block">
              {lang === 'hi' ? 'थोक सप्लाई' : 'Wholesale Supply'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-5">
              {t('wholesale.title')}
            </h2>
            <p className="text-brand-navy/70 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('wholesale.sub')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={buildWholesaleEnquiryUrl(lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-shine inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-brand-navy text-white font-bold rounded-2xl hover:bg-brand-navy-light transition-colors shadow-lg shadow-brand-navy/25"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t('wholesale.cta1')}
              </a>
              <Link
                to={getLangPath('/contact')}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-brand-navy text-brand-navy font-bold rounded-2xl hover:bg-brand-navy hover:text-white transition-colors"
              >
                {t('wholesale.cta2')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT STRIP ─────────────────────────────────────────────────── */}
      <section className="py-10 bg-brand-ivory border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-bold text-brand-navy text-lg">
                {lang === 'hi' ? 'सीधे संपर्क करें' : 'Contact us directly'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {lang === 'hi' ? 'थोक रेट और ऑर्डर के लिए' : 'For wholesale pricing and order enquiries'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <a
                href={siteConfig.ownerPhoneTel}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:bg-brand-navy-light transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {siteConfig.ownerPhoneDisplay}
              </a>
              <a
                href={buildWhatsAppContactUrl(lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-[#20b857] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
