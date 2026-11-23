import { Coins, Layers, Stamp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ProgramTypeIcon - decorative icon for a programme type (stamps, points, combined).
 * Colour comes from the parent (accent text class).
 */
export function ProgramTypeIcon({ type, className }: { type: string; className?: string }) {
  const classes = cn('h-5 w-5 shrink-0', className);
  switch (type) {
    case 'stamps':
      return <Stamp aria-hidden="true" className={classes} />;
    case 'points':
      return <Coins aria-hidden="true" className={classes} />;
    case 'both':
      return <Layers aria-hidden="true" className={classes} />;
    default:
      return null;
  }
}
