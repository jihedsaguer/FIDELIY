import { cn } from '../../../lib/utils';

export interface RewardProgressBarProps {
  /** Current balance (clamped between 0 and `max`). */
  value: number;
  /** Cost of the next reward. */
  max: number;
  /** Accessible name, e.g. "Prochaine récompense : Gâteau". */
  label: string;
  className?: string;
}

/**
 * Accessible progress bar toward the next reward, drawn for an on-brand
 * (dark gradient) surface. The fill width animates with a transition that the
 * global reduced-motion rule shortens.
 */
export function RewardProgressBar({ value, max, label, className }: RewardProgressBarProps) {
  const now = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (now / max) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={now}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-white/25', className)}
    >
      <div
        className="h-full rounded-full bg-white motion-safe:transition-[width] motion-safe:duration-700"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default RewardProgressBar;
