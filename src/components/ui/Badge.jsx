const variants = {
  default: 'bg-brand-navy/8 text-brand-navy',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-brand-soft-blue text-brand-navy',
  teal: 'bg-brand-teal/30 text-teal-800',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  )
}
