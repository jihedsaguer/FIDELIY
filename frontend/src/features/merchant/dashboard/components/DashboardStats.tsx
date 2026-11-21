import { StatCard } from './StatCard';
import { Users, Award, Store, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/shared/i18n/i18n';
import type { BusinessSetup } from '@/features/business-onboarding/types/businessOnboarding.types';
import type { ProgramDto } from '@/features/merchant/api/programApi';
import type { BranchDto } from '@/features/merchant/api/branchApi';

interface DashboardStatsProps {
  setup?: BusinessSetup;
  currentProgram?: ProgramDto | null;
  branches: BranchDto[];
}

export function DashboardStats({ setup, currentProgram, branches }: DashboardStatsProps) {
  const { t } = useI18n();
  const isSetupComplete = setup?.status === 'complete';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Users}
        label={t('customers')}
        value={isSetupComplete ? t('unavailable') : '0'}
        badge={isSetupComplete ? undefined : { variant: 'warning', text: t('incomplete') }}
      />
      <StatCard
        icon={Award}
        label={t('loyaltyProgram')}
        value={currentProgram ? currentProgram.name : t('noProgram')}
        badge={currentProgram ? { variant: 'success', text: t('active') } : undefined}
      />
      <StatCard
        icon={Store}
        label={t('branches')}
        value={branches.length}
        badge={branches.length > 0 ? { variant: 'success', text: t('configured') } : undefined}
      />
      <StatCard
        icon={CheckCircle2}
        label={t('status')}
        value={isSetupComplete ? t('ready') : t('setupRequired')}
        badge={isSetupComplete ? { variant: 'success', text: t('complete') } : { variant: 'warning', text: t('incomplete') }}
      />
    </div>
  );
}
