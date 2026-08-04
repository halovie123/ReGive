'use client';

import { forwardRef, useId, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error, hint, id, label, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = error || hint ? `${controlId}-description` : undefined;

  return (
    <label className="field" htmlFor={controlId}>
      <span className="field-label">{label}</span>
      <input
        ref={ref}
        id={controlId}
        className={`field-control ${className}`.trim()}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {(error || hint) && (
        <span id={descriptionId} className={error ? 'field-error' : 'field-help'}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
});
