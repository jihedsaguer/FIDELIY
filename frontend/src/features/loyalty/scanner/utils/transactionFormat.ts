import type { MessageKey } from '../../../../shared/i18n/i18n';
import type { LoyaltyTransactionCategory } from '../../api/merchantTransactionApi';

export const CATEGORY_LABEL: Record<LoyaltyTransactionCategory, MessageKey> = {
  purchase: 'categoryPurchase',
  redemption: 'categoryRedemption',
  reversal: 'categoryReversal',
  manual_adjustment: 'categoryAdjustment',
};

/** "+3" for gains, "-3" for losses. */
export function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

/**
 * Non-zero stamp and point deltas as text, e.g. "+1 Timbres, +12 Points"
 * (combined purchases name both). `stampsLabel` / `pointsLabel` are localized units.
 */
export function formatDeltas(
  delta: { stampsDelta: number; pointsDelta: number },
  stampsLabel: string,
  pointsLabel: string,
): string {
  const parts: string[] = [];
  if (delta.stampsDelta !== 0) parts.push(`${formatDelta(delta.stampsDelta)} ${stampsLabel}`);
  if (delta.pointsDelta !== 0) parts.push(`${formatDelta(delta.pointsDelta)} ${pointsLabel}`);
  return parts.join(', ');
}
