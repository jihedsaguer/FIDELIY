import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'default' | 'glass' | 'bordered' | 'elevated';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
}

const variantClasses = {
  default: 'bg-[var(--surface)] border border-[var(--border)]',
  glass: 'bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border)]',
  bordered: 'bg-transparent border border-[var(--border)]',
  elevated: 'bg-[var(--surface)] border border-[var(--border)] shadow-md',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const baseClasses = 'rounded-[var(--radius-lg)] transition-all duration-200';

const hoverClasses = 'hover:border-[var(--brand)] hover:shadow-[var(--shadow-glass)]';

const clickableClasses = 'cursor-pointer active:scale-[0.98]';

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          paddingClasses[padding],
          hoverable && hoverClasses,
          clickable && clickableClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const headerPaddingClasses = {
  none: '',
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-b border-[var(--border)]',
          headerPaddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const contentPaddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(contentPaddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const footerPaddingClasses = {
  none: '',
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-t border-[var(--border)]',
          footerPaddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
