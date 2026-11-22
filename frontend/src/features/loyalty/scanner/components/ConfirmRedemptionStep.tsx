import { Award } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { useI18n } from '../../../../shared/i18n/i18n';
import type { ConfirmRedemptionStepProps } from '../types';

export function ConfirmRedemptionStep({
  customerData,
  selectedReward,
  onConfirm,
  onCancel,
  isBusy,
  branchBlocked,
  errorMessage,
}: ConfirmRedemptionStepProps) {
  const { t } = useI18n();

  const reward = customerData.rewards.find(
    (r) => r.configurationId === selectedReward.configurationId && r.rewardIndex === selectedReward.rewardIndex,
  );
  if (!reward) return null;

  const currencyLabel = reward.activityType === 'stamps' ? t('stamps') : t('points');
  // Display only: the server re-reads the cost and checks the balance.
  const balanceAfter = {
    stamps: customerData.balance.stamps - (reward.activityType === 'stamps' ? reward.cost : 0),
    points: customerData.balance.points - (reward.activityType === 'points' ? reward.cost : 0),
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-[var(--brand)]" />
          <div>
            <p className="font-semibold text-[var(--text)]">{t('confirmRedemption')}</p>
            <p className="text-[var(--text-muted)] text-sm">{customerData.customer.name}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 text-center">
        <h4 className="font-bold text-[var(--text)] mb-2">{reward.name}</h4>
        <p className="text-[var(--text-muted)]">
          {t('cost')}: {reward.cost} {currencyLabel}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[var(--text-muted)] text-sm">{t('currentStamps')}</p>
          <p className="text-xl font-bold text-[var(--text)]">{customerData.balance.stamps}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t('balanceAfterRedemption')}: {balanceAfter.stamps}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[var(--text-muted)] text-sm">{t('currentPoints')}</p>
          <p className="text-xl font-bold text-[var(--text)]">{customerData.balance.points}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t('balanceAfterRedemption')}: {balanceAfter.points}
          </p>
        </Card>
      </div>

      {branchBlocked && <FormFeedback notice={t('chooseBranch')} />}
      {errorMessage && <FormFeedback error={errorMessage} />}

      <div className="flex gap-3">
        <Button
          className="flex-1"
          onClick={onConfirm}
          disabled={isBusy || branchBlocked}
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
