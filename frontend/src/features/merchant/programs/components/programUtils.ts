/**
 * Programme utility functions and constants
 */

import type { MessageKey } from '@/shared/i18n/i18n';
import type { ProgramDto, ProgramType } from '../../api/programApi';
import type { MembershipReward } from '../../../loyalty/api/customerApi';

export type TranslateFunction = (key: MessageKey) => string;

/** Preset choices for "stamps required"; any other value goes through "Other". */
export const STAMP_PRESETS = [5, 6, 8, 10, 12, 15, 20] as const;
/** Preset choices for "points required". */
export const POINT_PRESETS = [50, 100, 200, 500] as const;
export const DEFAULT_STAMPS_REQUIRED = 10;
export const DEFAULT_POINTS_REQUIRED = 100;
/** Client-side maxima for custom values (the backend has no maximum). */
export const MAX_STAMPS_REQUIRED = 1000;
export const MAX_POINTS_REQUIRED = 1_000_000;

export interface ProgramTypeAccent {
  text: string;
  soft: string;
  border: string;
  /** Gradient strip shown on the active programme card. */
  strip: string;
}

/**
 * Accent classes per programme type. Complete literal class strings (never
 * interpolated) so Tailwind can detect them. Tokens: design-tokens.css.
 */
export const PROGRAM_TYPE_ACCENT: Record<ProgramType, ProgramTypeAccent> = {
  stamps: {
    text: 'text-[var(--accent-stamps)]',
    soft: 'bg-[var(--accent-stamps-soft)]',
    border: 'border-[var(--accent-stamps-border)]',
    strip: 'bg-[linear-gradient(90deg,var(--accent-stamps),var(--accent-stamps-border))]',
  },
  points: {
    text: 'text-[var(--accent-points)]',
    soft: 'bg-[var(--accent-points-soft)]',
    border: 'border-[var(--accent-points-border)]',
    strip: 'bg-[linear-gradient(90deg,var(--accent-points),var(--accent-points-border))]',
  },
  both: {
    text: 'text-[var(--accent-combined)]',
    soft: 'bg-[var(--accent-combined-soft)]',
    border: 'border-[var(--accent-combined-border)]',
    strip: 'bg-[linear-gradient(90deg,var(--accent-stamps),var(--accent-points),var(--accent-combined))]',
  },
};

/** Format programme type for display. */
export function formatProgramType(type: string, t: TranslateFunction): string {
  switch (type) {
    case 'stamps':
      return t('stampCard');
    case 'points':
      return t('pointsSystem');
    case 'both':
      return t('combined');
    default:
      return t('unknown');
  }
}

export interface ProgramDetails {
  /** Active rewards: stamps first, then points, each by ascending cost. */
  rewards: MembershipReward[];
  /** Points per TND, or null when the programme has no valid points rule. */
  pointsPerCurrencyUnit: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readRewards(
  config: Record<string, unknown> | null,
  activityType: 'stamps' | 'points',
): MembershipReward[] {
  const thresholds = config?.rewardThresholds;
  if (!Array.isArray(thresholds)) return [];
  const costKey = activityType === 'stamps' ? 'stampsRequired' : 'pointsRequired';
  const rewards: MembershipReward[] = [];
  for (const entry of thresholds) {
    const threshold = asRecord(entry);
    if (!threshold || threshold.isActive === false) continue;
    const cost = threshold[costKey];
    const name = threshold.name;
    if (typeof cost !== 'number' || !Number.isFinite(cost) || typeof name !== 'string' || !name.trim()) {
      continue;
    }
    rewards.push({ name, activityType, cost });
  }
  return rewards.sort((a, b) => a.cost - b.cost);
}

/**
 * Reads rewards and the points rate from a programme's stored configurations.
 * Tolerant of missing or malformed data (shows nothing rather than failing);
 * only the configurations the programme type uses are read.
 */
export function getProgramDetails(program: ProgramDto): ProgramDetails {
  const configurations = asRecord(program.configurations);
  const usesStamps = program.type === 'stamps' || program.type === 'both';
  const usesPoints = program.type === 'points' || program.type === 'both';
  const stamps = usesStamps ? asRecord(configurations?.stamps) : null;
  const points = usesPoints ? asRecord(configurations?.points) : null;

  const rate = asRecord(points?.earningRule)?.pointsPerCurrencyUnit;
  return {
    rewards: [...readRewards(stamps, 'stamps'), ...readRewards(points, 'points')],
    pointsPerCurrencyUnit: typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null,
  };
}
