import { Link } from 'react-router-dom';

export default function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your search or filters.',
  actionLabel,
  actionTo,
  onAction,
  icon
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-16 h-16 mb-4 rounded-2xl bg-brand-ivory flex items-center justify-center text-gray-400 text-2xl">
        {icon || '📦'}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>}

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center px-4 py-2 bg-brand-navy text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-light transition-colors shadow-sm"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && !actionTo && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-brand-navy text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-light transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

