import { useMemo } from 'react';
import { Award } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { useI18n } from '../../../../shared/i18n/i18n';
import type { ConfirmRedemptionStepProps } from '../types';

export function ConfirmRedemptionStep({
  customerData,
  rewardId,
  onConfirm,
  onCancel,
  isBusy,
  errorMessage,
}: ConfirmRedemptionStepProps) {
  const { t } = useI18n();
  
  // Find the selected reward
  const selectedReward = useMemo(() => {
    return customerData.eligibleRewards.find(r => r.id === rewardId);
  }, [customerData.eligibleRewards, rewardId]);

  if (!selectedReward) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-[var(--brand)]" />
          <div>
            <p className="font-semibold text-[var(--text)]">{t('confirmRedemption')}</p>
            <p className="text-[var(--text-muted)] text-sm">{selectedReward.name}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 text-center">
        <h4 className="font-bold text-[var(--text)] mb-2">{selectedReward.name}</h4>
        <p className="text-[var(--text-muted)]">
          {t('cost')}: {selectedReward.pointsCost} {t('points')}
          {selectedReward.stampsCost ? ` + ${selectedReward.stampsCost} ${t('stamps')}` : ''}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <Award className="w-6 h-6 text-[var(--brand)] mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">{t('currentStamps')}</p>
          <p className="text-xl font-bold text-[var(--text)]">
            {customerData.balance.stamps}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <Award className="w-6 h-6 text-[var(--brand)] mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">{t('currentPoints')}</p>
          <p className="text-xl font-bold text-[var(--text)]">
            {customerData.balance.points}
          </p>
        </Card>
      </div>

      {errorMessage && <FormFeedback error={errorMessage} />}

      <div className="flex gap-3">
        <Button 
          className="flex-1"
          onClick={onConfirm} 
          disabled={isBusy}
          isLoading={isBusy}
        >
          {t('confirmRedemptionAction')}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
