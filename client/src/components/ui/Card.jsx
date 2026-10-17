export default function Card({ children, className = '', hover = false, padding = true, ...props }) {
  return (
    <div
      className={[
        'bg-white border border-slate-200 rounded-2xl shadow-card',
        hover && 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer',
        padding && 'p-6',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
