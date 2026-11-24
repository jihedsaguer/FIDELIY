import { useId, useState } from 'react';
import { useI18n, type MessageKey } from '../../../shared/i18n/i18n';
import { formatWholeDinars } from '../utils/formatWholeDinars';
import {
  estimateAdditionalRevenue,
  readField,
  ROI_LIMITS,
  type RoiFieldName,
  type RoiInputs,
} from '../utils/roiEstimate';

interface FieldCopy {
  label: MessageKey;
  unit: MessageKey;
  error: MessageKey;
  inputMode: 'numeric' | 'decimal';
}

const FIELDS: Array<[RoiFieldName, FieldCopy]> = [
  ['customersPerDay', { label: 'landingEstimateCustomers', unit: 'landingUnitCustomers', error: 'landingEstimateErrorCustomers', inputMode: 'numeric' }],
  ['averageBasket', { label: 'landingEstimateBasket', unit: 'landingUnitTnd', error: 'landingEstimateErrorBasket', inputMode: 'decimal' }],
  ['openingDays', { label: 'landingEstimateDays', unit: 'landingUnitDays', error: 'landingEstimateErrorDays', inputMode: 'numeric' }],
  ['gainPercent', { label: 'landingEstimateGain', unit: 'landingUnitPercent', error: 'landingEstimateErrorGain', inputMode: 'numeric' }],
];

/** Both locales write decimals with a comma (fr-TN and ar-TN). */
function toDisplay(value: number): string {
  return String(value).replace('.', ',');
}

const INITIAL: RoiInputs = {
  customersPerDay: toDisplay(ROI_LIMITS.customersPerDay.example),
  averageBasket: toDisplay(ROI_LIMITS.averageBasket.example),
  openingDays: toDisplay(ROI_LIMITS.openingDays.example),
  gainPercent: toDisplay(ROI_LIMITS.gainPercent.example),
};

/**
 * RoiEstimator - client-only "additional revenue" illustration in TND from the
 * visitor's own values (slider + text field per value). No cost, price or
 * return figure. Results are `<output>` elements with `aria-live="off"` so a
 * slider drag is not announced at every step.
 */
export function RoiEstimator() {
  const { t, locale } = useI18n();
  const baseId = useId();
  const [values, setValues] = useState<RoiInputs>(INITIAL);
  const estimate = estimateAdditionalRevenue(values);
  const parsed = Object.fromEntries(
    FIELDS.map(([name]) => [name, readField(name, values[name])]),
  ) as Record<RoiFieldName, number | null>;

  const ids = (name: RoiFieldName) => ({
    label: `${baseId}-${name}-label`,
    input: `${baseId}-${name}-input`,
    slider: `${baseId}-${name}-slider`,
    error: `${baseId}-${name}-error`,
  });
  const allInputIds = FIELDS.map(([name]) => `${ids(name).input} ${ids(name).slider}`).join(' ');

  function update(name: RoiFieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function normalizeOnBlur(name: RoiFieldName) {
    const value = parsed[name];
    if (value !== null) update(name, toDisplay(value));
  }

  const result = (millimes: number | undefined) =>
    millimes === undefined ? '—' : formatWholeDinars(millimes, locale);

  return (
    <div className="landing-card landing-estimator grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="grid gap-6">
        {FIELDS.map(([name, copy]) => {
          const field = ROI_LIMITS[name];
          const fieldIds = ids(name);
          const value = parsed[name];
          const invalid = value === null;
          const sliderValue = value ?? field.example;
          return (
            <div key={name} className="grid gap-2">
              <label id={fieldIds.label} htmlFor={fieldIds.input} className="landing-field-label">
                {t(copy.label)}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={fieldIds.slider}
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={sliderValue}
                  aria-labelledby={fieldIds.label}
                  aria-valuetext={`${toDisplay(sliderValue)} ${t(copy.unit)}`}
                  onChange={(event) => update(name, toDisplay(Number(event.target.value)))}
                  className="landing-range min-w-0 flex-1"
                />
                <input
                  id={fieldIds.input}
                  type="text"
                  inputMode={copy.inputMode}
                  autoComplete="off"
                  dir="ltr"
                  value={values[name]}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? fieldIds.error : undefined}
                  onChange={(event) => update(name, event.target.value)}
                  onBlur={() => normalizeOnBlur(name)}
                  className="landing-number-input"
                />
              </div>
              {invalid && (
                <p id={fieldIds.error} role="alert" className="landing-field-error">
                  {t(copy.error)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="landing-estimate-result grid content-start gap-4">
        <div>
          <p className="landing-result-label">{t('landingEstimateMonthly')}</p>
          <output data-testid="roi-monthly" htmlFor={allInputIds} aria-live="off" className="landing-result-value">
            {result(estimate?.monthlyMillimes)}
          </output>
        </div>
        <div>
          <p className="landing-result-label">{t('landingEstimateYearly')}</p>
          <output data-testid="roi-annual" htmlFor={allInputIds} aria-live="off" className="landing-result-value landing-result-value-sm">
            {result(estimate?.annualMillimes)}
          </output>
        </div>
        <div className="grid gap-1 text-sm">
          <p>
            <strong>{t('landingEstimateFormulaLabel')}</strong>{' '}
            {t('landingEstimateFormula')}
          </p>
          {estimate && (
            <p dir="ltr" className="landing-formula-numbers text-start">
              {`${toDisplay(parsed.customersPerDay!)} × ${toDisplay(parsed.averageBasket!)} × ${toDisplay(parsed.openingDays!)} × ${toDisplay(parsed.gainPercent!)} %`}
            </p>
          )}
          <p>{t('landingEstimateYearNote')}</p>
        </div>
        <p className="landing-disclaimer">{t('landingEstimateDisclaimer')}</p>
      </div>
    </div>
  );
}

export default RoiEstimator;
