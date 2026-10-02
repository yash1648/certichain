import React from 'react';

/**
 * FormField wraps inputs with accessible labels, hint text,
 * required indicators, and error messages.
 */
export function FormField({
  label,
  id,
  error,
  hint,
  required = false,
  children,
  className = '',
}) {
  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`.trim()}>
      {label && (
        <div className="form-field__label-row">
          <label htmlFor={id} className="label">
            {label}
            {required && <span className="label__required" aria-hidden="true"> *</span>}
          </label>
        </div>
      )}

      {children}

      {hint && !error && (
        <p id={id ? `${id}-hint` : undefined} className="form-field__hint">
          {hint}
        </p>
      )}

      {error && (
        <p id={id ? `${id}-error` : undefined} className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
