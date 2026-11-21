import type { HTMLAttributes } from 'react';

/**
 * StampProgress - Reusable stamp grid visualization component
 * 
 * Used in both customer loyalty cards and merchant programme previews.
 * Displays a grid of stamp circles showing earned vs remaining stamps.
 */
export interface StampProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of stamps already earned */
  earned: number;
  /** Total stamps required for reward */
  threshold: number;
  /** Optional reward name to display */
  rewardName?: string;
  /** Optional text to display below the progress */
  label?: string;
  /** Size of each stamp circle in CSS units (default: 'w-8 h-8') */
  stampSize?: string;
  /** Whether to show the reward name */
  showRewardName?: boolean;
}

export function StampProgress({
  earned,
  threshold,
  rewardName,
  label,
  stampSize = 'w-8 h-8',
  showRewardName = false,
  className,
  ...props
}: StampProgressProps) {
  const stamps = [];
  
  for (let i = 0; i < threshold; i++) {
    stamps.push(
      <div
        key={i}
        className={`rounded-full border-2 mx-0.5 ${stampSize} $
          ${i < earned 
            ? 'bg-[var(--brand)] border-[var(--brand)]' 
            : 'border-[var(--border)] bg-transparent'
          }`}
      />
    );
  }

  return (
    <div className={className} {...props}>
      <div className="flex flex-wrap justify-center gap-1">{stamps}</div>
      {label && (
        <p className="text-[var(--text-muted)] text-xs mt-2">{label}</p>
      )}
      {showRewardName && rewardName && (
        <p className="text-[var(--text-muted)] text-xs">
          Reward: {rewardName} at {threshold} stamps
        </p>
      )}
    </div>
  );
}

export default StampProgress;
