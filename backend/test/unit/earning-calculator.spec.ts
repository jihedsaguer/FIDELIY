import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  calculatePurchaseEarning,
  findReward,
  ProgrammeConfiguration,
} from '../../src/features/loyalty/earning-calculator';

// Settings shapes as stored by ProgramsService.createEnhanced (flat per configuration row).
const stamps: ProgrammeConfiguration = {
  id: 'cfg-stamps',
  type: 'stamps',
  settings: {
    earningRule: { purchasesPerStamp: 5 },
    rewardThresholds: [
      { stampsRequired: 10, name: 'Free coffee', isActive: true },
      { stampsRequired: 4, name: 'Old reward', isActive: false },
    ],
  },
};

const points = (rate: unknown): ProgrammeConfiguration => ({
  id: 'cfg-points',
  type: 'points',
  settings: {
    earningRule: { pointsPerCurrencyUnit: rate, currencyCode: 'TND' },
    rewardThresholds: [{ pointsRequired: 100, name: 'Discount', isActive: true }],
  },
});

describe('calculatePurchaseEarning', () => {
  it('awards exactly one stamp per purchase, ignoring purchasesPerStamp and the amount', () => {
    for (const amount of [null, 1, 999999]) {
      const result = calculatePurchaseEarning([stamps], amount);
      expect(result.entries).toEqual([
        { activityType: 'stamps', delta: 1, programConfigurationId: 'cfg-stamps' },
      ]);
      expect(result.stamps).toBe(1);
      expect(result.points).toBe(0);
    }
  });

  it('requires a purchase amount when the programme includes points', () => {
    expect(() => calculatePurchaseEarning([points(2.5)], null)).toThrow(
      BadRequestException,
    );
    expect(() => calculatePurchaseEarning([stamps, points(2.5)], null)).toThrow(
      'A purchase amount is required for programmes that include points',
    );
  });

  it('calculates points with floor and stores the earning-rate snapshot on the entry', () => {
    const result = calculatePurchaseEarning([points(2.5)], 12500);
    expect(result.entries).toEqual([
      {
        activityType: 'points',
        delta: 31,
        programConfigurationId: 'cfg-points',
        earningRateHundredths: 250,
      },
    ]);
    expect(result.earningRateHundredths).toBe(250);
  });

  it('accumulates one stamp and points independently in a combined programme', () => {
    const result = calculatePurchaseEarning([stamps, points(0.01)], 250000);
    expect(result.stamps).toBe(1);
    expect(result.points).toBe(2);
    expect(result.entries).toHaveLength(2);
  });

  it('records only the stamp when a combined purchase earns zero points', () => {
    const result = calculatePurchaseEarning([stamps, points(0.01)], 99999);
    expect(result.entries).toEqual([
      { activityType: 'stamps', delta: 1, programConfigurationId: 'cfg-stamps' },
    ]);
    expect(result.points).toBe(0);
  });

  it('rejects a points-only purchase too small to earn any point', () => {
    expect(() => calculatePurchaseEarning([points(1)], 999)).toThrow(
      BadRequestException,
    );
  });

  it('rejects an invalid stored earning rate', () => {
    expect(() => calculatePurchaseEarning([points(2.555)], 1000)).toThrow(
      BadRequestException,
    );
    expect(() => calculatePurchaseEarning([points(undefined)], 1000)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a points result above the ledger maximum', () => {
    expect(() =>
      calculatePurchaseEarning([points(1)], Number.MAX_SAFE_INTEGER),
    ).toThrow(BadRequestException);
  });
});

describe('findReward', () => {
  it('returns the stored threshold as the cost in the configuration currency', () => {
    expect(findReward(stamps, 0)).toEqual({
      configurationId: 'cfg-stamps',
      rewardIndex: 0,
      name: 'Free coffee',
      activityType: 'stamps',
      cost: 10,
    });
    expect(findReward(points(1), 0)).toMatchObject({
      activityType: 'points',
      cost: 100,
    });
  });

  it('rejects an unknown reward index', () => {
    expect(() => findReward(stamps, 5)).toThrow(NotFoundException);
    expect(() => findReward(stamps, -1)).toThrow(NotFoundException);
  });

  it('rejects an inactive reward', () => {
    expect(() => findReward(stamps, 1)).toThrow(NotFoundException);
  });
});
