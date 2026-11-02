import { Link } from 'react-router-dom'
import siteConfig from '../config/site.config'
import { useLanguage } from '../i18n'
import { getFeaturedProducts, getAllCategories, getCategoryName } from '../data/products'
import { useScrollReveal } from '../hooks/useScrollReveal'
import ProductCard from '../components/ui/ProductCard'
import WhatsAppButton from '../components/ui/WhatsAppButton'
import SectionHeading from '../components/ui/SectionHeading'

const featured = getFeaturedProducts()
const categories = getAllCategories()

// Hero product images — best-quality renders shown on right side
const heroImages = [
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg', alt: 'Stainless steel feeding bottle with YE logo' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg', alt: 'Silicone sleeve glass bottles pair' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg', alt: 'Stainless steel lunch box set' },
  { src: '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg', alt: 'Glass feeding bottle red' },
]

export default function Home() {
  const { t, lang, getLangPath } = useLanguage()
  const featRef = useScrollReveal()
  const catRef = useScrollReveal()
  const aboutRef = useScrollReveal()
  const wholeRef = useScrollReveal()

  return (
    <div>

      {/* ────────────────────── HERO ────────────────────── */}
      <section className="relative bg-brand-navy overflow-hidden">
        {/* Subtle background rings */}
        <div aria-hidden className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full border-[60px] border-white/[0.03]" />
          <div className="absolute -bottom-32 -left-32 w-[560px] h-[560px] rounded-full border-[70px] border-white/[0.03]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border-[1px] border-white/[0.04]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left — Text */}
            <div>
              <span className="inline-flex items-center gap-2 bg-brand-amber/15 border border-brand-amber/25 text-brand-amber text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                <span className="w-1.5 h-1.5 bg-brand-amber rounded-full" />
                {t('hero.badge')}
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                {t('hero.headline1')}{' '}
                <span className="text-brand-amber">{t('hero.headline2')}</span>
              </h1>

              <p className="text-white/65 text-base leading-relaxed mb-8 max-w-lg">
                {t('hero.sub')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={getLangPath('/products')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-navy font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-md shadow-black/15"
                >
                  {t('hero.cta1')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <WhatsAppButton variant="outline-white" size="md">
                  {t('hero.cta2')}
                </WhatsAppButton>
              </div>
            </div>

            {/* Right — Product image grid */}
            <div className="hero-img-grid hidden lg:grid grid-cols-2 gap-3">
              {heroImages.map((img, i) => (
                <div
                  key={i}
                  className={`rounded-2xl overflow-hidden bg-brand-soft-blue/10 border border-white/10 ${i % 2 === 1 ? 'mt-6' : ''}`}
                  style={{ aspectRatio: '4/5' }}
                >
                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover" loading={i > 1 ? 'lazy' : 'eager'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────── USP STRIP ────────────────────── */}
      <section className="bg-brand-ivory border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <GlobeIcon />, title: t('usp.madeInIndia'), desc: t('usp.madeInIndiaDesc') },
              { icon: <ShieldIcon />, title: t('usp.safeMaterials'), desc: t('usp.safeMaterialsDesc') },
              { icon: <FactoryIcon />, title: t('usp.directFactory'), desc: t('usp.directFactoryDesc') },
              { icon: <BoxIcon />, title: t('usp.wholesale'), desc: t('usp.wholesaleDesc') },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-navy/8 rounded-xl flex items-center justify-center text-brand-navy shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────── FEATURED PRODUCTS ────────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div ref={featRef} className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title={t('featured.title')}
            subtitle={t('featured.subtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="text-center mt-10">
            <Link
              to={getLangPath('/products')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors"
            >
              {t('featured.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────── CATEGORIES ────────────────────── */}
      <section className="py-16 md:py-20 bg-brand-ivory">
        <div ref={catRef} className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title={t('categories.title')}
            subtitle={t('categories.subtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`${getLangPath('/products')}?category=${cat.id}`}
                className="cat-card group relative rounded-2xl overflow-hidden bg-brand-navy border border-brand-navy-light"
                style={{ aspectRatio: '3/2' }}
              >
                {cat.heroImage && (
                  <img
                    src={cat.heroImage}
                    alt={getCategoryName(cat, lang)}
                    className="cat-card-img absolute inset-0 w-full h-full object-cover opacity-50"
                    loading="lazy"
                  />
                )}
                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-dark/90 via-brand-navy/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white font-bold text-base group-hover:text-brand-amber transition-colors">
                    {getCategoryName(cat, lang)}
                  </h3>
                  <p className="text-white/55 text-xs mt-0.5">
                    {lang === 'hi' ? cat.description_hi : cat.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────── ABOUT / WHY CHOOSE US ────────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div ref={aboutRef} className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left */}
            <div>
              <p className="text-brand-amber font-semibold text-xs tracking-widest uppercase mb-3">
                {t('about.sectionBadge')}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-5 leading-snug">
                {t('about.title')}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-sm sm:text-base mb-6">
                <p>{t('about.p1')}</p>
                <p>{t('about.p2')}</p>
              </div>
              <Link
                to={getLangPath('/about')}
                className="inline-flex items-center gap-1.5 text-brand-navy font-semibold text-sm hover:text-brand-navy-light transition-colors"
              >
                {t('about.learnMore')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right — Why choose us */}
            <div className="bg-brand-ivory rounded-2xl p-7 border border-gray-200/60">
              <h3 className="font-bold text-brand-navy mb-5 text-base">{t('about.whyTitle')}</h3>
              <ul className="space-y-3.5">
                {t('about.reasons').map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <CheckIcon />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────── WHOLESALE CTA ────────────────────── */}
      <section className="py-16 md:py-20 bg-brand-navy">
        <div ref={wholeRef} className="reveal max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {t('wholesale.title')}
          </h2>
          <p className="text-white/60 mb-8 leading-relaxed max-w-lg mx-auto">
            {t('wholesale.sub')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <WhatsAppButton size="lg">{t('wholesale.cta1')}</WhatsAppButton>
            <Link
              to={getLangPath('/contact')}
              className="inline-flex items-center justify-center px-7 py-3.5 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              {t('wholesale.cta2')}
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────── CONTACT STRIP ────────────────────── */}
      <section className="py-12 bg-brand-ivory border-t border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: <PhoneIcon />, label: t('contact.phone'), val: siteConfig.phone },
              { icon: <MailIcon />, label: t('contact.email'), val: siteConfig.email },
              { icon: <PinIcon />, label: t('contact.location'), val: siteConfig.address },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-brand-navy/8 rounded-xl flex items-center justify-center text-brand-navy">
                  {item.icon}
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-sm text-gray-700">
                  {item.val || <span className="text-gray-400 italic">{t('contact.pending')}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Inline SVG icons ──
const iconCls = 'w-5 h-5'
function ArrowRight({ className }) { return <svg className={className || iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg> }
function GlobeIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function ShieldIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> }
function FactoryIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> }
function BoxIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> }
function CheckIcon() { return <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> }
function PhoneIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> }
function MailIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }
function PinIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
