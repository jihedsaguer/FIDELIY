import { useId } from 'react';
import { Check } from 'lucide-react';
import { useI18n, type MessageKey } from '../../../shared/i18n/i18n';

export interface ThemeColors {
  primaryColor: string;
  accentColor: string;
}

/** Ready-made primary/accent pairs. White on every primary is at least 4.5:1. */
export const THEME_SWATCHES: ReadonlyArray<ThemeColors & { id: string; labelKey: MessageKey }> = [
  { id: 'teal', labelKey: 'themeSwatchTeal', primaryColor: '#0f766e', accentColor: '#f0b35a' },
  { id: 'green', labelKey: 'themeSwatchGreen', primaryColor: '#2f7450', accentColor: '#f0b35a' },
  { id: 'terracotta', labelKey: 'themeSwatchTerracotta', primaryColor: '#b4532a', accentColor: '#f4c95d' },
  { id: 'navy', labelKey: 'themeSwatchNavy', primaryColor: '#1e3a8a', accentColor: '#f59e0b' },
  { id: 'plum', labelKey: 'themeSwatchPlum', primaryColor: '#86198f', accentColor: '#f9a8d4' },
  { id: 'charcoal', labelKey: 'themeSwatchCharcoal', primaryColor: '#1f2937', accentColor: '#f97316' },
];

export interface ThemeSwatchPickerProps extends ThemeColors {
  onSelect: (colors: ThemeColors) => void;
  disabled?: boolean;
}

/** Radio group that fills the existing primary/accent colour fields; custom pickers stay available. */
export function ThemeSwatchPicker({ primaryColor, accentColor, onSelect, disabled = false }: ThemeSwatchPickerProps) {
  const { t } = useI18n();
  const name = useId();
  const hintId = useId();
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={hintId} disabled={disabled}>
      <legend className="mb-1 p-0 text-sm font-semibold text-[var(--text)]">{t('themeSwatchesLegend')}</legend>
      <p id={hintId} className="mb-3 text-xs text-[var(--text-muted)]">{t('themeSwatchesHint')}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {THEME_SWATCHES.map((swatch) => {
          const checked = same(swatch.primaryColor, primaryColor) && same(swatch.accentColor, accentColor);
          return (
            <label key={swatch.id} className="relative m-0 block cursor-pointer">
              <input
                type="radio"
                name={name}
                value={swatch.id}
                checked={checked}
                onChange={() => onSelect({ primaryColor: swatch.primaryColor, accentColor: swatch.accentColor })}
                className="peer sr-only"
              />
              <span className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--surface)] px-1.5 py-2 text-center text-xs font-medium text-[var(--text)] peer-checked:border-[var(--brand-700)] peer-checked:bg-[var(--brand-50)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--brand-700)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60 motion-safe:transition-colors">
                <span aria-hidden="true" className="flex h-8 w-12 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                  <span className="h-full w-2/3" style={{ backgroundColor: swatch.primaryColor }} />
                  <span className="h-full w-1/3" style={{ backgroundColor: swatch.accentColor }} />
                </span>
                <span className="break-words">{t(swatch.labelKey)}</span>
              </span>
              <Check
                aria-hidden="true"
                className="absolute end-1 top-1 hidden h-4 w-4 rounded-full bg-[var(--brand-700)] p-0.5 text-white peer-checked:block"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default ThemeSwatchPicker;
