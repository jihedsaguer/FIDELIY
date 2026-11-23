import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Listbox, type ListboxOption } from '@/components/ui/Listbox';
import { useI18n } from '@/shared/i18n/i18n';

const OTHER = 'other';

interface PresetNumberFieldProps {
  id: string;
  label: string;
  value: number;
  presets: readonly number[];
  onChange: (value: number) => void;
  /** Already translated error message. */
  error?: string;
  required?: boolean;
}

/**
 * Preset dropdown plus "Other", which reveals a whole-number input.
 * Starts in custom mode when the value is not a preset. An emptied input
 * reports 0 so the form's minimum rule shows an error.
 */
export function PresetNumberField({
  id,
  label,
  value,
  presets,
  onChange,
  error,
  required = false,
}: PresetNumberFieldProps) {
  const { t } = useI18n();
  const [isCustom, setIsCustom] = useState(() => !presets.includes(value));
  const customId = `${id}-custom`;
  const customErrorId = `${customId}-error`;

  const options: ListboxOption[] = [
    ...presets.map((preset) => ({ value: String(preset), label: String(preset) })),
    { value: OTHER, label: t('presetOther') },
  ];

  const handleSelect = (selected: string) => {
    if (selected === OTHER) {
      setIsCustom(true);
      return;
    }
    setIsCustom(false);
    onChange(Number(selected));
  };

  return (
    <div className="space-y-2">
      <Listbox
        id={id}
        label={label}
        value={isCustom ? OTHER : String(value)}
        options={options}
        onChange={handleSelect}
        error={isCustom ? undefined : error}
        required={required}
      />
      {isCustom && (
        <div className="space-y-1">
          <label htmlFor={customId} className="block text-sm font-medium text-[var(--text)]">
            {t('customValueLabel')}
          </label>
          <Input
            id={customId}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            dir="ltr"
            className="min-h-[44px]"
            value={value === 0 ? '' : String(value)}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              onChange(event.target.value === '' || !Number.isFinite(parsed) ? 0 : Math.trunc(parsed));
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? customErrorId : undefined}
          />
          {error && (
            <p id={customErrorId} className="text-xs text-[var(--danger)]">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
