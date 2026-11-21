import { CheckCircle } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { useI18n } from '../../../../shared/i18n/i18n';
import type { TransactionCompleteStepProps } from '../types';

export function TransactionCompleteStep({
  transaction,
  customerData,
  onScanAnother,
  onClose,
}: TransactionCompleteStepProps) {
  const { t } = useI18n();
  const amountUnit = customerData.program.type === 'stamps' ? t('purchases') : t('tnd');
  
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--success-light)] flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-[var(--success)]" />
      </div>
      
      <h3 className="text-2xl font-bold text-[var(--success)]">{t('transactionComplete')}</h3>
      <p className="text-[var(--text-muted)]">
        {t('transactionRecordedSuccessfully')}
      </p>
      
      <Card className="p-4 text-left">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">{t('customer')}</span>
            <span className="font-medium text-[var(--text)]">{customerData.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">{t('amount')}</span>
            <span className="font-medium text-[var(--text)]">
              {transaction.purchaseAmount} {amountUnit}
            </span>
          </div>
          {transaction.stampsEarned > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{t('stampsEarned')}</span>
              <span className="font-medium text-[var(--success)]">+{transaction.stampsEarned}</span>
            </div>
          )}
          {transaction.pointsEarned > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{t('pointsEarned')}</span>
              <span className="font-medium text-[var(--success)]">+{transaction.pointsEarned}</span>
            </div>
          )}
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between font-bold">
              <span>{t('newBalance')}</span>
              <span className="text-[var(--text)]">
                {transaction.newBalance.stamps} {t('stamps')}, {transaction.newBalance.points} {t('points')}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={onScanAnother}>
          {t('scanAnotherCustomer')}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </div>
  );
}
