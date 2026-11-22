import { CheckCircle } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { useI18n } from '../../../../shared/i18n/i18n';
import type { RedemptionCompleteStepProps } from '../types';

export function RedemptionCompleteStep({
  redemption,
  customerData,
  onScanAnother,
  onClose,
}: RedemptionCompleteStepProps) {
  const { t } = useI18n();
  
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--success-light)] flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-[var(--success)]" />
      </div>
      
      <h3 className="text-2xl font-bold text-[var(--success)]">{t('redemptionComplete')}</h3>
      <p className="text-[var(--text-muted)]">
        {t('rewardRedeemedSuccessfully')}
      </p>
      
      <Card className="p-4 text-left">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">{t('customer')}</span>
            <span className="font-medium text-[var(--text)]">{customerData.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">{t('reward')}</span>
            <span className="font-medium text-[var(--text)]">{redemption.reward.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">{t('cost')}</span>
            <span className="font-medium text-[var(--text)]">
              {redemption.reward.cost} {redemption.reward.activityType === 'stamps' ? t('stamps') : t('points')}
            </span>
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between font-bold">
              <span>{t('newBalance')}</span>
              <span className="text-[var(--text)]">
                {redemption.newBalance.stamps} {t('stamps')}, {redemption.newBalance.points} {t('points')}
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
