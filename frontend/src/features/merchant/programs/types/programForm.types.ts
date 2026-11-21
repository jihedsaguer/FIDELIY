/**
 * Programme form types
 */

export interface ProgramFormData {
  name: string;
  description: string;
  type: 'stamps' | 'points' | 'both';
  // Stamp configuration
  stampPurchasesPerStamp: number;
  stampRewardName: string;
  stampRewardThreshold: number;
  stampExpirationDays: number | null;
  // Points configuration
  pointsPerCurrency: number;
  pointsRewardName: string;
  pointsRewardThreshold: number;
  pointsExpirationDays: number | null;
}

export const DEFAULT_FORM: ProgramFormData = {
  name: '',
  description: '',
  type: 'stamps',
  stampPurchasesPerStamp: 1,
  stampRewardName: 'Free Item',
  stampRewardThreshold: 10,
  stampExpirationDays: null,
  pointsPerCurrency: 1,
  pointsRewardName: 'Discount',
  pointsRewardThreshold: 100,
  pointsExpirationDays: null,
};
