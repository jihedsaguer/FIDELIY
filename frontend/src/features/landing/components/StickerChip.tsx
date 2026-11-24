import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface StickerChipProps {
  children: ReactNode;
  /** Tilt direction in reading order; mirrored automatically in RTL. */
  tilt?: 'start' | 'end' | 'none';
  tone?: 'highlight' | 'paper' | 'ink';
  className?: string;
}

/** Pill "sticker" in the script font with a small (about 4 degree) tilt. */
export function StickerChip({ children, tilt = 'start', tone = 'highlight', className }: StickerChipProps) {
  return (
    <span className={cn('landing-sticker', `landing-sticker--${tone}`, tilt !== 'none' && `landing-sticker--tilt-${tilt}`, className)}>
      {children}
    </span>
  );
}
