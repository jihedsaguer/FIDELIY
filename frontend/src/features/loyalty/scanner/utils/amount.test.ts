import { describe, expect, it } from 'vitest';
import { normalizeAmountInput, validatePurchaseAmount } from './amount';

describe('normalizeAmountInput', () => {
  it('trims and turns a comma decimal separator into a dot', () => {
    expect(normalizeAmountInput(' 12,500 ')).toBe('12.500');
    expect(normalizeAmountInput('7')).toBe('7');
  });
});

describe('validatePurchaseAmount', () => {
  it('accepts up to three decimals and returns the normalized string', () => {
    expect(validatePurchaseAmount('12,500', true)).toEqual({ ok: true, value: '12.500' });
    expect(validatePurchaseAmount('0.001', true)).toEqual({ ok: true, value: '0.001' });
    expect(validatePurchaseAmount('5', true)).toEqual({ ok: true, value: '5' });
  });

  it('rejects an empty amount when required, accepts it when optional', () => {
    expect(validatePurchaseAmount('  ', true)).toEqual({ ok: false, error: 'required' });
    expect(validatePurchaseAmount('', false)).toEqual({ ok: true, value: undefined });
  });

  it('rejects malformed, zero and over-precise amounts', () => {
    for (const input of ['abc', '-5', '1.2345', '1e3', '1,2,3', '.5', '5.', '0', '0.000', '00.00']) {
      expect(validatePurchaseAmount(input, true)).toEqual({ ok: false, error: 'invalid' });
    }
    expect(validatePurchaseAmount('0', false)).toEqual({ ok: false, error: 'invalid' });
  });
});
