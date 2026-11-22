import { Link } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useScanner } from '@/features/loyalty/context/ScannerContext';
import { useGetBusinessSetupQuery } from '@/features/business-onboarding/api/businessOnboardingApi';
import { useGetCurrentProgramQuery } from '@/features/merchant/api/programApi';
import { useListBranchesQuery } from '@/features/merchant/api/branchApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/shared/i18n/i18n';
import { QrCode, Store } from 'lucide-react';
import { Button, Card, FormFeedback } from '@/components/ui';
import {
  BusinessOverview,
  BranchOverview,
  ProgramOverview,
  NoBusinessSetup,
} from '../dashboard/components';
import type { BusinessSetupResponse } from '@/features/business-onboarding/api/businessOnboardingApi';

/**
 * MerchantDashboardPage - Modernized merchant home screen
 * - Scan-first workflow with prominent scanner access
 * - Business/branch context display
 * - Programme summary
 * - Uses shadcn/ui components and design tokens
 */
export default function MerchantDashboardPage() {
  const { t } = useI18n();
  const { session } = useAuth();
  const setupQuery = useGetBusinessSetupQuery();
  const programQuery = useGetCurrentProgramQuery();
  const branchesQuery = useListBranchesQuery();
  const { openScanner } = useScanner();

  const setup = setupQuery.data as BusinessSetupResponse | undefined;
  const business = setup?.business;
  const currentProgram = programQuery.data;
  const branches = branchesQuery.data?.branches ?? [];
  const activeBranch = branches[0];

  const isLoading = setupQuery.isLoading || setupQuery.isFetching || programQuery.isLoading || branchesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-4xl w-full space-y-6">
          <div className="h-12 w-full bg-[var(--subtle)] rounded-[var(--radius-lg)] animate-pulse" />
          <div className="h-48 w-full bg-[var(--subtle)] rounded-[var(--radius-lg)] animate-pulse" />
          <div className="h-32 w-full bg-[var(--subtle)] rounded-[var(--radius-lg)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (setupQuery.isError) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-4xl w-full space-y-4">
          <FormFeedback error={t('failedToLoad')} />
          <Button variant="outline" onClick={() => setupQuery.refetch()}>
            {t('tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-4xl w-full">
          <NoBusinessSetup />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-4xl w-full space-y-6">
        {/* Primary Scan Action - Dominant and immediately visible */}
        <Card className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-[var(--text)] text-xl md:text-2xl font-semibold">
                {session?.user.name ? `${t('welcome')}, ${session.user.name}` : t('welcome')}
              </h2>
              <p className="text-[var(--text-muted)] mt-1">
                {t('merchantWorkspace')}
              </p>
            </div>
            <Button
              onClick={() => openScanner()}
              className="flex-shrink-0 gap-2"
              size="lg"
            >
              <QrCode className="w-5 h-5" />
              <span>{t('scan')}</span>
            </Button>
          </div>
        </Card>

        {/* Branch Selector - Accessible below scan */}
        {branches.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t('branches')}</p>
                  <p className="text-[var(--text)] font-medium">{activeBranch?.name || t('notSpecified')}</p>
                </div>
              </div>
              {branches.length > 1 && (
                <Link
                  to={paths.merchantBranches}
                  className="text-[var(--brand)] text-sm font-medium hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  {t('manage')}
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* Business and Programme Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BusinessOverview business={business} />
          <ProgramOverview program={currentProgram} />
        </div>

        {/* Branch Overview - Shows all branches */}
        <BranchOverview branches={branches} />
      </div>
    </div>
  );
}
