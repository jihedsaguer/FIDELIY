import type { HTMLAttributes } from 'react';

/**
 * PointsProgress - Reusable points progress bar visualization component
 * 
 * Used in both customer loyalty cards and merchant programme previews.
 * Displays a progress bar showing points earned towards a threshold.
 */
export interface PointsProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** Current points earned */
  points: number;
  /** Points threshold for reward */
  threshold: number;
  /** Optional reward name to display */
  rewardName?: string;
  /** Optional text to display below the progress */
  label?: string;
  /** Whether to show the reward name */
  showRewardName?: boolean;
}

export function PointsProgress({
  points,
  threshold,
  rewardName,
  label,
  showRewardName = false,
  className,
  ...props
}: PointsProgressProps) {
  const progress = Math.min((points / threshold) * 100, 100);

  return (
    <div className={className} {...props}>
      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
        <span>0</span>
        <span>{threshold}</span>
      </div>
      <div className="h-2 bg-[var(--subtle)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-light)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      {label && (
        <p className="text-[var(--text-muted)] text-xs mt-2">{label}</p>
      )}
      {showRewardName && rewardName && (
        <p className="text-[var(--text-muted)] text-xs">
          Reward: {rewardName} at {threshold} points
        </p>
      )}
    </div>
  );
}

export default PointsProgress;
