/**
 * Programme utility functions
 */

import type { MessageKey } from '@/shared/i18n/i18n';

export type TranslateFunction = (key: MessageKey) => string;

/**
 * Format programme type for display
 * Accepts an optional translate function for i18n support
 */
export function formatProgramType(type: string, t?: TranslateFunction): string {
  if (t) {
    switch (type) {
      case 'stamps':
        return t('stampCard');
      case 'points':
        return t('pointsSystem');
      case 'both':
        return t('combined');
      default:
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : t('unknown');
    }
  }
  
  // Fallback to English for backward compatibility
  const types: Record<string, string> = {
    stamps: 'Stamp Card',
    points: 'Points System',
    both: 'Combined (Stamps + Points)',
  };
  return types[type] || type;
}

/**
 * Get expiration options for programme configuration
 * Accepts an optional translate function for i18n support
 */
export function getExpirationOptions(t?: TranslateFunction) {
  if (t) {
    return [
      { value: '', label: t('noExpiration') },
      { value: '30', label: t('days30') },
      { value: '60', label: t('days60') },
      { value: '90', label: t('days90') },
      { value: '180', label: t('days180') },
      { value: '365', label: t('year1') },
    ];
  }
  
  // Fallback to English for backward compatibility
  return [
    { value: '', label: 'No expiration' },
    { value: '30', label: '30 days' },
    { value: '60', label: '60 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '180 days' },
    { value: '365', label: '1 year' },
  ];
}

// Keep the constant for backward compatibility
export const EXPIRATION_OPTIONS = getExpirationOptions();
