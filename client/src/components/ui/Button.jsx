import { forwardRef } from 'react';

const variants = {
  primary:   'bg-brand-600 hover:bg-brand-700 text-white shadow-sm active:scale-[.98]',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm active:scale-[.98]',
  ghost:     'text-slate-600 hover:text-brand-700 hover:bg-brand-50',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-[.98]',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[.98]',
  outline:   'border-2 border-brand-600 text-brand-600 hover:bg-brand-50 active:scale-[.98]',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5 min-h-[36px] sm:min-h-[32px]',
  sm: 'px-3.5 py-2 text-sm rounded-xl gap-2 min-h-[40px]',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2 min-h-[44px]',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5 min-h-[48px]',
  xl: 'px-8 py-4 text-lg rounded-2xl gap-3 min-h-[56px]',
};

const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size = 'md',
    className = '',
    loading = false,
    disabled = false,
    type,
    children,
    ...props
  },
  ref
) {
  const isButton = Component === 'button';
  const buttonProps = isButton
    ? {
        type: type || 'button',
        disabled: disabled || loading,
        'aria-busy': loading ? 'true' : undefined,
      }
    : {};

  return (
    <Component
      ref={ref}
      {...buttonProps}
      className={[
        'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none',
        (disabled || loading) && !isButton ? 'opacity-50 pointer-events-none' : '',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </Component>
  );
});

export default Button;
