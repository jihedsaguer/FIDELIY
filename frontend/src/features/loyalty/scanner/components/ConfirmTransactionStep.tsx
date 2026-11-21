import { User } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { useI18n } from '../../../../shared/i18n/i18n';
import type { ConfirmTransactionStepProps } from '../types';

export function ConfirmTransactionStep({
  customerData,
  earnings,
  onConfirm,
  onBack,
  isBusy,
  errorMessage,
}: ConfirmTransactionStepProps) {
  const { t } = useI18n();
  
  const amountUnit = customerData.program.type === 'stamps' ? t('purchases') : t('tnd');
  
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-[var(--text-muted)]" />
          <div>
            <p className="font-semibold text-[var(--text)]">{customerData.customer.name}</p>
            <p className="text-[var(--text-muted)] text-sm">{t('confirmTransaction')}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--text-muted)]">{t('purchaseAmount')}</span>
            <span className="font-medium text-[var(--text)]">
              {earnings.purchaseAmount} {amountUnit}
            </span>
          </div>
          
          {earnings.stampsToEarn > 0 && (
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-muted)]">{t('stampsToEarn')}</span>
              <span className="font-medium text-[var(--success)]">+{earnings.stampsToEarn}</span>
            </div>
          )}
          
          {earnings.pointsToEarn > 0 && (
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-muted)]">{t('pointsToEarn')}</span>
              <span className="font-medium text-[var(--success)]">+{earnings.pointsToEarn}</span>
            </div>
          )}
          
          <div className="pt-3 border-t border-[var(--border)]">
            <div className="flex justify-between font-bold text-[var(--text)]">
              <span>{t('newStamps')}</span>
              <span>{earnings.totalStampsAfter}</span>
            </div>
            <div className="flex justify-between font-bold text-[var(--text)]">
              <span>{t('newPoints')}</span>
              <span>{earnings.totalPointsAfter}</span>
            </div>
          </div>
        </div>
      </Card>

      {errorMessage && <FormFeedback error={errorMessage} />}

      <div className="flex gap-3">
        <Button 
          className="flex-1"
          onClick={onConfirm} 
          disabled={isBusy}
          isLoading={isBusy}
        >
          {t('confirmTransactionAction')}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onBack}>
          {t('back')}
        </Button>
      </div>
    </div>
  );
}
