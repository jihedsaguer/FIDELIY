import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses = {
  primary: 'bg-[var(--brand)] text-white border border-[var(--brand)] hover:bg-[var(--brand-dark)]',
  secondary: 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--subtle)] hover:border-[var(--glass-brand-strong)]',
  accent: 'bg-transparent text-[var(--brand)] border border-[var(--glass-brand-strong)] hover:bg-[var(--glass-brand)]',
  ghost: 'bg-transparent text-[var(--text)] border-0 hover:bg-[var(--subtle)]',
  outline: 'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--subtle)] hover:border-[var(--glass-brand-strong)]',
  destructive: 'bg-[var(--danger)] text-white border border-[var(--danger)] hover:bg-[#6a2e28]',
};

const sizeClasses = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs',
  md: 'min-h-[44px] px-4 py-2 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-base',
};

const baseClasses = `
  inline-flex items-center justify-center
  font-semibold rounded-[var(--radius-lg)]
  transition-all duration-200
  whitespace-nowrap
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:cursor-not-allowed disabled:opacity-50
  ring-[var(--brand)] ring-offset-[var(--background)]
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={props.disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
