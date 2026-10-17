export function LoadingSpinner({ size = 'md', label = 'Loading…' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size] ?? 'h-8 w-8';
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-slate-500" role="status" aria-label={label}>
      <svg className={`animate-spin ${s} text-brand-600`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-pulse space-y-4 ${className}`}
    >
      <div className="h-5 bg-slate-200 rounded-lg w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded-md w-full" />
        <div className="h-4 bg-slate-100 rounded-md w-5/6" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-7 bg-slate-100 rounded-lg w-20" />
        <div className="h-7 bg-slate-100 rounded-lg w-24" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div aria-hidden="true" className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-slate-200/70 rounded-md ${
            i === lines - 1 ? 'w-2/3' : i === 0 ? 'w-full' : 'w-11/12'
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonRow({ count = 3, className = '' }) {
  return (
    <div aria-hidden="true" className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-white border border-slate-200/70 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="space-y-1.5 w-1/2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="h-8 bg-slate-100 rounded-lg w-20" />
        </div>
      ))}
    </div>
  );
}

export function AlertBanner({
  variant = 'error',
  title,
  message,
  onRetry,
  className = '',
}) {
  const styles = {
    error: {
      container: 'bg-red-50/90 border-red-200 text-red-900',
      title: 'text-red-900 font-bold',
      desc: 'text-red-700',
      btn: 'bg-red-600 hover:bg-red-700 text-white',
      role: 'alert',
    },
    warning: {
      container: 'bg-amber-50/90 border-amber-200 text-amber-900',
      title: 'text-amber-900 font-bold',
      desc: 'text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
      role: 'alert',
    },
    info: {
      container: 'bg-brand-50/90 border-brand-200 text-brand-900',
      title: 'text-brand-900 font-bold',
      desc: 'text-brand-700',
      btn: 'bg-brand-600 hover:bg-brand-700 text-white',
      role: 'status',
    },
    success: {
      container: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
      title: 'text-emerald-900 font-bold',
      desc: 'text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      role: 'status',
    },
  }[variant] ?? styles.error;

  return (
    <div
      role={styles.role}
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs ${styles.container} ${className}`}
    >
      <div className="space-y-0.5">
        {title && <h3 className={`text-sm ${styles.title}`}>{title}</h3>}
        {message && <p className={`text-xs leading-relaxed ${styles.desc}`}>{message}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.btn}`}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-4 py-14 px-4 text-center max-w-sm mx-auto ${className}`}>
      {Icon && (
        <div className="p-4 bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-500 shadow-2xs" aria-hidden="true">
          <Icon size={32} />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
