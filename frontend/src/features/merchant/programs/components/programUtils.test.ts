import { describe, expect, it } from 'vitest';
import type { ProgramDto } from '../../api/programApi';
import {
  MAX_POINTS_REQUIRED,
  MAX_STAMPS_REQUIRED,
  POINT_PRESETS,
  PROGRAM_TYPE_ACCENT,
  STAMP_PRESETS,
  getProgramDetails,
} from './programUtils';

function program(type: ProgramDto['type'], configurations: unknown): ProgramDto {
  return {
    id: 'p1',
    businessId: 'b1',
    name: 'Café',
    description: null,
    type,
    version: 1,
    status: 'active',
    activatedAt: '2026-01-01T00:00:00.000Z',
    deactivatedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    configurations: configurations as ProgramDto['configurations'],
  };
}

describe('programme presets and limits', () => {
  it('match the approved presets and client-side maxima', () => {
    expect(STAMP_PRESETS).toEqual([5, 6, 8, 10, 12, 15, 20]);
    expect(POINT_PRESETS).toEqual([50, 100, 200, 500]);
    expect(MAX_STAMPS_REQUIRED).toBe(1000);
    expect(MAX_POINTS_REQUIRED).toBe(1_000_000);
  });

  it('maps every programme type to static accent class strings', () => {
    for (const type of ['stamps', 'points', 'both'] as const) {
      const accent = PROGRAM_TYPE_ACCENT[type];
      expect(accent.text).toMatch(/^text-\[var\(--accent-(stamps|points|combined)\)\]$/);
      expect(accent.soft).toMatch(/^bg-\[var\(--accent-(stamps|points|combined)-soft\)\]$/);
      expect(accent.border).toMatch(/^border-\[var\(--accent-(stamps|points|combined)-border\)\]$/);
    }
    expect(PROGRAM_TYPE_ACCENT.both.text).toBe('text-[var(--accent-combined)]');
  });
});

describe('getProgramDetails', () => {
  it('reads stamp rewards and ignores the empty points object the backend returns', () => {
    const details = getProgramDetails(
      program('stamps', {
        stamps: {
          earningRule: { purchasesPerStamp: 1 },
          rewardThresholds: [
            { stampsRequired: 10, name: 'Café offert', isActive: true },
            { stampsRequired: 5, name: 'Croissant', isActive: true },
          ],
        },
        points: {},
      }),
    );
    expect(details).toEqual({
      rewards: [
        { name: 'Croissant', activityType: 'stamps', cost: 5 },
        { name: 'Café offert', activityType: 'stamps', cost: 10 },
      ],
      pointsPerCurrencyUnit: null,
    });
  });

  it('reads points rewards and the earning rate of a combined programme', () => {
    const details = getProgramDetails(
      program('both', {
        stamps: { rewardThresholds: [{ stampsRequired: 8, name: 'Thé' }] },
        points: {
          earningRule: { pointsPerCurrencyUnit: 1.5, currencyCode: 'TND' },
          rewardThresholds: [{ pointsRequired: 200, name: 'Remise 10 %' }],
        },
      }),
    );
    expect(details.pointsPerCurrencyUnit).toBe(1.5);
    expect(details.rewards).toEqual([
      { name: 'Thé', activityType: 'stamps', cost: 8 },
      { name: 'Remise 10 %', activityType: 'points', cost: 200 },
    ]);
  });

  it('skips inactive and malformed rewards and tolerates a missing configuration', () => {
    expect(
      getProgramDetails(
        program('points', {
          points: {
            earningRule: { pointsPerCurrencyUnit: 'abc' },
            rewardThresholds: [
              { pointsRequired: 100, name: 'Off', isActive: false },
              { pointsRequired: '100', name: 'Bad cost' },
              { pointsRequired: 50 },
              null,
              { pointsRequired: 300, name: 'Bon' },
            ],
          },
        }),
      ),
    ).toEqual({ rewards: [{ name: 'Bon', activityType: 'points', cost: 300 }], pointsPerCurrencyUnit: null });

    expect(getProgramDetails(program('stamps', null))).toEqual({ rewards: [], pointsPerCurrencyUnit: null });
    expect(getProgramDetails(program('both', { stamps: 'x', points: { rewardThresholds: 'y' } }))).toEqual({
      rewards: [],
      pointsPerCurrencyUnit: null,
    });
  });
});
