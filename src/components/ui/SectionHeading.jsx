/**
 * SectionHeading — consistent section title component.
 */
export default function SectionHeading({ title, subtitle, centered = true, className = '' }) {
  return (
    <div className={`mb-10 ${centered ? 'text-center' : ''} ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-gray-500 max-w-2xl leading-relaxed text-sm sm:text-base" style={centered ? { margin: '0.75rem auto 0' } : {}}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

