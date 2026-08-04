'use client';

import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { children, className = '', error, hint, id, label, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = error || hint ? `${controlId}-description` : undefined;

  return (
    <label className="field" htmlFor={controlId}>
      <span className="field-label">{label}</span>
      <select
        ref={ref}
        id={controlId}
        className={`field-control ${className}`.trim()}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {(error || hint) && (
        <span id={descriptionId} className={error ? 'field-error' : 'field-help'}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
});
