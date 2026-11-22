/**
 * Purchase amount helpers. Amounts stay decimal strings end to end (no float math);
 * the backend converts them to integer millimes (ARCHITECTURE.md 6.5).
 */

const AMOUNT_PATTERN = /^\d+(\.\d{1,3})?$/;

/** Trim and accept a comma decimal separator ("12,500" -> "12.500"). */
export function normalizeAmountInput(input: string): string {
  return input.trim().replace(',', '.');
}

export type AmountValidation =
  | { ok: true; value: string | undefined }
  | { ok: false; error: 'required' | 'invalid' };

export function validatePurchaseAmount(input: string, required: boolean): AmountValidation {
  const value = normalizeAmountInput(input);
  if (value === '') return required ? { ok: false, error: 'required' } : { ok: true, value: undefined };
  if (!AMOUNT_PATTERN.test(value)) return { ok: false, error: 'invalid' };
  // Greater than zero, checked on the digits.
  if (!/[1-9]/.test(value)) return { ok: false, error: 'invalid' };
  return { ok: true, value };
}
