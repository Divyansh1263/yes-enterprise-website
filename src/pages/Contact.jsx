import { useLanguage } from '../i18n'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { buildWhatsAppContactUrl, buildWholesaleEnquiryUrl } from '../lib/whatsapp'
import siteConfig from '../config/site.config'

const WaIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default function Contact() {
  const { t, lang } = useLanguage()

  // Each ref goes directly on the .reveal div
  const headRef      = useScrollReveal()
  const waRef        = useScrollReveal()
  const detailsRef   = useScrollReveal()
  const stepsRef     = useScrollReveal()
  const wholesaleRef = useScrollReveal()

  const steps = t('contactPage.steps')

  return (
    <div className="bg-white">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #19345A 0%, #263449 100%)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #D8E9F4, transparent)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative">
          <div ref={headRef} className="reveal max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-amber mb-3 block">
              {lang === 'hi' ? 'संपर्क' : 'Contact'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t('contactPage.pageTitle')}</h1>
            <p className="text-white/65 text-base leading-relaxed">{t('contactPage.pageSub')}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 36" fill="none"><path d="M0 36L1440 36L1440 8C1200 36 960 0 720 14C480 28 240 0 0 14L0 36Z" fill="white" /></svg>
        </div>
      </div>

      {/* ── WhatsApp CTA + Owner card ─────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={waRef} className="reveal grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* WhatsApp block */}
            <div className="rounded-2xl p-7 flex flex-col"
              style={{ backgroundColor: '#edfaf2', border: '1.5px solid rgba(37,211,102,0.25)' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: '#25D36620' }}>
                  <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-brand-navy">{t('contactPage.waTitle')}</h2>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5 flex-1">{t('contactPage.waSub')}</p>
              <a href={buildWhatsAppContactUrl(lang)} target="_blank" rel="noopener noreferrer"
                className="btn-shine w-full inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-[#25D366] hover:bg-[#20b857] text-white font-semibold rounded-xl transition-colors">
                <WaIcon /> {t('contactPage.chatWA')}
              </a>
            </div>

            {/* Direct phone / representative card */}
            <div className="rounded-2xl p-7 flex flex-col"
              style={{ background: 'linear-gradient(135deg, #D8E9F4, #E8DDF7)', border: '1.5px solid #D8E9F4' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-sm shrink-0 flex items-center justify-center">
                  <img src="/assets/logo.jpeg" alt="YES ENTERPRISES"
                    className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-amber uppercase tracking-wide mb-0.5">
                    {lang === 'hi' ? 'सीधे संपर्क करें' : 'Direct Contact'}
                  </p>
                  <h2 className="text-lg font-bold text-brand-navy">{t('contactPage.ownerTitle')}</h2>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5 flex-1">{t('contactPage.ownerSub')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href={siteConfig.ownerPhoneTel}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {siteConfig.ownerPhoneDisplay}
                </a>
                <a href={siteConfig.ownerWhatsApp} target="_blank" rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20b857] transition-colors text-sm">
                  <WaIcon /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact details + How to order ───────────────────────────────────── */}
      <section className="py-10 md:py-12 border-t border-gray-100" style={{ background: '#F7F5EF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Contact details */}
            <div className="lg:col-span-2">
              <div ref={detailsRef} className="reveal">
                <h2 className="text-xl font-bold text-brand-navy mb-6">{t('contactPage.businessDetails')}</h2>
                <div className="space-y-4">
                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#D8E9F4' }}>
                      <svg className="w-5 h-5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{t('contactPage.phone')}</p>
                      <a href={siteConfig.ownerPhoneTel} className="font-semibold text-brand-navy hover:underline">
                        {siteConfig.ownerPhoneDisplay}
                      </a>
                    </div>
                  </div>
                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#BDE5D8' }}>
                      <svg className="w-5 h-5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{t('contactPage.email')}</p>
                      {siteConfig.email
                        ? <a href={`mailto:${siteConfig.email}`} className="font-semibold text-brand-navy hover:underline">{siteConfig.email}</a>
                        : <p className="text-gray-400 text-sm">{t('contactPage.pending')}</p>}
                    </div>
                  </div>
                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8DDF7' }}>
                      <svg className="w-5 h-5 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{t('contactPage.address')}</p>
                      {siteConfig.address
                        ? <p className="font-semibold text-brand-navy text-sm">{siteConfig.address}</p>
                        : <p className="text-gray-400 text-sm">{t('contactPage.pending')}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How to order */}
            <div className="lg:col-span-3">
              <div ref={stepsRef} className="reveal">
                <h2 className="text-xl font-bold text-brand-navy mb-6">{t('contactPage.howToOrder')}</h2>
                <div className="space-y-4">
                  {Array.isArray(steps) && steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center shrink-0"
                        style={{ background: ['#D8E9F4','#BDE5D8','#E8DDF7','#F8E9B7'][i], color: '#19345A' }}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-brand-navy mb-0.5">{step.title}</p>
                        <p className="text-sm text-gray-500 leading-relaxed">{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wholesale note ────────────────────────────────────────────────────── */}
      <section className="py-8 md:py-10 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={wholesaleRef} className="reveal bg-brand-navy rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <svg className="w-6 h-6 text-brand-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-base font-bold text-white mb-1">{t('contactPage.wholesaleTitle')}</h3>
                <p className="text-brand-soft-blue text-sm leading-relaxed">{t('contactPage.wholesaleText')}</p>
              </div>
              <a href={buildWholesaleEnquiryUrl(lang)} target="_blank" rel="noopener noreferrer"
                className="btn-shine inline-flex items-center gap-2 px-6 py-3 bg-brand-amber text-brand-navy font-bold rounded-xl hover:bg-yellow-400 transition-colors shrink-0 text-sm">
                <WaIcon /> {t('contactPage.chatWA')}
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
