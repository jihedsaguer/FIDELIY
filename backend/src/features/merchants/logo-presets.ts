import { isURL } from 'class-validator';

/**
 * Logo presets a merchant can pick instead of a logo URL. Stored in
 * `businesses.logo_url` as `preset:<id>`. Mirrored by the frontend list in
 * `frontend/src/features/business-onboarding/logo/logoPresets.ts`.
 */
export const LOGO_PRESET_IDS = [
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
] as const;

export type LogoPresetId = (typeof LOGO_PRESET_IDS)[number];

export const LOGO_PRESET_PREFIX = 'preset:';

const PRESET_IDS: ReadonlySet<string> = new Set(LOGO_PRESET_IDS);

export function isLogoPresetValue(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.startsWith(LOGO_PRESET_PREFIX) &&
    PRESET_IDS.has(value.slice(LOGO_PRESET_PREFIX.length))
  );
}

/** A logo value is either a public http(s) URL (rules unchanged) or an allowlisted preset. */
export function isLogoValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.startsWith(LOGO_PRESET_PREFIX)) return isLogoPresetValue(value);
  return isURL(value, { protocols: ['http', 'https'], require_protocol: true });
}
