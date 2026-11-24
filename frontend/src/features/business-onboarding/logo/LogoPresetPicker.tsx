import { useId, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { BusinessLogo } from '../../../components/ui/BusinessLogo';
import { useI18n } from '../../../shared/i18n/i18n';
import { LOGO_PRESETS, parseLogo, presetLogoValue } from './logoPresets';

export interface LogoPresetPickerProps {
  /** Current stored value: `preset:<id>` or an existing http(s) logo URL. */
  value: string;
  onChange: (value: string) => void;
  businessName: string;
  /** Business primary colour used for the preview tiles. */
  color?: string | null;
  disabled?: boolean;
}

/**
 * Native radio group of logo presets (arrow keys move the selection natively).
 * An existing http(s) logo is kept as an extra "current logo" option so a merchant
 * who already has one does not lose it by opening the picker.
 */
export function LogoPresetPicker({ value, onChange, businessName, color, disabled = false }: LogoPresetPickerProps) {
  const { t } = useI18n();
  const name = useId();
  const hintId = useId();
  const parsed = parseLogo(value);
  const [imageUrl, setImageUrl] = useState(parsed.kind === 'image' ? parsed.url : null);
  if (parsed.kind === 'image' && parsed.url !== imageUrl) setImageUrl(parsed.url);
  const displayName = businessName.trim() || 'F';

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={hintId} disabled={disabled}>
      <legend className="mb-1 p-0 text-sm font-semibold text-[var(--text)]">{t('logoPickerLegend')}</legend>
      <p id={hintId} className="mb-3 text-xs text-[var(--text-muted)]">{t('logoPickerHint')}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {imageUrl && (
          <PickerOption name={name} value={imageUrl} checked={value === imageUrl} onChange={onChange} label={t('logoCurrent')}>
            <BusinessLogo logoUrl={imageUrl} name={displayName} color={color} size="md" />
          </PickerOption>
        )}
        {LOGO_PRESETS.map((preset) => {
          const optionValue = presetLogoValue(preset.id);
          return (
            <PickerOption
              key={preset.id}
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={onChange}
              label={t(preset.labelKey)}
            >
              <BusinessLogo logoUrl={optionValue} name={displayName} color={color} size="md" />
            </PickerOption>
          );
        })}
      </div>
    </fieldset>
  );
}

interface PickerOptionProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}

function PickerOption({ name, value, checked, onChange, label, children }: PickerOptionProps) {
  return (
    <label className="relative m-0 block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <span className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border-2 border-[var(--border)] bg-[var(--surface)] px-1.5 py-2 text-center text-xs font-medium text-[var(--text)] peer-checked:border-[var(--brand-700)] peer-checked:bg-[var(--brand-50)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--brand-700)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60 motion-safe:transition-colors">
        {children}
        <span className="break-words">{label}</span>
      </span>
      <Check
        aria-hidden="true"
        className="absolute end-1 top-1 hidden h-4 w-4 rounded-full bg-[var(--brand-700)] p-0.5 text-white peer-checked:block"
      />
    </label>
  );
}

export default LogoPresetPicker;
