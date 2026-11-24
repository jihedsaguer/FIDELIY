import { describe, expect, it } from 'vitest';
import { formatWholeDinars } from './formatWholeDinars';

describe('formatWholeDinars', () => {
  it('formats millimes as whole dinars in French (no decimals)', () => {
    expect(formatWholeDinars(9_360_000, 'fr')).toBe('9 360 DT');
    expect(formatWholeDinars(780_000, 'fr')).toBe('780 DT');
  });

  it('rounds to the nearest dinar', () => {
    expect(formatWholeDinars(608_850, 'fr')).toBe('609 DT');
    expect(formatWholeDinars(608_499, 'fr')).toBe('608 DT');
  });

  it('uses the Arabic (Tunisia) locale with Latin digits', () => {
    const text = formatWholeDinars(780_000, 'ar');
    expect(text).toContain('780');
    expect(text).toContain('د.ت.');
    expect(text).not.toMatch(/[,.]\d{3}\b/);
  });
});
