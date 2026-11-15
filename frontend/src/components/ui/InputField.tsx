import type { InputHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function InputField({ label, hint, error, ...props }: InputFieldProps) {
  const errorId = error ? `${props.id}-error` : undefined;
  const hintId = hint ? `${props.id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-stack">
      {label && (
        <label htmlFor={props.id}>
          {label}
          {props.required && <span aria-label="required"> *</span>}
        </label>
      )}
      <input
        {...props}
        aria-invalid={!!error}
        aria-required={props.required ? 'true' : 'false'}
        aria-describedby={describedBy}
      />
      {error && (
        <span id={errorId} className="form-feedback error">
          {error}
        </span>
      )}
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
    </div>
  );
}
