import { Link } from 'react-router-dom';
import siteConfig from '../config/site.config';
import { useLanguage } from '../i18n';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { buildWhatsAppContactUrl, buildWholesaleEnquiryUrl } from '../lib/whatsapp';
import {
  getFeaturedProducts,
  getAllCategories,
  getCategoryName,
} from '../data/products';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import ProductCard from '../components/ui/ProductCard';
import { getR2ImageUrl } from '../services/api/uploads.js';

import LoadingSpinner from '../components/ui/LoadingSpinner';

const fallbackFeatured = getFeaturedProducts();
const fallbackCategories = getAllCategories();

const heroImages = [
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg', alt: 'SS 304 stainless steel feeding bottle with YE logo' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg', alt: 'Silicone sleeve feeding bottles pair' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg', alt: 'Stainless steel tiffin box set' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg',     alt: 'Glass feeding bottle red cap' },
];

const catAccents = {
  'glass-bottles':   { from: '#D8E9F4', to: '#E8DDF7', label: '#1B3D6E' },
  'plastic-bottles': { from: '#D8E9F4', to: '#BDE5D8', label: '#1B4A36' },
  'silicone-sleeve': { from: '#B9D9CE', to: '#BDE5D8', label: '#1B4D3E' },
  'ss-bottles':      { from: '#D8E9F4', to: '#B9D9CE', label: '#19345A' },
  'ss-sippers':      { from: '#D8E9F4', to: '#E8DDF7', label: '#1B3D6E' },
  'ss-tiffin':       { from: '#F8DFD1', to: '#F8E9B7', label: '#7C4A1A' },
};

const USP_ITEMS = [
  {
    key: 'madeInIndia',
    color: '#D8E9F4',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 21l9-18 9 18M12 3v18" />
      </svg>
    ),
  },
  {
    key: 'safeMaterials',
    color: '#BDE5D8',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: 'directFactory',
    color: '#F8DFD1',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    key: 'wholesale',
    color: '#E8DDF7',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    ),
  },
];

export default function Home() {
  const { t, lang, getLangPath } = useLanguage();

  const heroRef      = useScrollReveal();
  const uspRef       = useScrollReveal();
  const featuredRef  = useScrollReveal();
  const catRef       = useScrollReveal();
  const aboutRef     = useScrollReveal();
  const wholesaleRef = useScrollReveal();

  // Load live data
  const {
    categories,
    loading: loadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useCategories(fallbackCategories);

  const {
    products: featuredProducts,
    loading: loadingProducts,
    error: productsError,
    refetch: refetchProducts
  } = useProducts({ featured: true, limit: 4 }, fallbackFeatured);

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-grad-hero min-h-[92vh] lg:min-h-screen flex items-center overflow-hidden">

        {/* Decorative — corners only */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #E9B956, transparent 70%)' }} />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #D8E9F4, transparent 70%)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 items-center">

            {/* Left: text */}
            <div ref={heroRef} className="reveal">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-7"
                style={{ background: 'rgba(233,185,86,0.15)', color: '#E9B956', border: '1px solid rgba(233,185,86,0.30)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse-soft inline-block" />
                {t('hero.badge')}
              </span>

              <h1 className="text-4xl sm:text-5xl xl:text-[3.6rem] 2xl:text-6xl font-bold text-white leading-[1.12] mb-6">
                {t('hero.headline1')}<br />
                <span className="text-brand-amber">{t('hero.headline2')}</span>
              </h1>

              <p className="text-white/65 text-base sm:text-lg leading-relaxed max-w-[30rem] mb-10">
                {t('hero.sub')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={getLangPath('/products')}
                  className="btn-shine inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-brand-amber text-brand-navy font-bold rounded-2xl hover:bg-yellow-400 transition-colors shadow-lg shadow-brand-amber/30 text-[15px]"
                >
                  {t('hero.cta1')}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <a
                  href={buildWholesaleEnquiryUrl(lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 border-2 border-white/25 text-white font-bold rounded-2xl hover:bg-white/10 hover:border-white/40 transition-all text-[15px]"
                >
                  <WaIconSm />
                  {t('hero.cta2')}
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                {[
                  lang === 'hi' ? 'भारत में निर्मित' : 'Made in India',
                  lang === 'hi' ? 'थोक सप्लाई' : 'Wholesale Supply',
                  lang === 'hi' ? 'फ़ैक्ट्री सीधा' : 'Direct Factory',
                ].map(txt => (
                  <span key={txt} className="inline-flex items-center gap-1.5 text-xs text-white/55 font-medium">
                    <span className="w-1 h-1 rounded-full bg-brand-amber/70 inline-block" />
                    {txt}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: product image collage */}
            <div className="hidden lg:grid grid-cols-2 gap-4 hero-img-grid mt-0">
              {heroImages.map((img, i) => (
                <div
                  key={i}
                  className={`rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ${i % 2 === 1 ? 'mt-10' : ''}`}
                  style={{ aspectRatio: '3/4' }}
                >
                  <img src={getR2ImageUrl(img.src)} alt={img.alt} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave bottom edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 56L1440 56L1440 18C1200 56 960 0 720 18C480 36 240 0 0 18L0 56Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── USP STRIP ────────────────────────────────────────────────────────── */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={uspRef} className="reveal grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {USP_ITEMS.map(({ key, color, icon }) => (
              <div key={key} className="flex items-start gap-4 p-4 lg:p-5 rounded-2xl hover:bg-brand-ivory transition-colors">
                <div className="usp-icon-wrap shrink-0" style={{ background: color }}>
                  <span className="text-brand-navy">{icon}</span>
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

      {/* ── FEATURED PRODUCTS ─────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={featuredRef} className="reveal text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
              {lang === 'hi' ? 'चुनिंदा प्रोडक्ट' : 'Featured'}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-brand-navy mb-4">
              {t('featured.title')}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
              {t('featured.subtitle')}
            </p>
          </div>

          {loadingProducts && featuredProducts.length === 0 ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner message={lang === 'hi' ? 'चुनिंदा उत्पाद लोड हो रहे हैं...' : 'Loading featured products...'} size="md" />
            </div>
          ) : productsError && featuredProducts.length === 0 ? (
            <div className="max-w-md mx-auto my-6 p-6 bg-red-50/60 border border-red-200 rounded-2xl text-center space-y-3">
              <p className="text-sm font-bold text-brand-navy">
                {lang === 'hi' ? 'उत्पाद डेटा लोड नहीं हो सका' : 'Unable to load featured products'}
              </p>
              <p className="text-xs text-gray-500">
                {lang === 'hi'
                  ? 'लाइव इन्वेंटरी सेवा अनुपलब्ध है। वास्तविक समय की कीमतें प्रदर्शित नहीं की जा सकतीं।'
                  : 'Live inventory service is temporarily unavailable.'}
              </p>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={refetchProducts}
                  className="px-4 py-2 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy-light"
                >
                  🔄 {lang === 'hi' ? 'पुनः प्रयास' : 'Retry'}
                </button>
                <a
                  href={buildWholesaleEnquiryUrl(lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#25D366] text-white text-xs font-bold rounded-xl hover:bg-[#20b857]"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} lang={lang} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to={getLangPath('/products')}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-brand-navy text-white font-semibold rounded-2xl hover:bg-brand-navy-light transition-colors shadow-md text-[15px]"
            >
              {t('featured.viewAll')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CATEGORIES ────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24" style={{ background: 'linear-gradient(180deg, #F7F5EF 0%, #ffffff 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={catRef} className="reveal text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
              {lang === 'hi' ? 'श्रेणियाँ' : 'Categories'}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-brand-navy mb-4">
              {t('categories.title')}
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
              {t('categories.subtitle')}
            </p>
          </div>

          {loadingCategories && categories.length === 0 ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner message={lang === 'hi' ? 'श्रेणियाँ लोड हो रही हैं...' : 'Loading categories...'} size="md" />
            </div>
          ) : categoriesError && categories.length === 0 ? (
            <div className="max-w-md mx-auto my-6 p-6 bg-red-50/60 border border-red-200 rounded-2xl text-center space-y-3">
              <p className="text-sm font-bold text-brand-navy">
                {lang === 'hi' ? 'श्रेणियाँ लोड नहीं हो सकीं' : 'Unable to load categories'}
              </p>
              <button
                type="button"
                onClick={refetchCategories}
                className="px-4 py-2 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy-light"
              >
                🔄 {lang === 'hi' ? 'पुनः प्रयास' : 'Retry'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {categories.map(cat => {
                const catKey = cat.slug || cat.id;
                const accent = catAccents[catKey] || { from: '#D8E9F4', to: '#E8DDF7', label: '#19345A' };
                const catName = getCategoryName(cat, lang);
                return (
                  <Link
                    key={cat.id}
                    to={getLangPath(`/products?category=${cat.slug || cat.id}`)}
                    className="cat-card group relative rounded-2xl overflow-hidden shadow-card"
                    style={{ minHeight: 240 }}
                  >
                    {cat.heroImage ? (
                      <div className="absolute inset-0">
                        <img src={getR2ImageUrl(cat.heroImage)} alt={catName} className="cat-card-img w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/92 via-brand-navy/45 to-transparent" />
                      </div>
                    ) : (
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }} />
                    )}
                    <div className="relative h-full flex flex-col justify-end p-5" style={{ minHeight: 240 }}>
                      <h3 className="font-bold text-white text-base leading-tight mb-1.5">{catName}</h3>
                      <p className="text-white/65 text-xs leading-relaxed line-clamp-2">
                        {cat.description || t(`categories.${cat.id}Desc`)}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-brand-amber text-xs font-semibold">
                        {lang === 'hi' ? 'देखें' : 'Explore'}
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── ABOUT / MANUFACTURER STRIP ───────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div ref={aboutRef} className="reveal">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
                {t('about.sectionBadge')}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.4rem] font-bold text-brand-navy mb-6">
                {t('about.title')}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-base">
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
                  className="inline-flex items-center gap-2 text-brand-navy font-semibold hover:gap-3 transition-all text-sm"
                >
                  {t('about.learnMore')}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Owner card */}
            <div className="mt-12 lg:mt-0">
              <div className="rounded-3xl overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, #19345A 0%, #263449 60%, #142A48 100%)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, #E9B956, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                <div className="relative p-8 lg:p-10 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-7">
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="h-28 w-28 lg:h-32 lg:w-32 rounded-2xl overflow-hidden bg-brand-navy-light shadow-lg ring-2 ring-brand-amber/30">
                      <img
                        src="/assets/owner%20photo.jpeg"
                        alt="Uvais Ali — Partner, YES ENTERPRISES"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  </div>
                  <div className="text-center sm:text-left lg:text-center xl:text-left">
                    <div className="flex items-center gap-2 mb-0.5 justify-center sm:justify-start lg:justify-center xl:justify-start">
                      <p className="text-white font-bold text-xl">Uvais Ali</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-amber/20 text-brand-amber font-semibold">
                        {lang === 'hi' ? 'पार्टनर' : 'Partner'}
                      </span>
                    </div>
                    <p className="text-brand-amber font-medium text-xs tracking-wide uppercase mb-1">
                      {siteConfig.companyName}
                    </p>
                    <p className="text-white/60 text-xs mb-4 max-w-sm">
                      {lang === 'hi' ? 'फीडिंग बोतलें, पानी की बोतलें और स्टेनलेस स्टील प्रोडक्ट्स' : 'Feeding bottles, water bottles and stainless-steel products'}
                    </p>
                    <div className="flex flex-col gap-2.5">
                      <a href={siteConfig.ownerPhoneTel}
                        className="inline-flex items-center gap-2 text-white/80 text-sm hover:text-white transition-colors">
                        <svg className="w-4 h-4 text-brand-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {siteConfig.ownerPhoneDisplay}
                      </a>
                      <a href={buildWhatsAppContactUrl(lang)} target="_blank" rel="noopener noreferrer"
                        className="btn-shine inline-flex items-center gap-2 px-4 py-2 bg-brand-amber text-brand-navy text-sm font-bold rounded-xl hover:bg-yellow-400 transition-colors w-fit">
                        <WaIconSm />
                        {lang === 'hi' ? 'WhatsApp पर संपर्क करें' : 'WhatsApp Enquiry'}
                      </a>
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-xs text-brand-amber font-semibold justify-center sm:justify-start lg:justify-center xl:justify-start">
                      <span className="w-6 h-px bg-brand-amber/60 inline-block" />
                      {lang === 'hi' ? 'भारत में निर्मित' : 'Made in India'}
                      <span className="w-6 h-px bg-brand-amber/60 inline-block" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHOLESALE CTA ────────────────────────────────────────────────────── */}
      <section
        className="py-16 md:py-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #19345A 0%, #142A48 50%, #263449 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #E9B956, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #D8E9F4, transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-amber/60 to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div ref={wholesaleRef} className="reveal">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber/80 mb-4 block">
              {lang === 'hi' ? 'थोक सप्लाई' : 'Wholesale Supply'}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              {t('wholesale.title')}
            </h2>
            <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('wholesale.sub')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={buildWholesaleEnquiryUrl(lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-shine inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-brand-amber text-brand-navy font-bold rounded-2xl hover:bg-yellow-400 transition-colors shadow-lg shadow-brand-amber/20 text-[15px]"
              >
                <WaIconSm />
                {t('wholesale.cta1')}
              </a>
              <Link
                to={getLangPath('/contact')}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/20 text-white font-bold rounded-2xl hover:bg-white/10 hover:border-white/35 transition-all text-[15px]"
              >
                {t('wholesale.cta2')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT STRIP ────────────────────────────────────────────────────── */}
      <section className="py-8 bg-brand-ivory border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <p className="font-bold text-brand-navy text-base">
                {lang === 'hi' ? 'सीधे संपर्क करें' : 'Contact us directly'}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {lang === 'hi' ? 'थोक रेट और ऑर्डर के लिए' : 'For wholesale pricing and order enquiries'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <a href={siteConfig.ownerPhoneTel}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:bg-brand-navy-light transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {siteConfig.ownerPhoneDisplay}
              </a>
              <a href={buildWhatsAppContactUrl(lang)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-[#20b857] transition-colors">
                <WaIconSm />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function WaIconSm() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.494A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.306-2.65.887.886-2.648-.335-.433A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    </svg>
  );
}
