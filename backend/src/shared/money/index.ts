import { BadRequestException } from '@nestjs/common';

/**
 * Money and earning-rate helpers (DECISIONS.md #15, rules 3 and 5).
 *
 * - TND amounts are decimal strings at the API boundary (at most 3 decimals)
 *   and integer millimes everywhere else. No floating-point arithmetic and no
 *   silent rounding.
 * - Points earning rates keep at most 2 decimals and are held as an integer
 *   number of hundredths of a point per TND.
 * - points = floor(millimes x rateHundredths / 100000), computed with BigInt.
 */

/** Largest value a ledger entry delta (PostgreSQL integer) can hold. */
export const MAX_LEDGER_DELTA = 2147483647;

const TND_PATTERN = /^\d+(\.\d{1,3})?$/;
const RATE_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseTndToMillimes(value: string): number {
  if (typeof value !== 'string' || !TND_PATTERN.test(value)) {
    throw new BadRequestException(
      'Purchase amount must be a positive decimal string with at most 3 decimal places',
    );
  }
  const [whole, fraction = ''] = value.split('.');
  const millimes = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  if (millimes <= 0n) {
    throw new BadRequestException('Purchase amount must be greater than zero');
  }
  if (millimes > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new BadRequestException('Purchase amount is too large');
  }
  return Number(millimes);
}

export function formatMillimesAsTnd(millimes: number | string | bigint): string {
  const value = BigInt(millimes);
  const whole = value / 1000n;
  const fraction = (value % 1000n).toString().padStart(3, '0');
  return `${whole}.${fraction}`;
}

/**
 * Parses a stored points earning rate (number or decimal string, e.g. 2.5 or
 * "2.50") into integer hundredths. Rejects zero, negatives, more than two
 * decimals and non-decimal notations.
 */
export function parseEarningRateToHundredths(value: unknown): number {
  const text =
    typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : typeof value === 'string'
        ? value
        : '';
  if (!RATE_PATTERN.test(text)) {
    throw new BadRequestException(
      'Programme points earning rate must be a positive number with at most 2 decimal places',
    );
  }
  const [whole, fraction = ''] = text.split('.');
  const hundredths = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (hundredths <= 0n || hundredths > BigInt(MAX_LEDGER_DELTA)) {
    throw new BadRequestException(
      'Programme points earning rate must be a positive number with at most 2 decimal places',
    );
  }
  return Number(hundredths);
}

export function formatHundredths(hundredths: number): string {
  const value = BigInt(hundredths);
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}

export function calculatePointsFromMillimes(
  amountMillimes: number,
  rateHundredths: number,
): number {
  const points =
    (BigInt(amountMillimes) * BigInt(rateHundredths)) / 100000n;
  if (points > BigInt(MAX_LEDGER_DELTA)) {
    throw new BadRequestException(
      'Points earned by this purchase exceed the supported maximum',
    );
  }
  return Number(points);
}
