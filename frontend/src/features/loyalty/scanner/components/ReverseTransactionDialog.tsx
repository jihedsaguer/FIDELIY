import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useI18n } from '../../../../shared/i18n/i18n';

const MAX_REASON_LENGTH = 500;

interface ReverseTransactionDialogProps {
  isOpen: boolean;
  isPending: boolean;
  /** Localized error from the last failed attempt; the dialog stays open for a retry. */
  errorMessage?: string;
  /** Called with the trimmed reason (1-500 characters). */
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Reversal is final (DECISIONS #15): destructive confirmation with a required reason.
 * The parent mounts it per reversal, so the reason starts empty each time.
 */
export function ReverseTransactionDialog({
  isOpen,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}: ReverseTransactionDialogProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();
  // Presets only fill the textarea; the reason stays free text and is still required.
  const presets = [t('reasonPresetDuplicate'), t('reasonPresetEntryError'), t('reasonPresetCustomerRequest')];

  function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 1) {
      setValidationError(t('reversalReasonRequired'));
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setValidationError(t('reversalReasonTooLong'));
      return;
    }
    setValidationError(undefined);
    onConfirm(trimmed);
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      variant="destructive"
      title={t('reverseConfirmTitle')}
      message={t('reverseConfirmMessage')}
      confirmLabel={t('reverseConfirm')}
      isPending={isPending}
      errorMessage={errorMessage}
      onConfirm={submit}
      onCancel={onCancel}
    >
      <div className="form-stack">
        <label htmlFor="reversal-reason">{t('reversalReasonLabel')}</label>
        <div role="group" aria-label={t('reasonPresetsLabel')} className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              className="whitespace-normal"
              disabled={isPending}
              onClick={() => {
                setReason(preset);
                setValidationError(undefined);
              }}
            >
              {preset}
            </Button>
          ))}
        </div>
        <textarea
          id="reversal-reason"
          rows={3}
          maxLength={MAX_REASON_LENGTH}
          value={reason}
          disabled={isPending}
          aria-required="true"
          aria-invalid={!!validationError}
          aria-describedby={validationError ? 'reversal-reason-error' : undefined}
          onChange={(event) => {
            setReason(event.target.value);
            setValidationError(undefined);
          }}
        />
        <span className="field-hint text-end">{reason.length}/{MAX_REASON_LENGTH}</span>
        {validationError && (
          <span id="reversal-reason-error" className="form-feedback error" role="alert">
            {validationError}
          </span>
        )}
      </div>
    </ConfirmDialog>
  );
}
