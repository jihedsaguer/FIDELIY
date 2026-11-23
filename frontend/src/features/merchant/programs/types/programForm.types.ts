/**
 * Programme form types
 *
 * "Stamps per purchase" and expiry are not part of the form: one stamp per
 * purchase (DECISIONS #15) is always sent, and no expiry is sent (Release 1).
 */

import type { MessageKey } from '@/shared/i18n/i18n';
import type { ProgramType } from '../../api/programApi';

export interface ProgramFormData {
  name: string;
  description: string;
  type: ProgramType;
  // Stamp configuration
  stampRewardName: string;
  stampRewardThreshold: number;
  // Points configuration
  pointsPerCurrency: number;
  pointsRewardName: string;
  pointsRewardThreshold: number;
}

export type ProgramFormField = keyof ProgramFormData;

/** Field errors are i18n keys, rendered with t(). */
export type ProgramFormErrors = Partial<Record<ProgramFormField, MessageKey>>;

export const DEFAULT_FORM: ProgramFormData = {
  name: '',
  description: '',
  type: 'stamps',
  stampRewardName: '',
  stampRewardThreshold: 10,
  pointsPerCurrency: 1,
  pointsRewardName: '',
  pointsRewardThreshold: 100,
};
