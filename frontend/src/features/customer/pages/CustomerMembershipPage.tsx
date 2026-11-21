import { useParams, useNavigate } from 'react-router-dom';
import { useGetMembershipQuery, useGetAvailableRewardsQuery, useGetTransactionHistoryQuery } from '../../loyalty/api';
import { Button } from '../../../components/ui/Button';
import { Section } from '../../../components/ui/Section';
import { Card } from '../../../components/ui/Card';
import { useI18n } from '../../../shared/i18n/i18n';
import { paths } from '../../../app/routes/paths';
import type { TransactionHistoryItem, RewardInfo } from '../../loyalty/api/customerApi';

// Type for the getMembership endpoint response (backend returns nested business and program objects)
interface BackendMembershipDetail {
  id: string;
  status: 'active' | 'inactive';
  joinedAt: string;
  leftAt: string | null;
  business: {
    name: string;
    logoUrl: string | null;
  };
  program: {
    type: 'stamps' | 'points' | 'both' | null;
    version: number | null;
  } | null;
  lifecycle?: Array<{ type: string; occurredAt: string }>;
  balance?: {
    stamps: number;
    points: number;
  };
}

/**
 * CustomerMembershipPage - Displays detailed information about a customer's loyalty membership
 * 
 * Shows:
 * - Business identity and programme type
 * - Current stamp/point balance (if available from API)
 * - Loyalty progress towards next reward
 * - Earning rules and reward details (if available from API)
 * - Available business links
 * 
 * Handles loading, error, and empty states gracefully.
 */
export default function CustomerMembershipPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { membershipId } = useParams<{ membershipId: string }>();

  // Fetch membership details
  const { 
    data: membership, 
    isLoading: isLoadingMembership, 
    error: membershipError 
  } = useGetMembershipQuery(membershipId || '') as {
    data: BackendMembershipDetail | undefined;
    isLoading: boolean;
    error: unknown;
  };

  // Fetch available rewards for this membership
  const { 
    data: rewards, 
    isLoading: isLoadingRewards, 
    error: rewardsError 
  } = useGetAvailableRewardsQuery(membershipId || '') as {
    data: RewardInfo[] | undefined;
    isLoading: boolean;
    error: unknown;
  };

  // Fetch transaction history
  const { 
    data: transactions, 
    isLoading: isLoadingTransactions, 
    error: transactionsError 
  } = useGetTransactionHistoryQuery({ membershipId: membershipId || '', limit: 10 }) as {
    data: TransactionHistoryItem[] | undefined;
    isLoading: boolean;
    error: unknown;
  };

  // Track whether rewards and transactions endpoints are available
  // If they fail (endpoint doesn't exist), we should show "not available" not "no data"
  const rewardsLoaded = !isLoadingRewards && !rewardsError;
  const rewardsAvailable = rewardsLoaded && rewards !== undefined;
  const rewardsEmpty = rewardsAvailable && rewards.length === 0;
  
  const transactionsLoaded = !isLoadingTransactions && !transactionsError;
  const transactionsAvailable = transactionsLoaded && transactions !== undefined;
  const transactionsEmpty = transactionsAvailable && transactions.length === 0;

  // Combine loading states - only show loading if membership is loading
  // (rewards/transactions may not have endpoints, so don't block on them)
  const isLoading = isLoadingMembership;

  // Combine error states (but continue if we have membership data)
  const hasError = membershipError && !membership;

  // Get program type label for display
  function getProgramTypeLabel(programType: 'stamps' | 'points' | 'both' | null): string {
    if (!programType) return t('unknown');
    const labels: Record<'stamps' | 'points' | 'both', string> = {
      stamps: t('stampsProgram'),
      points: t('pointsProgram'),
      both: t('hybridProgram'),
    };
    return labels[programType] || t('unknown');
  }

  // Extract business info from membership (backend returns nested objects)
  const business = membership?.business || { name: '', logoUrl: null };
  const program = membership?.program || null;
  const programType = program?.type || null;
  // Balance may or may not be available depending on backend implementation
  const balance = membership?.balance || { stamps: 0, points: 0 };

  // Check if we have balance data (from API)
  const hasBalanceData = balance && (balance.stamps > 0 || balance.points > 0);

  // Get next reward info
  const availableRewards = rewards || [];
  const nextReward = availableRewards.length > 0 ? availableRewards[0] : null;

  // Calculate progress for display
  let progressDescription = '';
  if (programType === 'stamps' && nextReward?.stampsCost) {
    const required = nextReward.stampsCost;
    const earned = balance.stamps;
    const remaining = Math.max(0, required - earned);
    progressDescription = `${earned} of ${required} stamps earned. ${remaining} more to go.`;
  } else if (programType === 'points' && nextReward?.pointsCost) {
    const required = nextReward.pointsCost;
    const earned = balance.points;
    const remaining = Math.max(0, required - earned);
    progressDescription = `${earned} of ${required} points earned. ${remaining} more to go.`;
  } else if (programType === 'both') {
    // For hybrid programmes, show both if available
    const stampProgress = nextReward?.stampsCost ? `${balance.stamps} of ${nextReward.stampsCost} stamps` : null;
    const pointsProgress = nextReward?.pointsCost ? `${balance.points} of ${nextReward.pointsCost} points` : null;
    progressDescription = [stampProgress, pointsProgress].filter(Boolean).join(' and ') + ' earned.';
  }

  // Format join date
  const joinDate = membership?.joinedAt ? new Date(membership.joinedAt).toLocaleDateString() : '';

  // Extract business links (branches, etc.) - not currently available in API
  // This would require additional backend endpoints

  if (isLoading && !membership) {
    return (
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <p role="status" className="text-[var(--text-muted)]">{t('loading')}</p>
        </div>
      </main>
    );
  }

  if (hasError) {
    return (
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
              {t('membershipDetails')}
            </h1>
          </header>
          
          <Card className="bg-[var(--danger-light)] border-[var(--danger)] text-[var(--danger)] p-4">
            <p>{t('failedToLoadMembership')}</p>
            {membershipError && typeof membershipError === 'object' && 'data' in membershipError && (
              <p className="text-sm mt-2">{String((membershipError as any).data?.message || membershipError)}</p>
            )}
            <Button className="mt-4" onClick={() => navigate(paths.customerDashboard)}>
              {t('backToDashboard')}
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  if (!membership) {
    return (
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
              {t('membershipDetails')}
            </h1>
          </header>
          
          <Section title={t('notFound')}>
            <p className="text-[var(--text-muted)]">{t('membershipNotFound')}</p>
            <Button className="mt-4" onClick={() => navigate(paths.customerDashboard)}>
              {t('backToDashboard')}
            </Button>
          </Section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <a href="#workspace-main" className="sr-only">{t('skipToMainContent')}</a>
      <section id="workspace-main" className="workspace-page customer-membership">
        <div className="mx-auto max-w-screen-md w-full">
          {/* Header */}
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
              {t('membershipDetails')}
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
              {business.name} - {getProgramTypeLabel(programType)}
            </p>
          </header>

          {/* Business Identity Section */}
          <Section title={t('businessInformation')}>
            <div className="flex items-center gap-4">
              {/* Business logo or initial */}
              {business.logoUrl ? (
                <img 
                  src={business.logoUrl} 
                  alt={business.name}
                  className="w-16 h-16 object-cover rounded-[var(--radius-lg)] bg-[var(--subtle)]"
                />
              ) : (
                <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--brand)] font-bold text-xl">
                    {business.name.charAt(0)}
                  </span>
                </div>
              )}
              
              <div>
                <h2 className="font-semibold text-[var(--text)] text-lg">{business.name}</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  {getProgramTypeLabel(programType)}
                </p>
                {joinDate && (
                  <p className="text-[var(--text-muted)] text-sm mt-1">
                    {t('memberSince')} {joinDate}
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Balance Section - Only if we have actual balance data */}
          {hasBalanceData && (
            <Section title={t('currentBalance')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programType !== 'points' && (
                  <Card className="bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] text-sm">{t('stamps')}</span>
                      <span className="text-2xl font-bold text-[var(--brand)]">{balance.stamps}</span>
                    </div>
                  </Card>
                )}
                {programType !== 'stamps' && (
                  <Card className="bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] text-sm">{t('points')}</span>
                      <span className="text-2xl font-bold text-[var(--brand)]">{balance.points}</span>
                    </div>
                  </Card>
                )}
              </div>
              
              {/* Progress towards next reward */}
              {nextReward && (
                <Card className="mt-4 bg-[var(--surface)] p-4">
                  <p className="text-sm text-[var(--text-muted)] mb-2">{t('progressTowards')}</p>
                  <p className="text-[var(--text)] font-medium">{nextReward.name}</p>
                  {progressDescription && (
                    <p className="text-sm text-[var(--text-muted)] mt-2">{progressDescription}</p>
                  )}
                </Card>
              )}
            </Section>
          )}

          {/* Rewards Section */}
          {isLoadingRewards ? (
            <Section title={t('rewards')}>
              <p role="status" className="text-[var(--text-muted)]">{t('loading')}</p>
            </Section>
          ) : !rewardsAvailable ? (
            <Section title={t('rewards')}>
              <p className="text-[var(--text-muted)]">{t('rewardsNotAvailable')}</p>
            </Section>
          ) : rewardsEmpty ? (
            <Section title={t('rewards')}>
              <p className="text-[var(--text-muted)] text-center p-8">{t('noRewardsAvailable')}</p>
            </Section>
          ) : (
            <Section title={t('availableRewards')}>
              <div className="grid gap-4 md:grid-cols-2">
                {availableRewards.map((reward) => (
                  <Card key={reward.id} className="bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--text)]">{reward.name}</h3>
                        {reward.description && (
                          <p className="text-sm text-[var(--text-muted)] mt-1">{reward.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          {reward.stampsCost !== null && (
                            <span className="text-[var(--text-muted)]">
                              {reward.stampsCost} {t('stamps')}
                            </span>
                          )}
                          {reward.pointsCost > 0 && (
                            <span className="text-[var(--text-muted)]">
                              {reward.pointsCost} {t('points')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        reward.available 
                          ? 'bg-[var(--success-light)] text-[var(--success)]' 
                          : 'bg-[var(--subtle)] text-[var(--text-muted)]'
                      }`}>
                        {reward.available ? t('available') : t('notAvailable')}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* Transaction History Section */}
          {isLoadingTransactions ? (
            <Section title={t('transactionHistory')}>
              <p role="status" className="text-[var(--text-muted)]">{t('loading')}</p>
            </Section>
          ) : !transactionsAvailable ? (
            <Section title={t('transactionHistory')}>
              <p className="text-[var(--text-muted)]">{t('transactionHistoryNotAvailable')}</p>
            </Section>
          ) : transactionsEmpty ? (
            <Section title={t('transactionHistory')}>
              <p className="text-[var(--text-muted)] text-center p-8">{t('noTransactionsYet')}</p>
            </Section>
          ) : (
            <Section title={t('recentActivity')}>
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <Card key={tx.id} className="bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--text)]">
                          {tx.category === 'purchase' && t('purchase')}
                          {tx.category === 'manual_adjustment' && t('manualAdjustment')}
                          {tx.category === 'reversal' && t('reversal')}
                        </p>
                        {tx.branchName && (
                          <p className="text-sm text-[var(--text-muted)]">{tx.branchName}</p>
                        )}
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {new Date(tx.occurredAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {tx.stampsDelta !== 0 && (
                          <p className={`text-sm ${tx.stampsDelta > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                            {tx.stampsDelta > 0 ? '+' : ''}{tx.stampsDelta} {t('stamps')}
                          </p>
                        )}
                        {tx.pointsDelta !== 0 && (
                          <p className={`text-sm ${tx.pointsDelta > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                            {tx.pointsDelta > 0 ? '+' : ''}{tx.pointsDelta} {t('points')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* Back navigation */}
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate(paths.customerDashboard)}>
              {t('backToDashboard')}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
