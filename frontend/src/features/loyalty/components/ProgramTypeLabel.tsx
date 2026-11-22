/**
 * ProgramTypeLabel - Reusable programme type labeling utility
 * 
 * Used in both customer loyalty cards and merchant programme displays.
 * Provides consistent labeling for programme types.
 */

import type { MessageKey } from '@/shared/i18n/i18n';

export interface ProgramTypeLabelProps {
  /** Programme type: 'stamps', 'points', 'both', or any string */
  type: string;
}

/**
 * Translation keys type for type safety
 * Accepts a function that translates a key to a string
 */
export type TranslateFunction = (key: MessageKey) => string;

/**
 * Get label for programme type
 * Accepts an optional translate function for i18n support
 * Returns hardcoded English labels when no translate function is provided
 * For React components, use ProgramTypeLabel component instead
 */
export function getProgramTypeLabel(type: string, t?: TranslateFunction): string {
  if (t) {
    switch (type) {
      case 'stamps':
        return t('stampsProgram');
      case 'points':
        return t('pointsProgram');
      case 'both':
        return t('hybridProgram');
      default:
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : t('unknown');
    }
  }
  
  // Fallback to English for backward compatibility
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
 * ProgramTypeLabel - Component version for JSX usage with translations
 */
export function ProgramTypeLabel({ type }: ProgramTypeLabelProps) {
  const { t } = useI18n();
  
  switch (type) {
    case 'stamps':
      return <span>{t('stampsProgram')}</span>;
    case 'points':
      return <span>{t('pointsProgram')}</span>;
    case 'both':
      return <span>{t('hybridProgram')}</span>;
    default:
      return <span>{type ? type.charAt(0).toUpperCase() + type.slice(1) : t('unknown')}</span>;
  }
}

// Import useI18n for the component
import { useI18n } from '@/shared/i18n/i18n';

export default ProgramTypeLabel;
