import { useState, type CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import { getLogoPreset, parseLogo } from '../../features/business-onboarding/logo/logoPresets';

export type BusinessLogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface BusinessLogoProps {
  /** Stored logo value: `preset:<id>`, an http(s) URL, or nothing. */
  logoUrl: string | null | undefined;
  /** Business name; its first letter is drawn for the initial preset and as the fallback. */
  name: string;
  /** Business primary colour (`#RRGGBB`) for the tile. Missing or invalid: neutral brand tile. */
  color?: string | null;
  size?: BusinessLogoSize;
  /** `translucent`: white-on-glass tile used on the loyalty card gradient. */
  variant?: 'solid' | 'translucent';
  /** Accessible name. Omit when the business name is visible next to the logo (decorative). */
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<BusinessLogoSize, string> = {
  sm: 'h-11 w-11 text-lg',
  md: 'h-12 w-12 text-xl',
  lg: 'h-16 w-16 text-2xl',
  xl: 'h-20 w-20 text-3xl',
};

const ICON_CLASS: Record<BusinessLogoSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

const WHITE = '#ffffff';
/** `--text` (ink). */
const INK = '#17231f';
/** `--brand-800`: white on it is about 7:1. */
const NEUTRAL_TILE = { background: 'var(--brand-800)', hex: '#92400e' };

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** White or ink, whichever contrasts more with the tile (always at least 3:1 for a 6-digit hex). */
function glyphColor(tileHex: string): string {
  return contrastRatio(WHITE, tileHex) >= contrastRatio(INK, tileHex) ? WHITE : INK;
}

function isHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * BusinessLogo - the business identity tile: a preset icon, the business
 * initial, or an http(s) image (falls back to the initial if it fails to load).
 */
export function BusinessLogo({
  logoUrl,
  name,
  color,
  size = 'sm',
  variant = 'solid',
  label,
  className,
}: BusinessLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const logo = parseLogo(logoUrl);
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  const base = cn('shrink-0 rounded-[var(--radius-lg)]', SIZE_CLASS[size], className);

  if (logo.kind === 'image' && logo.url !== failedUrl) {
    return (
      <img
        src={logo.url}
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        onError={() => setFailedUrl(logo.url)}
        className={cn(base, 'object-cover', variant === 'translucent' ? 'bg-white/20' : 'bg-[var(--subtle)]')}
      />
    );
  }

  const Icon = logo.kind === 'preset' ? getLogoPreset(logo.id).icon : null;
  const initial = name.trim().charAt(0).toLocaleUpperCase();
  let style: CSSProperties | undefined;
  if (variant === 'solid') {
    const tile = isHexColor(color) ? { background: color, hex: color } : NEUTRAL_TILE;
    style = { backgroundColor: tile.background, color: glyphColor(tile.hex) };
  }

  return (
    <span
      {...a11y}
      style={style}
      className={cn(
        base,
        'inline-flex items-center justify-center font-bold leading-none',
        variant === 'translucent' && 'bg-white/20 text-white',
      )}
    >
      {Icon ? <Icon className={ICON_CLASS[size]} aria-hidden="true" strokeWidth={2} /> : initial}
    </span>
  );
}

export default BusinessLogo;
