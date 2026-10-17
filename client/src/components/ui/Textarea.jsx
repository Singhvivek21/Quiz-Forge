import { forwardRef, useId } from 'react';

const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', id, rows = 4, ...props },
  ref
) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const errorId = `${textareaId}-error`;
  const hintId = `${textareaId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-xs sm:text-sm font-semibold text-slate-700 select-none">
          {label}
          {props.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            error ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 hover:border-slate-300',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1 mt-0.5">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500 mt-0.5">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Textarea;
