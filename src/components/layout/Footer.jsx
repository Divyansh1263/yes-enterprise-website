import { Link } from 'react-router-dom'
import siteConfig from '../../config/site.config'
import { useLanguage } from '../../i18n'
import { getAllCategories, getCategoryName } from '../../data/products'

const categories = getAllCategories().filter(cat => cat.id !== 'plastic-bottles')

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
              <img src={siteConfig.logoPath || '/assets/logo.jpeg'} alt="YES ENTERPRISES logo"
                className="h-10 w-11 rounded-lg object-contain bg-white p-0.5 shrink-0" />
              <div className="leading-tight">
                <span className="text-base font-bold text-white block">{siteConfig.companyName}</span>
                <span className="text-[10px] text-white/50 tracking-wider uppercase font-medium">Manufacturers &amp; Suppliers</span>
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
              {siteConfig.ownerPhone && (
                <li className="flex items-start gap-2 text-sm">
                  <PhoneIcon />
                  <div>
                    <a href={siteConfig.ownerPhoneTel} className="text-white/70 hover:text-white transition-colors">{siteConfig.ownerPhoneDisplay}</a>
                  </div>
                </li>
              )}
              {siteConfig.ownerPhone && (
                <li className="flex items-start gap-2 text-sm">
                  <WaFooterIcon />
                  <a href={siteConfig.ownerWhatsApp} target="_blank" rel="noopener noreferrer" className="text-white/55 hover:text-[#25D366] transition-colors">WhatsApp</a>
                </li>
              )}
              {siteConfig.email && (
                <li className="flex items-start gap-2 text-sm">
                  <MailIcon /><a href={`mailto:${siteConfig.email}`} className="text-white/55 hover:text-white transition-colors">{siteConfig.email}</a>
                </li>
              )}
              {siteConfig.address && (
                <li className="flex items-start gap-2 text-sm">
                  <PinIcon />
                  <a
                    href={siteConfig.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/55 hover:text-white transition-colors"
                  >
                    {siteConfig.address}
                  </a>
                </li>
              )}
              {!siteConfig.ownerPhone && !siteConfig.email && !siteConfig.address && (
                <li className="text-sm text-white/35 italic">{t('footer.pending')}</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-1.5 text-xs text-white/35">
          <span>&copy; {year} {siteConfig.companyName}. {t('footer.rights')}</span>
          <div className="flex items-center gap-4">
            <span>{t('footer.madeInIndia')}</span>
            <span className="text-white/20">|</span>
            <Link to="/admin" className="text-white/35 hover:text-white/70 transition-colors" title="Admin Portal">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

const iconCls = 'w-4 h-4 text-white/35 shrink-0 mt-0.5'
function PhoneIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> }
function WaFooterIcon() { return <svg className={iconCls} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> }
function MailIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }
function PinIcon() { return <svg className={iconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
