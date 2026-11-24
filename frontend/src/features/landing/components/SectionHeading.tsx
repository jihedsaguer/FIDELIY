import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface SectionHeadingProps {
  id: string;
  kicker: ReactNode;
  title: ReactNode;
  className?: string;
}

/** Handwritten kicker above a condensed display h2 (the section's accessible name). */
export function SectionHeading({ id, kicker, title, className }: SectionHeadingProps) {
  return (
    <div className={cn('landing-section-heading', className)}>
      <p className="landing-kicker">{kicker}</p>
      <h2 id={id} className="landing-display landing-h2">
        {title}
      </h2>
    </div>
  );
}
