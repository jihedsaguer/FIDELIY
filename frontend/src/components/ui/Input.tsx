import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type InputVariant = 'default' | 'ghost';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  error?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  hint?: string;
}

const baseClasses = `
  w-full
  bg-[var(--surface)]
  border border-[var(--border)]
  rounded-[var(--radius-lg)]
  px-3 py-2
  text-sm
  text-[var(--text)]
  placeholder:text-[var(--text-muted)]
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-0
  disabled:cursor-not-allowed disabled:opacity-50
`;

const variantClasses = {
  default: '',
  ghost: 'bg-transparent border-0 focus:ring-0',
};

const stateClasses = {
  error: 'border-[var(--danger)] focus:ring-[var(--danger)] focus:border-[var(--danger)]',
  success: 'border-[var(--success)] focus:ring-[var(--success)] focus:border-[var(--success)]',
};

const iconClasses = 'absolute top-1/2 -translate-y-1/2 text-[var(--text-muted)]';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      error = false,
      success = false,
      leftIcon,
      rightIcon,
      label,
      hint,
      type = 'text',
      id,
      ...props
    },
    ref
  ) => {
    const hasError = error;
    const hasSuccess = !error && success;
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[var(--text)] text-sm font-medium mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className={cn(iconClasses, 'left-3')}>{leftIcon}</div>
          )}
          <input
            ref={ref}
            type={type}
            id={inputId}
            className={cn(
              baseClasses,
              variantClasses[variant],
              hasError && stateClasses.error,
              hasSuccess && stateClasses.success,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className={cn(iconClasses, 'right-3')}>{rightIcon}</div>
          )}
        </div>
        {hint && !hasError && (
          <p className="text-[var(--text-muted)] text-xs mt-1">{hint}</p>
        )}
        {hasError && (
          <p className="text-[var(--danger)] text-xs mt-1" id={`${inputId}-error`}>
            {props['aria-errormessage']}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
