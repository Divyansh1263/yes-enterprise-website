export default function SectionHeading({ title, subtitle, centered = true, accent, className = '' }) {
  return (
    <div className={`mb-10 ${centered ? 'text-center' : ''} ${className}`}>
      {accent && (
        <p className="text-brand-amber font-semibold text-xs tracking-widest uppercase mb-2">{accent}</p>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy">{title}</h2>
      {subtitle && (
        <p className={`mt-3 text-gray-500 text-sm sm:text-base leading-relaxed max-w-2xl ${centered ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
