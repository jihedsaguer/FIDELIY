import { useState, type FormEvent, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { Input } from '@/components/ui/Input';
import { Listbox, type ListboxOption } from '@/components/ui/Listbox';
import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/shared/i18n/i18n';
import {
  useCreateEnhancedProgramMutation,
  type EnhancedProgramConfigurationRequest,
  type ProgramType,
} from '../../api/programApi';
import { useProgramForm } from '../hooks/useProgramForm';
import type { ProgramFormData } from '../types/programForm.types';
import { PresetNumberField } from './PresetNumberField';
import { ProgramTypeIcon } from './ProgramTypeIcon';
import { ProgrammeSummaryPanel } from './ProgrammeSummaryPanel';
import { POINT_PRESETS, PROGRAM_TYPE_ACCENT, STAMP_PRESETS, formatProgramType } from './programUtils';

/**
 * Request body for POST /programs/enhanced. Shape unchanged from the previous
 * page: one stamp per purchase (DECISIONS #15), TND, active reward, no expiry.
 */
export function buildProgramPayload(formData: ProgramFormData): EnhancedProgramConfigurationRequest {
  const config: EnhancedProgramConfigurationRequest = {
    name: formData.name.trim(),
    description: formData.description.trim() || undefined,
    type: formData.type,
  };

  if (formData.type === 'stamps' || formData.type === 'both') {
    config.stamps = {
      earningRule: { purchasesPerStamp: 1 },
      rewardThresholds: [
        {
          stampsRequired: formData.stampRewardThreshold,
          name: formData.stampRewardName.trim(),
          isActive: true,
        },
      ],
    };
  }

  if (formData.type === 'points' || formData.type === 'both') {
    config.points = {
      earningRule: { pointsPerCurrencyUnit: formData.pointsPerCurrency, currencyCode: 'TND' },
      rewardThresholds: [
        {
          pointsRequired: formData.pointsRewardThreshold,
          name: formData.pointsRewardName.trim(),
          isActive: true,
        },
      ],
    };
  }

  return config;
}

interface ProgramFormModalProps {
  isOpen: boolean;
  /** True when an active programme exists: the title and notice speak of a new version. */
  hasActiveProgram: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const LABEL_CLASS = 'block text-sm font-medium text-[var(--text)]';
const ERROR_CLASS = 'text-xs text-[var(--danger)]';

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ms-1 text-[var(--danger)]">
      *
    </span>
  );
}

function FieldGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--border)] p-4">
      <legend className="px-1 text-sm font-semibold text-[var(--text)]">{legend}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Programme creation dialog: form + live summary (stacked on mobile, side by
 * side from `lg`). Cannot be dismissed while the request is pending.
 */
export function ProgramFormModal({ isOpen, hasActiveProgram, onClose, onCreated }: ProgramFormModalProps) {
  const { t } = useI18n();
  const { formData, fieldErrors, resetForm, validateForm, updateField, handleTypeChange } = useProgramForm();
  const [createProgram, { isLoading: isCreating }] = useCreateEnhancedProgramMutation();
  const [submitError, setSubmitError] = useState('');
  const title = hasActiveProgram ? t('createNewVersion') : t('createProgram');

  const close = () => {
    if (isCreating) return;
    resetForm();
    setSubmitError('');
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;
    try {
      await createProgram(buildProgramPayload(formData)).unwrap();
      resetForm();
      onCreated();
    } catch {
      setSubmitError(t('programCreateError'));
    }
  };

  const typeOptions: ListboxOption<ProgramType>[] = (['stamps', 'points', 'both'] as const).map((type) => ({
    value: type,
    label: formatProgramType(type, t),
    description: t(
      type === 'stamps'
        ? 'programTypeStampsDescription'
        : type === 'points'
          ? 'programTypePointsDescription'
          : 'programTypeCombinedDescription',
    ),
    icon: <ProgramTypeIcon type={type} className={PROGRAM_TYPE_ACCENT[type].text} />,
  }));

  const errorText = (field: keyof ProgramFormData) => {
    const key = fieldErrors[field];
    return key ? t(key) : undefined;
  };

  const textField = (
    field: 'name' | 'stampRewardName' | 'pointsRewardName',
    id: string,
    label: string,
    placeholder: string,
  ) => {
    const error = errorText(field);
    return (
      <div className="space-y-1">
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
          <RequiredMark />
        </label>
        <Input
          id={id}
          type="text"
          className="min-h-[44px]"
          value={formData[field]}
          maxLength={255}
          placeholder={placeholder}
          required
          onChange={(event) => updateField(field, event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className={ERROR_CLASS}>
            {error}
          </p>
        )}
      </div>
    );
  };

  const hasStamps = formData.type === 'stamps' || formData.type === 'both';
  const hasPoints = formData.type === 'points' || formData.type === 'both';
  const rateError = errorText('pointsPerCurrency');

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={title}
      size="full"
      closeOnOverlayClick={false}
      closeOnEscape={!isCreating}
    >
      <form noValidate onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {hasActiveProgram && (
            <div
              className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--warning)] bg-[var(--warning-light)] p-3 text-sm text-[var(--text)]"
            >
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-800)]" />
              <p>{t('newVersionNotice')}</p>
            </div>
          )}

          <FieldGroup legend={t('programmeDetails')}>
            {textField('name', 'program-name', t('programmeName'), t('programNamePlaceholder'))}
            <div className="space-y-1">
              <label htmlFor="program-description" className={LABEL_CLASS}>
                {t('programmeDescription')}
                <span className="ms-1 font-normal text-[var(--text-muted)]">{`(${t('optional')})`}</span>
              </label>
              <textarea
                id="program-description"
                rows={2}
                maxLength={1000}
                value={formData.description}
                placeholder={t('describeYourLoyaltyProgramme')}
                onChange={(event) => updateField('description', event.target.value)}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <Listbox
              id="program-type"
              label={t('programmeType')}
              value={formData.type}
              options={typeOptions}
              onChange={handleTypeChange}
              required
            />
          </FieldGroup>

          {hasStamps && (
            <FieldGroup legend={t('stampsConfiguration')}>
              <p className="text-sm text-[var(--text-muted)]">{t('oneStampPerPurchase')}</p>
              {textField('stampRewardName', 'stamp-reward-name', t('rewardName'), t('stampRewardPlaceholder'))}
              <PresetNumberField
                id="stamp-threshold"
                label={t('stampsRequired')}
                value={formData.stampRewardThreshold}
                presets={STAMP_PRESETS}
                onChange={(value) => updateField('stampRewardThreshold', value)}
                error={errorText('stampRewardThreshold')}
                required
              />
            </FieldGroup>
          )}

          {hasPoints && (
            <FieldGroup legend={t('pointsConfiguration')}>
              <div className="space-y-1">
                <label htmlFor="points-per-currency" className={LABEL_CLASS}>
                  {t('pointsPerTND')}
                  <RequiredMark />
                </label>
                <Input
                  id="points-per-currency"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  dir="ltr"
                  className="min-h-[44px]"
                  value={formData.pointsPerCurrency === 0 ? '' : String(formData.pointsPerCurrency)}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    updateField(
                      'pointsPerCurrency',
                      event.target.value === '' || !Number.isFinite(parsed) ? 0 : parsed,
                    );
                  }}
                  aria-invalid={rateError ? true : undefined}
                  aria-describedby={rateError ? 'points-per-currency-error' : undefined}
                />
                {rateError && (
                  <p id="points-per-currency-error" className={ERROR_CLASS}>
                    {rateError}
                  </p>
                )}
              </div>
              {textField('pointsRewardName', 'points-reward-name', t('rewardName'), t('pointsRewardPlaceholder'))}
              <PresetNumberField
                id="points-threshold"
                label={t('pointsRequired')}
                value={formData.pointsRewardThreshold}
                presets={POINT_PRESETS}
                onChange={(value) => updateField('pointsRewardThreshold', value)}
                error={errorText('pointsRewardThreshold')}
                required
              />
            </FieldGroup>
          )}

          <FormFeedback error={submitError} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={close} disabled={isCreating}>
              {t('cancel')}
            </Button>
            <Button type="submit" className="w-full sm:w-auto" isLoading={isCreating}>
              {isCreating ? t('creating') : t('create')}
            </Button>
          </div>
        </div>

        <ProgrammeSummaryPanel formData={formData} />
      </form>
    </Modal>
  );
}
