import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantClasses = {
  default: 'bg-[var(--subtle)] text-[var(--text-muted)]',
  primary: 'bg-[var(--glass-brand)] text-[var(--brand)]',
  secondary: 'bg-[var(--subtle)] text-[var(--text)]',
  success: 'bg-[var(--success-light)] text-[var(--success)]',
  warning: 'bg-[var(--warning-light)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-light)] text-[var(--danger)]',
  info: 'bg-[var(--info-light)] text-[var(--info)]',
  brand: 'bg-[var(--glass-brand)] text-[var(--brand)]',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

const baseClasses = `
  inline-flex items-center gap-1.5
  font-semibold rounded-full
`;

const dotClasses = 'w-1.5 h-1.5 rounded-full';

const dotVariantClasses = {
  default: 'bg-[var(--text-muted)]',
  primary: 'bg-[var(--brand)]',
  secondary: 'bg-[var(--text)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  info: 'bg-[var(--info)]',
  brand: 'bg-[var(--brand)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span 
            className={cn(dotClasses, dotVariantClasses[variant])}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
