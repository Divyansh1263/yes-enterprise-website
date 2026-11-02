import { useLanguage } from '../i18n'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { buildWhatsAppContactUrl } from '../lib/whatsapp'
import siteConfig from '../config/site.config'

export default function Contact() {
  const { t, lang } = useLanguage()

  const waRef = useScrollReveal()
  const detailsRef = useScrollReveal()
  const stepsRef = useScrollReveal()
  const wholesaleRef = useScrollReveal()

  const steps = t('contactPage.steps')

  return (
    <div className="min-h-screen bg-white">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="bg-brand-ivory border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-semibold text-brand-amber uppercase tracking-widest mb-3">
              {lang === 'hi' ? 'संपर्क' : 'Contact'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-4">
              {t('contactPage.pageTitle')}
            </h1>
            <p className="text-gray-500 text-base sm:text-lg leading-relaxed">
              {t('contactPage.pageSub')}
            </p>
          </div>
        </div>
      </div>

      {/* ── WhatsApp CTA block ────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={waRef} className="reveal">
            <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
              {/* WhatsApp icon */}
              <div className="w-20 h-20 rounded-2xl bg-[#25D366]/20 flex items-center justify-center shrink-0">
                <svg className="w-10 h-10 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-2">
                  {t('contactPage.waTitle')}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-5">
                  {t('contactPage.waSub')}
                </p>
                {siteConfig.whatsappNumber ? (
                  <a
                    href={buildWhatsAppContactUrl(lang)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#25D366] hover:bg-[#20b857] text-white font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {t('contactPage.chatWA')}
                  </a>
                ) : (
                  <p className="text-sm text-amber-700 bg-brand-amber/10 border border-brand-amber/30 rounded-xl px-4 py-2.5 inline-block">
                    {t('contactPage.waPending')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Business details + How to order ─────────────────────────────── */}
      <section className="bg-brand-ivory border-t border-gray-100 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Business details */}
            <div className="lg:col-span-2" ref={detailsRef}>
              <div className="reveal">
                <h2 className="text-xl font-bold text-brand-navy mb-6">
                  {t('contactPage.businessDetails')}
                </h2>
                <div className="space-y-4">
                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-brand-navy/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                        {t('contactPage.phone')}
                      </p>
                      {siteConfig.phone ? (
                        <a href={`tel:${siteConfig.phone}`} className="text-brand-navy font-semibold hover:underline">
                          {siteConfig.phone}
                        </a>
                      ) : (
                        <p className="text-gray-400 text-sm">{t('contactPage.pending')}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-brand-navy/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                        {t('contactPage.email')}
                      </p>
                      {siteConfig.email ? (
                        <a href={`mailto:${siteConfig.email}`} className="text-brand-navy font-semibold hover:underline">
                          {siteConfig.email}
                        </a>
                      ) : (
                        <p className="text-gray-400 text-sm">{t('contactPage.pending')}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-brand-navy/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                        {t('contactPage.address')}
                      </p>
                      {siteConfig.address ? (
                        <p className="text-brand-navy font-semibold text-sm leading-snug">{siteConfig.address}</p>
                      ) : (
                        <p className="text-gray-400 text-sm">{t('contactPage.pending')}</p>
                      )}
                    </div>
                  </div>

                  {/* Business hours */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-brand-navy/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                        {t('contactPage.businessHours')}
                      </p>
                      <p className="text-gray-400 text-sm">{t('contactPage.pending')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How to order */}
            <div className="lg:col-span-3" ref={stepsRef}>
              <div className="reveal">
                <h2 className="text-xl font-bold text-brand-navy mb-6">
                  {t('contactPage.howToOrder')}
                </h2>
                <div className="space-y-4">
                  {Array.isArray(steps) && steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-brand-navy text-white font-bold text-sm flex items-center justify-center shrink-0">
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

      {/* ── Wholesale note ────────────────────────────────────────────────── */}
      <section className="py-12 md:py-14" ref={wholesaleRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal bg-brand-navy rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-brand-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-bold text-white mb-2">
                  {t('contactPage.wholesaleTitle')}
                </h3>
                <p className="text-brand-soft-blue text-sm leading-relaxed">
                  {t('contactPage.wholesaleText')}
                </p>
              </div>
              {siteConfig.whatsappNumber && (
                <a
                  href={buildWhatsAppContactUrl(lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20b857] text-white font-semibold rounded-xl transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {t('contactPage.chatWA')}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
