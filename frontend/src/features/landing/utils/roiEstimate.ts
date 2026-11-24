/**
 * Landing-page revenue estimate: customers per day x average basket x opening
 * days x assumed visit-frequency gain. Pure and client-only. Money is handled
 * in integer millimes (1 TND = 1000 millimes), as in the rest of FIDELIY.
 * It is an illustration computed from the visitor's own values, not a promise.
 */

export interface RoiField {
  min: number;
  max: number;
  step: number;
  example: number;
  /** Decimal places accepted in typed input (0 = whole numbers only). */
  decimals: number;
}

export const ROI_LIMITS = {
  customersPerDay: { min: 1, max: 1000, step: 1, example: 40, decimals: 0 },
  averageBasket: { min: 0.5, max: 500, step: 0.5, example: 15, decimals: 3 },
  openingDays: { min: 1, max: 31, step: 1, example: 26, decimals: 0 },
  gainPercent: { min: 0, max: 30, step: 1, example: 5, decimals: 0 },
} as const satisfies Record<string, RoiField>;

export type RoiFieldName = keyof typeof ROI_LIMITS;

export type RoiInputs = Record<RoiFieldName, string>;

export interface RoiEstimate {
  monthlyMillimes: number;
  annualMillimes: number;
}

/**
 * Parses a typed non-negative number: digits, optionally one `.` or `,`
 * followed by at most `decimals` digits. Returns null for anything else
 * (empty, signs, exponents, several separators, too many decimals).
 */
export function parseDecimalInput(value: string, decimals: number): number | null {
  const trimmed = value.trim();
  const pattern = decimals > 0 ? new RegExp(`^\\d+(?:[.,]\\d{1,${decimals}})?$`) : /^\d+$/;
  if (!pattern.test(trimmed)) return null;
  return Number(trimmed.replace(',', '.'));
}

export function clampToField(value: number, field: RoiField): number {
  return Math.min(field.max, Math.max(field.min, value));
}

/** Parses then clamps one field; null when the typed value is invalid. */
export function readField(name: RoiFieldName, value: string): number | null {
  const field = ROI_LIMITS[name];
  const parsed = parseDecimalInput(value, field.decimals);
  return parsed === null ? null : clampToField(parsed, field);
}

export function estimateAdditionalRevenue(inputs: RoiInputs): RoiEstimate | null {
  const customers = readField('customersPerDay', inputs.customersPerDay);
  const basket = readField('averageBasket', inputs.averageBasket);
  const days = readField('openingDays', inputs.openingDays);
  const gain = readField('gainPercent', inputs.gainPercent);
  if (customers === null || basket === null || days === null || gain === null) return null;

  // Integers only from here: basket in millimes (<= 3 decimals), gain in whole percent.
  // Largest product 1000 x 500 000 x 31 x 30 = 4.65e11, far below 2^53.
  const basketMillimes = Math.round(basket * 1000);
  const monthlyMillimes = Math.floor((customers * basketMillimes * days * gain) / 100);
  return { monthlyMillimes, annualMillimes: monthlyMillimes * 12 };
}
