import { QrCode } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { InputField } from '../../../../components/ui/InputField';
import { Button } from '../../../../components/ui/Button';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { useI18n } from '../../../../shared/i18n/i18n';
import type { ManualCredentialEntryProps } from '../types';

/**
 * ManualCredentialEntry - Allows manual entry of QR credential when camera is unavailable
 * 
 * Responsibilities:
 * - Display manual entry form
 * - Handle credential input
 * - Show validation errors
 */
export function ManualCredentialEntry({
  credential,
  onChange,
  onSubmit,
  isBusy,
  errorMessage,
}: ManualCredentialEntryProps) {
  const { t } = useI18n();
  const isDisabled = isBusy || !credential.trim();

  return (
    <Card className="p-4 bg-[var(--surface)]">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!isDisabled) onSubmit();
        }}
      >
      <div className="flex items-start gap-3">
        <QrCode className="w-5 h-5 text-[var(--text-muted)] mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--text)] mb-2">{t('manualEntry')}</h4>
          <p className="text-[var(--text-muted)] text-sm mb-3">
            {t('manualEntryHint')}
          </p>
          <InputField
            id="manual-credential"
            placeholder={t('pasteOrTypeCredential')}
            value={credential}
            onChange={(e) => onChange(e.target.value)}
            className="mb-3"
          />
          <Button 
            className="w-full"
            type="submit"
            disabled={isDisabled}
            isLoading={isBusy}
          >
            {t('resolveCustomer')}
          </Button>
        </div>
      </div>
      </form>
      {errorMessage && <FormFeedback error={errorMessage} />}
    </Card>
  );
}
