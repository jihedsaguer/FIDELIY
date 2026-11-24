import {
  CakeSlice,
  Coffee,
  Croissant,
  Flower2,
  IceCreamCone,
  Pizza,
  Scissors,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '../../../shared/i18n/i18n';

/**
 * Logo presets stored in `businesses.logo_url` as `preset:<id>`.
 * Mirrors `LOGO_PRESET_IDS` in `backend/src/features/merchants/logo-presets.ts`
 * (the backend validates the value; keep both lists identical).
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

export interface LogoPreset {
  id: LogoPresetId;
  /** `null` for the `initial` preset: the business initial is drawn instead. */
  icon: LucideIcon | null;
  labelKey: MessageKey;
}

export const LOGO_PRESETS: readonly LogoPreset[] = [
  { id: 'coffee', icon: Coffee, labelKey: 'logoPresetCoffee' },
  { id: 'bakery', icon: Croissant, labelKey: 'logoPresetBakery' },
  { id: 'restaurant', icon: UtensilsCrossed, labelKey: 'logoPresetRestaurant' },
  { id: 'pizza', icon: Pizza, labelKey: 'logoPresetPizza' },
  { id: 'ice-cream', icon: IceCreamCone, labelKey: 'logoPresetIceCream' },
  { id: 'cake', icon: CakeSlice, labelKey: 'logoPresetCake' },
  { id: 'grocery', icon: ShoppingBasket, labelKey: 'logoPresetGrocery' },
  { id: 'clothing', icon: Shirt, labelKey: 'logoPresetClothing' },
  { id: 'barber', icon: Scissors, labelKey: 'logoPresetBarber' },
  { id: 'beauty', icon: Sparkles, labelKey: 'logoPresetBeauty' },
  { id: 'flowers', icon: Flower2, labelKey: 'logoPresetFlowers' },
  { id: 'shop', icon: Store, labelKey: 'logoPresetShop' },
  { id: 'initial', icon: null, labelKey: 'logoPresetInitial' },
];

const PRESET_PREFIX = 'preset:';
const MAX_LOGO_LENGTH = 2048;
const PRESETS_BY_ID = new Map<string, LogoPreset>(LOGO_PRESETS.map((preset) => [preset.id, preset]));

export type ParsedLogo =
  | { kind: 'preset'; id: LogoPresetId }
  | { kind: 'image'; url: string }
  | { kind: 'none' };

export function presetLogoValue(id: LogoPresetId): string {
  return `${PRESET_PREFIX}${id}`;
}

export function getLogoPreset(id: LogoPresetId): LogoPreset {
  return PRESETS_BY_ID.get(id) as LogoPreset;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Reads a stored logo value. Unknown presets and non-http(s) values become `none` (initial). */
export function parseLogo(value: string | null | undefined): ParsedLogo {
  if (!value) return { kind: 'none' };
  if (value.startsWith(PRESET_PREFIX)) {
    const preset = PRESETS_BY_ID.get(value.slice(PRESET_PREFIX.length));
    return preset ? { kind: 'preset', id: preset.id } : { kind: 'none' };
  }
  return isHttpUrl(value) ? { kind: 'image', url: value } : { kind: 'none' };
}

/** Client-side check before saving; the backend remains the authority. */
export function isValidLogoValue(value: string): boolean {
  return value.length <= MAX_LOGO_LENGTH && parseLogo(value).kind !== 'none';
}
