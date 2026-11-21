import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}

/**
 * Section - Modernized workspace section component
 * Uses FIDELIY design tokens and shadcn patterns
 */
export function Section({ title, subtitle, children, level = 2, className }: SectionProps) {
  const HeadingTag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
  
  return (
    <section className={cn('space-y-2 mb-8', className)}>
      <HeadingTag className="text-[var(--text)] text-lg md:text-xl font-semibold">
        {title}
      </HeadingTag>
      {subtitle && (
        <p className="text-[var(--text-muted)] text-sm md:text-base">{subtitle}</p>
      )}
      {children}
    </section>
  );
}
