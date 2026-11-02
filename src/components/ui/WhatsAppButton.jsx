import { buildWhatsAppUrl, buildWhatsAppContactUrl } from '../../lib/whatsapp'

/**
 * WhatsAppButton — styled CTA button that opens WhatsApp with a pre-filled message.
 *
 * Usage:
 *   <WhatsAppButton productName="Glass Bottle 250ml" />        — product enquiry
 *   <WhatsAppButton />                                          — general contact
 *   <WhatsAppButton productName="..." quantity={10} />          — with quantity
 */
export default function WhatsAppButton({
  productName,
  productUrl,
  quantity,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}) {
  const isProductEnquiry = !!productName
  const url = isProductEnquiry
    ? buildWhatsAppUrl({ productName, productUrl, quantity })
    : buildWhatsAppContactUrl()

  const disabled = url === '#'

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-2.5',
  }

  const variantClasses = {
    primary: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow-md',
    outline: 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50',
    ghost: 'text-emerald-600 hover:bg-emerald-50',
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.primary}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}`}
      aria-label={isProductEnquiry ? `Enquire about ${productName} on WhatsApp` : 'Contact us on WhatsApp'}
    >
      {/* WhatsApp icon */}
      <svg className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.494A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.306-2.65.887.886-2.648-.335-.433A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
      </svg>
      {children || (isProductEnquiry ? 'Enquire on WhatsApp' : 'Chat on WhatsApp')}
    </a>
  )
}

