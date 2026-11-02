import { Link } from 'react-router-dom'
import siteConfig from '../config/site.config'
import { useLanguage } from '../i18n'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { buildWhatsAppContactUrl } from '../lib/whatsapp'

export default function About() {
  const { t, lang, getLangPath } = useLanguage()
  const headRef = useScrollReveal()
  const whoRef = useScrollReveal()
  const whyRef = useScrollReveal()
  const rangeRef = useScrollReveal()
  const ownerRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  const whyCards = t('aboutPage.whyCards')
  const rangeItems = t('aboutPage.rangeItems')

  const whyIcons = [
    <svg key={0} className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21l9-18 9 18M12 3v18" /></svg>,
    <svg key={1} className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    <svg key={2} className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    <svg key={3} className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
    <svg key={4} className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>,
    <svg key={5} className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  ]
  const cardBgs = ['#DCECF5','#C8EDE4','#F8DFD1','#E8DDF7','#B9D9CE','#F8E9B7']

  return (
    <div className="min-h-screen bg-white">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B365D 0%, #263449 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E8DDF7, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #DCECF5, transparent)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 relative">
          <div ref={headRef} className="reveal max-w-2xl">
            <span className="inline-block text-xs font-bold text-brand-amber uppercase tracking-widest mb-4">
              {t('about.sectionBadge')}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('aboutPage.pageTitle')}
            </h1>
            <p className="text-white/65 text-base sm:text-lg leading-relaxed">
              {t('aboutPage.pageSub')}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 40L1440 40L1440 10C1200 40 960 0 720 15C480 30 240 0 0 15L0 40Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* ── Who we are ─────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={whoRef} className="reveal lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-5">{t('aboutPage.whoWeAre')}</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>{t('aboutPage.p1')}</p>
                <p>{t('aboutPage.p2')}</p>
              </div>
              <div className="mt-5 p-4 bg-brand-amber/10 border border-brand-amber/30 rounded-xl">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">{t('detail.note')}: </span>{t('aboutPage.provisional')}
                </p>
              </div>
              <div className="mt-4 p-4 rounded-xl" style={{ background: '#DCECF5' }}>
                <p className="text-sm text-brand-navy/80">
                  <span className="font-semibold">Moon Baby — </span>{t('aboutPage.subBrandNote')}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to={getLangPath('/products')}
                  className="btn-shine inline-flex items-center gap-2 px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors">
                  {t('aboutPage.viewCatalogue')}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to={getLangPath('/contact')}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-brand-navy text-brand-navy font-semibold rounded-xl hover:bg-brand-navy hover:text-white transition-colors">
                  {t('aboutPage.contactUs')}
                </Link>
              </div>
            </div>

            {/* Stats panel */}
            <div className="mt-12 lg:mt-0 grid grid-cols-2 gap-4">
              {[
                { num: '14+', label: lang === 'hi' ? 'अलग-अलग प्रोडक्ट' : 'Distinct Products', bg: '#DCECF5' },
                { num: '5', label: lang === 'hi' ? 'प्रोडक्ट श्रेणियाँ' : 'Product Categories', bg: '#C8EDE4' },
                { num: '60–300ml', label: lang === 'hi' ? 'क्षमता रेंज' : 'Capacity Range', bg: '#E8DDF7' },
                { num: '100%', label: lang === 'hi' ? 'भारत में निर्मित' : 'Made in India', bg: '#F8E9B7' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-6 text-center" style={{ background: s.bg }}>
                  <p className="text-2xl font-bold text-brand-navy mb-1">{s.num}</p>
                  <p className="text-xs text-gray-600 font-medium leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Work with YE ─────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 border-t border-gray-100"
        style={{ background: 'linear-gradient(180deg, #F7F5EF 0%, #ffffff 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={whyRef} className="reveal text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
              {lang === 'hi' ? 'हमारे फायदे' : 'Our Advantages'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy">{t('aboutPage.whyTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(whyCards) && whyCards.map((card, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-brand-navy mb-4"
                  style={{ background: cardBgs[i] }}>
                  {whyIcons[i]}
                </div>
                <h3 className="font-bold text-brand-navy mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product range ─────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={rangeRef} className="reveal lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-8">{t('aboutPage.rangeTitle')}</h2>
              <ul className="space-y-3">
                {Array.isArray(rangeItems) && rangeItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: cardBgs[i % cardBgs.length] }}>
                      <svg className="w-3 h-3 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to={getLangPath('/products')}
                  className="inline-flex items-center gap-2 text-brand-navy font-semibold hover:gap-3 transition-all">
                  {t('aboutPage.viewCatalogue')}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Product image collage */}
            <div className="mt-12 lg:mt-0 grid grid-cols-3 gap-3">
              {[
                '/assets/WhatsApp Image 2026-11-02 at 1.08.54 PM.jpeg',
                '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM (2).jpeg',
                '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (1).jpeg',
                '/assets/WhatsApp Image 2026-11-02 at 1.08.52 PM.jpeg',
                '/assets/WhatsApp Image 2026-11-02 at 1.08.57 PM (2).jpeg',
                '/assets/WhatsApp Image 2026-11-02 at 1.08.58 PM.jpeg',
              ].map((src, i) => (
                <div key={i} className={`rounded-xl overflow-hidden shadow-sm ${i % 2 === 1 ? 'mt-4' : ''}`}
                  style={{ aspectRatio: '3/4' }}>
                  <img src={src} alt="YE product" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Owner / Contact profile ───────────────────────────────────────── */}
      <section className="py-14 md:py-16 border-t border-gray-100"
        style={{ background: 'linear-gradient(135deg, #F7F5EF 0%, #DCECF5 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={ownerRef} className="reveal">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
                {lang === 'hi' ? 'सीधे संपर्क करें' : 'Direct Contact'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy">{t('aboutPage.ownerTitle')}</h2>
              <p className="text-gray-500 mt-2">{t('aboutPage.ownerSub')}</p>
            </div>

            <div className="bg-white rounded-3xl shadow-card-hover overflow-hidden">
              <div className="md:grid md:grid-cols-2">
                {/* Owner photo */}
                <div className="relative bg-brand-navy flex items-center justify-center min-h-[280px] md:min-h-[360px]">
                  <div className="absolute inset-0 opacity-10"
                    style={{ background: 'radial-gradient(circle at 30% 70%, #DCECF5, transparent)' }} />
                  {siteConfig.ownerPhotoPath ? (
                    <img
                      src={siteConfig.ownerPhotoPath}
                      alt={lang === 'hi' ? 'निर्माता' : 'Manufacturer'}
                      className="w-full h-full object-cover object-center"
                      style={{ maxHeight: 360 }}
                      onError={e => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  {/* Fallback placeholder */}
                  <div className="flex-col items-center justify-center text-center p-8" style={{ display: siteConfig.ownerPhotoPath ? 'none' : 'flex' }}>
                    <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-4">
                      <svg className="w-12 h-12 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-white/40 text-xs">
                      {lang === 'hi' ? 'मालिक की फोटो जल्द उपलब्ध होगी' : 'Owner photo — to be added'}
                    </p>
                  </div>
                </div>

                {/* Owner info */}
                <div className="p-8 md:p-10 flex flex-col justify-center">
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-2">
                      {lang === 'hi' ? 'प्रोपराइटर' : 'Proprietor'}
                    </p>
                    <h3 className="text-xl font-bold text-brand-navy mb-1">
                      {t('aboutPage.ownerNameDefault')}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('aboutPage.ownerDesignationDefault')}</p>
                    <p className="mt-4 text-sm text-gray-500 italic">
                      {lang === 'hi'
                        ? 'मालिक का नाम और परिचय जल्द उपलब्ध होगा।'
                        : 'Owner name and profile to be provided by the manufacturer.'}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-ivory flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{t('contact.phone')}</p>
                        <a href={siteConfig.ownerPhoneTel}
                          className="font-semibold text-brand-navy hover:underline text-sm">
                          {siteConfig.ownerPhoneDisplay}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <a href={siteConfig.ownerPhoneTel}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {t('aboutPage.callBtn')}
                    </a>
                    <a href={siteConfig.ownerWhatsApp}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20b857] transition-colors text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      {t('aboutPage.waBtn')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-brand-navy py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={ctaRef} className="reveal text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{t('aboutPage.ctaTitle')}</h2>
            <p className="text-brand-soft-blue text-base mb-8 max-w-xl mx-auto">{t('aboutPage.ctaSub')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={buildWhatsAppContactUrl(lang)} target="_blank" rel="noopener noreferrer"
                className="btn-shine inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#25D366] hover:bg-[#20b857] text-white font-semibold rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t('aboutPage.chatWA')}
              </a>
              <Link to={getLangPath('/contact')}
                className="inline-flex items-center justify-center px-7 py-3.5 border border-white/30 text-white hover:bg-white/10 font-semibold rounded-xl transition-colors">
                {t('aboutPage.contactUs')}
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
