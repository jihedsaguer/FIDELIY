/**
 * ProgramTypeLabel - Reusable programme type labeling utility
 * 
 * Used in both customer loyalty cards and merchant programme displays.
 * Provides consistent labeling for programme types.
 */

export interface ProgramTypeLabelProps {
  /** Programme type: 'stamps', 'points', 'both', or any string */
  type: string;
}

/**
 * Get label for programme type
 */
export function getProgramTypeLabel(type: string): string {
  switch (type) {
    case 'stamps':
      return 'Stamp Card';
    case 'points':
      return 'Points Program';
    case 'both':
      return 'Stamp & Points';
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Mixed';
  }
}

/**
 * ProgramTypeLabel - Component version for JSX usage
 */
export function ProgramTypeLabel({ type }: ProgramTypeLabelProps) {
  return <span>{getProgramTypeLabel(type)}</span>;
}

export default ProgramTypeLabel;
