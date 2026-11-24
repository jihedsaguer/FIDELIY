import type { Locale } from '../../../shared/i18n/i18n';

const formatters = new Map<Locale, Intl.NumberFormat>();

/**
 * Whole-dinar amount for the landing estimate (the app-wide `formatTnd`
 * always shows 3 decimals and stays unchanged). Input in integer millimes,
 * rounded to the nearest dinar.
 */
export function formatWholeDinars(millimes: number, locale: Locale): string {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' : 'fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formatters.set(locale, formatter);
  }
  return formatter.format(Math.round(millimes / 1000));
}
