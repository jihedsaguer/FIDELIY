/**
 * Programme utility functions
 */

/**
 * Format programme type for display
 */
export function formatProgramType(type: string): string {
  const types: Record<string, string> = {
    stamps: 'Stamp Card',
    points: 'Points System',
    both: 'Combined (Stamps + Points)',
  };
  return types[type] || type;
}

/**
 * Expiration options for programme configuration
 */
export const EXPIRATION_OPTIONS = [
  { value: '', label: 'No expiration' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
];
