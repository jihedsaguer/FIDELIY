import type { MembershipReward } from '../../loyalty/api/customerApi';

/**
 * Example data for the landing page mockups only (never sent anywhere).
 * Every place that shows it is labelled as an example.
 */
export const SAMPLE_JOINED_AT = '2026-09-01T09:00:00.000Z';
export const SAMPLE_HERO_STAMPS = 6;
export const SAMPLE_DEMO_START_STAMPS = 3;
export const SAMPLE_STAMP_TARGET = 10;
export const SAMPLE_POINTS = 45;
export const SAMPLE_POINTS_TARGET = 100;
/** Same shape as a real short ID (Crockford base32, `XXXXX-XXXXX`), not a real one. */
export const SAMPLE_SHORT_ID = 'K7M2Q-9XW4D';

export function sampleStampRewards(name: string): MembershipReward[] {
  return [{ name, activityType: 'stamps', cost: SAMPLE_STAMP_TARGET }];
}

export function samplePointRewards(name: string): MembershipReward[] {
  return [{ name, activityType: 'points', cost: SAMPLE_POINTS_TARGET }];
}

/**
 * Module grid (25 x 25) that looks like a QR code: three finder squares plus
 * fixed pseudo-random modules. It encodes nothing and cannot be scanned.
 */
export const DECORATIVE_QR_SIZE = 25;

function buildDecorativeQrPath(): string {
  const size = DECORATIVE_QR_SIZE;
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
  const finderModule = (x: number, y: number) => {
    const fx = x >= size - 8 ? x - (size - 7) : x;
    const fy = y >= size - 8 ? y - (size - 7) : y;
    if (fx < 0 || fy < 0 || fx > 6 || fy > 6) return false;
    const ring = Math.max(Math.abs(fx - 3), Math.abs(fy - 3));
    return ring !== 2;
  };
  let seed = 20261124;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const parts: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const on = inFinder(x, y) ? finderModule(x, y) : random() < 0.48;
      if (on) parts.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return parts.join('');
}

export const DECORATIVE_QR_PATH = buildDecorativeQrPath();
