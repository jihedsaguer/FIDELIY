import { BadRequestException } from '@nestjs/common';
import {
  calculatePointsFromMillimes,
  formatHundredths,
  formatMillimesAsTnd,
  MAX_LEDGER_DELTA,
  parseEarningRateToHundredths,
  parseTndToMillimes,
} from '../../src/shared/money';

describe('money: TND amounts in integer millimes', () => {
  it.each([
    ['12.500', 12500],
    ['12.5', 12500],
    ['12', 12000],
    ['0.001', 1],
    ['9007199254740.991', Number.MAX_SAFE_INTEGER],
  ])('parses %s as %d millimes', (input, expected) => {
    expect(parseTndToMillimes(input)).toBe(expected);
  });

  it.each([
    ['0'],
    ['0.000'],
    ['-1'],
    ['1.0001'],
    [''],
    ['1e3'],
    [' 1'],
    ['1,5'],
    ['.5'],
    ['9007199254740.992'],
  ])('rejects %p', (input) => {
    expect(() => parseTndToMillimes(input)).toThrow(BadRequestException);
  });

  it('rejects a non-string amount (API amounts are decimal strings)', () => {
    expect(() => parseTndToMillimes(12.5 as unknown as string)).toThrow(
      BadRequestException,
    );
  });

  it('formats millimes back to a three-decimal TND string', () => {
    expect(formatMillimesAsTnd(12500)).toBe('12.500');
    expect(formatMillimesAsTnd('1')).toBe('0.001');
    expect(formatMillimesAsTnd(7000)).toBe('7.000');
  });
});

describe('money: points earning rate in hundredths', () => {
  it.each([
    [0.01, 1],
    [2.5, 250],
    ['2.50', 250],
    [1, 100],
  ])('parses rate %p as %d hundredths', (input, expected) => {
    expect(parseEarningRateToHundredths(input)).toBe(expected);
  });

  it.each([[0], [-1], [2.555], ['abc'], [1e-7], [null], [undefined], [Infinity]])(
    'rejects rate %p',
    (input) => {
      expect(() => parseEarningRateToHundredths(input)).toThrow(
        BadRequestException,
      );
    },
  );

  it('formats hundredths as a two-decimal rate', () => {
    expect(formatHundredths(250)).toBe('2.50');
    expect(formatHundredths(1)).toBe('0.01');
  });
});

describe('money: points calculation (floor, integer arithmetic)', () => {
  it('12.500 TND at 2.5 points per TND earns 31 points (31.25 rounded down)', () => {
    expect(calculatePointsFromMillimes(12500, 250)).toBe(31);
  });

  it('rounds down at the boundary: 3.999 TND at 1 point per TND earns 3, 4.000 earns 4', () => {
    expect(calculatePointsFromMillimes(3999, 100)).toBe(3);
    expect(calculatePointsFromMillimes(4000, 100)).toBe(4);
  });

  it('0.01 points per TND: 99.999 TND earns 0, 100.000 TND earns 1', () => {
    expect(calculatePointsFromMillimes(99999, 1)).toBe(0);
    expect(calculatePointsFromMillimes(100000, 1)).toBe(1);
  });

  it('accepts a result equal to the ledger maximum and rejects anything above it', () => {
    expect(MAX_LEDGER_DELTA).toBe(2147483647);
    expect(calculatePointsFromMillimes(2147483647000, 100)).toBe(2147483647);
    expect(() => calculatePointsFromMillimes(2147483648000, 100)).toThrow(
      BadRequestException,
    );
  });

  it('rejects overflow from the largest accepted amount without losing precision', () => {
    expect(() =>
      calculatePointsFromMillimes(Number.MAX_SAFE_INTEGER, 100),
    ).toThrow(BadRequestException);
  });
});
