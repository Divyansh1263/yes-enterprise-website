import { Link } from 'react-router-dom'
import siteConfig from '../../config/site.config'
import { useLanguage } from '../../i18n'
import { getAllCategories, getCategoryName } from '../../data/products'

const categories = getAllCategories()

export default function Footer() {
  const { t, getLangPath, lang } = useLanguage()
  const year = new Date().getFullYear()

  const quickLinks = [
    { to: getLangPath('/'), label: t('nav.home') },
    { to: getLangPath('/products'), label: t('nav.products') },
    { to: getLangPath('/about'), label: t('nav.about') },
    { to: getLangPath('/contact'), label: t('nav.contact') },
  ]

  return (
    <footer className="bg-brand-slate text-white/75 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to={getLangPath('/')} className="flex items-center gap-2.5 mb-4">
              <img src="/assets/logo.jpeg" alt={`${siteConfig.brandName} logo`}
                className="h-10 w-10 rounded-lg object-contain bg-white p-0.5 shrink-0" />
              <div className="leading-none">
                <span className="text-base font-bold text-white block">{siteConfig.brandName}</span>
                <span className="text-[10px] text-white/40 tracking-widest uppercase">Baby Products</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-white/50 max-w-xs">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold text-xs uppercase tracking-widest mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2.5">
              {quickLinks.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-white/55 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-white font-semibold text-xs uppercase tracking-widest mb-4">{t('footer.productsLabel')}</h3>
            <ul className="space-y-2.5">
              {categories.map(cat => (
                <li key={cat.id}>
                  <Link to={`${getLangPath('/products')}?category=${cat.id}`}
                    className="text-sm text-white/55 hover:text-white transition-colors">
                    {getCategoryName(cat, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-xs uppercase tracking-widest mb-4">{t('footer.contactLabel')}</h3>
            <ul className="space-y-3">
              {siteConfig.phone && (
                <li className="flex items-start gap-2 text-sm">
                  <PhoneIcon /><a href={`tel:${siteConfig.phone}`} className="text-white/55 hover:text-white transition-colors">{siteConfig.phone}</a>
                </li>
              )}
              {siteConfig.email && (
                <li className="flex items-start gap-2 text-sm">
                  <MailIcon /><a href={`mailto:${siteConfig.email}`} className="text-white/55 hover:text-white transition-colors">{siteConfig.email}</a>
                </li>
              )}
              {siteConfig.address && (
                <li className="flex items-start gap-2 text-sm">
                  <PinIcon /><span className="text-white/55">{siteConfig.address}</span>
                </li>
              )}
              {!siteConfig.phone && !siteConfig.email && !siteConfig.address && (
                <li className="text-sm text-white/35 italic">{t('footer.pending')}</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-1.5 text-xs text-white/35">
          <span>&copy; {year} {siteConfig.brandName}. {t('footer.rights')}</span>
          <span>{t('footer.madeInIndia')}</span>
        </div>
      </div>
    </footer>
  )
}

const iconCls = 'w-4 h-4 text-white/35 shrink-0 mt-0.5'
function PhoneIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> }
function MailIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }
function PinIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
