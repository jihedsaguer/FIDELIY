import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

/** Most slots drawn before callers should fall back to a text count. */
export const MAX_STAMP_SLOTS = 12;

export interface StampSlotsProps {
  /** Stamps collected so far (clamped to `target`). */
  earned: number;
  /** Stamps needed for the next reward; callers pass at most MAX_STAMP_SLOTS. */
  target: number;
  /** Accessible name of the whole group, e.g. "7 / 10 Timbres". */
  label: string;
  className?: string;
}

/**
 * Stamp slots toward the next reward, drawn for an on-brand (dark gradient)
 * surface. Filled slots play a CSS-only stamp-in animation (`stamp-in` in
 * globals.css); the global reduced-motion rule and `motion-safe:` disable it.
 */
export function StampSlots({ earned, target, label, className }: StampSlotsProps) {
  const filled = Math.min(Math.max(earned, 0), target);
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {Array.from({ length: target }, (_, index) => {
        const isFilled = index < filled;
        return (
          <span
            key={index}
            aria-hidden="true"
            style={isFilled ? { animationDelay: `${index * 70}ms` } : undefined}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border-2',
              isFilled
                ? 'border-white bg-white text-[var(--brand-800)] motion-safe:animate-[stamp-in_450ms_ease-out_both]'
                : 'border-white/50 bg-white/10',
            )}
          >
            {isFilled && <Check className="h-4 w-4" aria-hidden="true" strokeWidth={3} />}
          </span>
        );
      })}
    </div>
  );
}

export default StampSlots;
