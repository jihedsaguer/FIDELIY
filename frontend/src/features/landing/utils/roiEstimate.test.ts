import { describe, expect, it } from 'vitest';
import { estimateAdditionalRevenue, parseDecimalInput, ROI_LIMITS } from './roiEstimate';

const example = { customersPerDay: '40', averageBasket: '15', openingDays: '26', gainPercent: '5' };

describe('estimateAdditionalRevenue', () => {
  it('computes customers x basket x days x gain in integer millimes (worked example: 780 TND a month)', () => {
    // 40 x 15 TND x 26 days x 5 % = 780 TND = 780 000 millimes
    expect(estimateAdditionalRevenue(example)).toEqual({ monthlyMillimes: 780_000, annualMillimes: 9_360_000 });
  });

  it('returns whole-number millimes for fractional baskets', () => {
    // 7 x 12.345 TND x 3 days x 7 % = 18.147 15 TND -> floor to 18 147 millimes
    const result = estimateAdditionalRevenue({ customersPerDay: '7', averageBasket: '12.345', openingDays: '3', gainPercent: '7' });
    expect(result).toEqual({ monthlyMillimes: 18_147, annualMillimes: 217_764 });
    expect(Number.isInteger(result!.monthlyMillimes)).toBe(true);
  });

  it('gives 0 when the assumed gain is 0', () => {
    expect(estimateAdditionalRevenue({ ...example, gainPercent: '0' })).toEqual({ monthlyMillimes: 0, annualMillimes: 0 });
  });

  it('accepts a comma as decimal separator', () => {
    // 40 x 15.5 x 26 x 5 % = 806 TND
    expect(estimateAdditionalRevenue({ ...example, averageBasket: '15,5' })?.monthlyMillimes).toBe(806_000);
  });

  it('clamps values to the allowed ranges', () => {
    // customers 5000 -> 1000, basket 900 -> 500, days 40 -> 31, gain 80 -> 30
    // 1000 x 500 x 31 x 30 % = 4 650 000 TND
    expect(estimateAdditionalRevenue({ customersPerDay: '5000', averageBasket: '900', openingDays: '40', gainPercent: '80' }))
      .toEqual({ monthlyMillimes: 4_650_000_000, annualMillimes: 55_800_000_000 });
    // customers 0 -> 1, basket 0.1 -> 0.5, days 0 -> 1: 1 x 0.5 x 1 x 10 % = 0.05 TND
    expect(estimateAdditionalRevenue({ customersPerDay: '0', averageBasket: '0.1', openingDays: '0', gainPercent: '10' })?.monthlyMillimes)
      .toBe(50);
  });

  it('returns null for empty or invalid input', () => {
    expect(estimateAdditionalRevenue({ ...example, customersPerDay: '' })).toBeNull();
    expect(estimateAdditionalRevenue({ ...example, averageBasket: 'abc' })).toBeNull();
    expect(estimateAdditionalRevenue({ ...example, averageBasket: '1.2345' })).toBeNull();
    expect(estimateAdditionalRevenue({ ...example, customersPerDay: '4.5' })).toBeNull();
    expect(estimateAdditionalRevenue({ ...example, openingDays: '-3' })).toBeNull();
    expect(estimateAdditionalRevenue({ ...example, gainPercent: '1e2' })).toBeNull();
  });

  it('makes the annual value exactly twelve times the monthly value', () => {
    const result = estimateAdditionalRevenue({ customersPerDay: '123', averageBasket: '7,5', openingDays: '22', gainPercent: '3' });
    // 123 x 7.5 x 22 x 3 % = 608.85 TND
    expect(result).toEqual({ monthlyMillimes: 608_850, annualMillimes: 7_306_200 });
  });
});

describe('parseDecimalInput', () => {
  it('parses dots, commas and surrounding spaces, and rejects the rest', () => {
    expect(parseDecimalInput(' 15,5 ', 3)).toBe(15.5);
    expect(parseDecimalInput('0.5', 3)).toBe(0.5);
    expect(parseDecimalInput('12', 0)).toBe(12);
    expect(parseDecimalInput('12.5', 0)).toBeNull();
    expect(parseDecimalInput('', 3)).toBeNull();
    expect(parseDecimalInput('1,2,3', 3)).toBeNull();
  });
});

describe('ROI_LIMITS', () => {
  it('matches the approved ranges and examples', () => {
    expect(ROI_LIMITS).toEqual({
      customersPerDay: { min: 1, max: 1000, step: 1, example: 40, decimals: 0 },
      averageBasket: { min: 0.5, max: 500, step: 0.5, example: 15, decimals: 3 },
      openingDays: { min: 1, max: 31, step: 1, example: 26, decimals: 0 },
      gainPercent: { min: 0, max: 30, step: 1, example: 5, decimals: 0 },
    });
  });
});
