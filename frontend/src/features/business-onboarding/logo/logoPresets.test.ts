import { describe, expect, it } from 'vitest';
import {
  LOGO_PRESET_IDS,
  LOGO_PRESETS,
  isValidLogoValue,
  parseLogo,
  presetLogoValue,
} from './logoPresets';

describe('logo presets', () => {
  it('mirrors the backend allowlist (backend/src/features/merchants/logo-presets.ts)', () => {
    expect([...LOGO_PRESET_IDS]).toEqual([
      'coffee',
      'bakery',
      'restaurant',
      'pizza',
      'ice-cream',
      'cake',
      'grocery',
      'clothing',
      'barber',
      'beauty',
      'flowers',
      'shop',
      'initial',
    ]);
  });

  it('lists 12 icon presets and the initial option, each with a name key', () => {
    expect(LOGO_PRESETS).toHaveLength(13);
    expect(LOGO_PRESETS.filter((preset) => preset.icon !== null)).toHaveLength(12);
    expect(LOGO_PRESETS.find((preset) => preset.id === 'initial')?.icon).toBeNull();
    expect(new Set(LOGO_PRESETS.map((preset) => preset.labelKey)).size).toBe(13);
  });

  it('builds the stored value of a preset', () => {
    expect(presetLogoValue('coffee')).toBe('preset:coffee');
    expect(presetLogoValue('initial')).toBe('preset:initial');
  });
});

describe('parseLogo', () => {
  it('reads a known preset', () => {
    expect(parseLogo('preset:ice-cream')).toEqual({ kind: 'preset', id: 'ice-cream' });
    expect(parseLogo('preset:initial')).toEqual({ kind: 'preset', id: 'initial' });
  });

  it('falls back to none for an unknown or malformed preset', () => {
    expect(parseLogo('preset:pharmacy')).toEqual({ kind: 'none' });
    expect(parseLogo('preset:')).toEqual({ kind: 'none' });
    expect(parseLogo('preset:COFFEE')).toEqual({ kind: 'none' });
    expect(parseLogo(' preset:coffee')).toEqual({ kind: 'none' });
  });

  it('reads http and https URLs as images', () => {
    expect(parseLogo('https://example.com/logo.png')).toEqual({
      kind: 'image',
      url: 'https://example.com/logo.png',
    });
    expect(parseLogo('http://example.com/logo.png')).toEqual({
      kind: 'image',
      url: 'http://example.com/logo.png',
    });
  });

  it('never treats other schemes or plain text as an image', () => {
    expect(parseLogo('javascript:alert(1)')).toEqual({ kind: 'none' });
    expect(parseLogo('data:image/png;base64,AAAA')).toEqual({ kind: 'none' });
    expect(parseLogo('ftp://example.com/logo.png')).toEqual({ kind: 'none' });
    expect(parseLogo('logos/abc.png')).toEqual({ kind: 'none' });
  });

  it('returns none for missing values', () => {
    expect(parseLogo(null)).toEqual({ kind: 'none' });
    expect(parseLogo(undefined)).toEqual({ kind: 'none' });
    expect(parseLogo('')).toEqual({ kind: 'none' });
  });

  it('round-trips every preset', () => {
    for (const id of LOGO_PRESET_IDS) {
      expect(parseLogo(presetLogoValue(id))).toEqual({ kind: 'preset', id });
    }
  });
});

describe('isValidLogoValue', () => {
  it('accepts presets and http(s) URLs', () => {
    expect(isValidLogoValue('preset:coffee')).toBe(true);
    expect(isValidLogoValue('preset:initial')).toBe(true);
    expect(isValidLogoValue('https://example.com/logo.png')).toBe(true);
  });

  it('rejects unknown presets, other schemes, empty and over-long values', () => {
    expect(isValidLogoValue('preset:pharmacy')).toBe(false);
    expect(isValidLogoValue('not-a-url')).toBe(false);
    expect(isValidLogoValue('javascript:alert(1)')).toBe(false);
    expect(isValidLogoValue('')).toBe(false);
    expect(isValidLogoValue(`https://example.com/${'a'.repeat(2048)}`)).toBe(false);
  });
});
