import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  calculatePointsFromMillimes,
  MAX_LEDGER_DELTA,
  parseEarningRateToHundredths,
} from '../../shared/money';
import type { LoyaltyActivityType } from './loyalty-ledger.service';

/**
 * Server-side earning and reward rules for Checkpoint 6B-C (DECISIONS.md #15).
 *
 * Programme settings are read in the shape stored by
 * ProgramsService.createEnhanced: one flat object per configuration row,
 * `{ earningRule, rewardThresholds, stampExpirationDays | pointsExpirationDays }`.
 */
export interface ProgrammeConfiguration {
  id: string;
  type: LoyaltyActivityType;
  settings: Record<string, unknown>;
}

export interface EarningEntry {
  activityType: LoyaltyActivityType;
  delta: number;
  programConfigurationId: string;
  earningRateHundredths?: number;
}

export interface PurchaseEarning {
  entries: EarningEntry[];
  stamps: number;
  points: number;
  earningRateHundredths: number | null;
}

export interface SelectedReward {
  configurationId: string;
  rewardIndex: number;
  name: string;
  activityType: LoyaltyActivityType;
  cost: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function readPointsRateHundredths(
  configuration: ProgrammeConfiguration,
): number {
  const earningRule = asRecord(configuration.settings?.['earningRule']);
  return parseEarningRateToHundredths(earningRule?.['pointsPerCurrencyUnit']);
}

/**
 * One stamp per confirmed purchase (purchasesPerStamp is ignored); points
 * require an amount and use floor(millimes x rate / 100000).
 */
export function calculatePurchaseEarning(
  configurations: ProgrammeConfiguration[],
  amountMillimes: number | null,
): PurchaseEarning {
  const stampsConfig = configurations.find((c) => c.type === 'stamps');
  const pointsConfig = configurations.find((c) => c.type === 'points');
  const entries: EarningEntry[] = [];
  let points = 0;
  let earningRateHundredths: number | null = null;

  if (stampsConfig) {
    entries.push({
      activityType: 'stamps',
      delta: 1,
      programConfigurationId: stampsConfig.id,
    });
  }

  if (pointsConfig) {
    if (amountMillimes === null) {
      throw new BadRequestException(
        'A purchase amount is required for programmes that include points',
      );
    }
    earningRateHundredths = readPointsRateHundredths(pointsConfig);
    points = calculatePointsFromMillimes(amountMillimes, earningRateHundredths);
    if (points > 0) {
      entries.push({
        activityType: 'points',
        delta: points,
        programConfigurationId: pointsConfig.id,
        earningRateHundredths,
      });
    }
  }

  if (!entries.length) {
    throw new BadRequestException(
      pointsConfig
        ? 'The purchase amount is too small to earn any points'
        : 'The active programme has no earning configuration',
    );
  }

  return {
    entries,
    stamps: stampsConfig ? 1 : 0,
    points,
    earningRateHundredths,
  };
}

/**
 * Reads a reward from the stored reward thresholds of a configuration. A
 * reward explicitly marked `isActive: false` is not redeemable.
 */
export function findReward(
  configuration: ProgrammeConfiguration,
  rewardIndex: number,
): SelectedReward {
  const thresholds = configuration.settings?.['rewardThresholds'];
  const reward =
    Array.isArray(thresholds) && Number.isInteger(rewardIndex) && rewardIndex >= 0
      ? asRecord(thresholds[rewardIndex])
      : undefined;
  const cost =
    reward?.[configuration.type === 'stamps' ? 'stampsRequired' : 'pointsRequired'];

  if (
    !reward ||
    reward['isActive'] === false ||
    typeof cost !== 'number' ||
    !Number.isInteger(cost) ||
    cost < 1 ||
    cost > MAX_LEDGER_DELTA
  ) {
    throw new NotFoundException('Reward not found or not available');
  }

  return {
    configurationId: configuration.id,
    rewardIndex,
    name: typeof reward['name'] === 'string' ? reward['name'] : '',
    activityType: configuration.type,
    cost,
  };
}

export function listRewards(
  configuration: ProgrammeConfiguration,
): SelectedReward[] {
  const thresholds = configuration.settings?.['rewardThresholds'];
  if (!Array.isArray(thresholds)) return [];
  const rewards: SelectedReward[] = [];
  thresholds.forEach((_reward, index) => {
    try {
      rewards.push(findReward(configuration, index));
    } catch {
      // Inactive or malformed thresholds are not offered.
    }
  });
  return rewards;
}
