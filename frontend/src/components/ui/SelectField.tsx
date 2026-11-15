import type { SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

export function SelectField({ label, options, error, ...props }: SelectFieldProps) {
  const errorId = error ? `${props.id}-error` : undefined;
  const describedBy = errorId ? errorId : undefined;

  return (
    <div className="form-stack">
      {label && (
        <label htmlFor={props.id}>
          {label}
          {props.required && <span aria-label="required"> *</span>}
        </label>
      )}
      <select
        {...props}
        aria-invalid={!!error}
        aria-required={props.required ? 'true' : 'false'}
        aria-describedby={describedBy}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} className="form-feedback error">
          {error}
        </span>
      )}
    </div>
  );
}
