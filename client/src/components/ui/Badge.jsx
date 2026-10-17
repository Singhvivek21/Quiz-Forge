const colours = {
  default:  'bg-slate-100 text-slate-700',
  brand:    'bg-brand-100 text-brand-700',
  green:    'bg-emerald-100 text-emerald-700',
  yellow:   'bg-amber-100 text-amber-700',
  red:      'bg-red-100 text-red-700',
  blue:     'bg-blue-100 text-blue-700',
  purple:   'bg-purple-100 text-purple-700',
  // Aliases used by QuizPreview / difficulty mapping
  success:  'bg-emerald-100 text-emerald-700',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-red-100 text-red-700',
  outline:  'border border-current bg-transparent',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export default function Badge({
  colour = 'default',
  variant,          // alias for colour (used by QuizPreview)
  size = 'md',
  dot = false,
  children,
  className = '',
}) {
  const resolvedColour = variant || colour;
  return (
    <span className={[
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      colours[resolvedColour] ?? colours.default,
      sizes[size] ?? sizes.md,
      className,
    ].join(' ')}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
