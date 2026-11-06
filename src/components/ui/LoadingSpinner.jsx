export default function LoadingSpinner({ size = 'md', message = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  }[size] || 'w-8 h-8 border-3';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" role="status" aria-live="polite">
      <div className={`${sizeClasses} border-brand-navy/20 border-t-brand-navy rounded-full animate-spin mb-3`} />
      {message && <p className="text-sm text-gray-500 font-medium">{message}</p>}
      <span className="sr-only">{message}</span>
    </div>
  );
}

