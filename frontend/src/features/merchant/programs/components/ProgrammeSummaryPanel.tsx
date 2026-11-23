import { useMemo } from 'react';
import { LoyaltyCardView } from '../../../loyalty/components';
import type { MembershipReward } from '../../../loyalty/api/customerApi';
import { useGetBusinessSetupQuery } from '../../../business-onboarding/api/businessOnboardingApi';
import { useI18n } from '@/shared/i18n/i18n';
import type { ProgramFormData } from '../types/programForm.types';
import { formatProgramType } from './programUtils';

interface ProgrammeSummaryPanelProps {
  formData: ProgramFormData;
}

/** Sample balance shown in the preview: 60 % of the way to the reward. */
function sampleBalance(threshold: number): number {
  return threshold >= 1 ? Math.floor(threshold * 0.6) : 0;
}

/**
 * ProgrammeSummaryPanel - live summary of the programme being configured and a
 * preview of the customer's card (shared LoyaltyCardView) with sample progress.
 */
export function ProgrammeSummaryPanel({ formData }: ProgrammeSummaryPanelProps) {
  const { t, locale } = useI18n();
  const business = useGetBusinessSetupQuery().data?.business ?? null;
  const hasStamps = formData.type === 'stamps' || formData.type === 'both';
  const hasPoints = formData.type === 'points' || formData.type === 'both';
  const joinedAt = useMemo(() => new Date().toISOString(), []);
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' : 'fr-TN', { maximumFractionDigits: 2 }).format(value);

  const rewards: MembershipReward[] = [];
  if (hasStamps && formData.stampRewardThreshold >= 1) {
    rewards.push({
      name: formData.stampRewardName.trim() || t('reward'),
      activityType: 'stamps',
      cost: formData.stampRewardThreshold,
    });
  }
  if (hasPoints && formData.pointsRewardThreshold >= 1) {
    rewards.push({
      name: formData.pointsRewardName.trim() || t('reward'),
      activityType: 'points',
      cost: formData.pointsRewardThreshold,
    });
  }

  const row = (label: string, value: string) => (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-end font-medium text-[var(--text)]">{value}</dd>
    </div>
  );

  return (
    <aside className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--subtle)] p-4 lg:sticky lg:top-0">
      <h3 className="text-base font-semibold text-[var(--text)]">{t('programmeDetails')}</h3>
      <dl className="space-y-2 text-sm">
        {row(t('programmeName'), formData.name.trim() || t('notSet'))}
        {row(t('programmeType'), formatProgramType(formData.type, t))}
        {hasStamps && row(t('stampsRequired'), String(formData.stampRewardThreshold || '-'))}
        {hasStamps && row(t('rewardName'), formData.stampRewardName.trim() || t('notSet'))}
        {hasPoints && row(t('pointsPerTND'), formatNumber(formData.pointsPerCurrency))}
        {hasPoints && row(t('pointsRequired'), String(formData.pointsRewardThreshold || '-'))}
        {hasPoints && row(t('rewardName'), formData.pointsRewardName.trim() || t('notSet'))}
      </dl>
      {hasStamps && <p className="text-xs text-[var(--text-muted)]">{t('oneStampPerPurchase')}</p>}

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-[var(--text)]">{t('customerView')}</h3>
        <LoyaltyCardView
          businessName={business?.name || t('business')}
          logoUrl={business?.logoUrl ?? null}
          programType={formData.type}
          balance={{
            stamps: hasStamps ? sampleBalance(formData.stampRewardThreshold) : 0,
            points: hasPoints ? sampleBalance(formData.pointsRewardThreshold) : 0,
          }}
          rewards={rewards}
          joinedAt={joinedAt}
        />
        <p className="text-xs text-[var(--text-muted)]">{t('previewSampleNote')}</p>
      </div>
    </aside>
  );
}

export default ProgrammeSummaryPanel;
