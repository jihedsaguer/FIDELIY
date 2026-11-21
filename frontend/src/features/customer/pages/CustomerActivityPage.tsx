import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../shared/i18n/i18n';
import { Section } from '../../../components/ui/Section';
import { ActivityList } from '../components/ActivityList';
import { useGetMembershipsWithBalancesQuery } from '../../loyalty/api';
import { paths } from '../../../app/routes/paths';

/**
 * CustomerActivityPage - Displays customer's loyalty transaction history
 *
 * NOTE: The transaction history endpoint (GET /customers/memberships/:membershipId/transactions)
 * does not currently exist in the backend. When implemented, this page will need to be updated
 * to fetch and display genuine transaction data.
 *
 * Current behavior: Shows "Activity not available" state since the required backend endpoint
 * is not yet implemented. Also properly handles no memberships and no active memberships states.
 *
 * Future: Complete Activity requires aggregating transactions across all customer memberships
 * in a backend task.
 */
export default function CustomerActivityPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  
  // Get all memberships to check if we have any
  const { 
    data: memberships = [], 
    isLoading: isLoadingMemberships,
    error: membershipsError 
  } = useGetMembershipsWithBalancesQuery();

  // Determine states
  const isLoading = isLoadingMemberships;
  const hasMemberships = memberships.length > 0;
  const hasActiveMemberships = memberships.some(m => m.status === 'active');
  
  // Error: memberships failed to load
  const error = membershipsError ? String(membershipsError) : null;

  // Transaction history is currently unavailable because the backend endpoint
  // GET /customers/memberships/:membershipId/transactions does not exist

  // Show loading state
  if (isLoading) {
    return (
      <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <header className="mb-8">
            <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
              {t('activity')}
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
              {t('yourRecentActivity')}
            </p>
          </header>

          <Section title="">
            <ActivityList isLoading={true} activities={[]} />
          </Section>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(paths.customerDashboard)}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
            >
              {t('backToDashboard')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Show error if memberships failed to load
  if (error) {
    return (
      <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <header className="mb-8">
            <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
              {t('activity')}
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
              {t('yourRecentActivity')}
            </p>
          </header>

          <Section title="">
            <ActivityList 
              activities={[]}
              error={error}
              onRetry={() => window.location.reload()}
            />
          </Section>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(paths.customerDashboard)}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
            >
              {t('backToDashboard')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // No memberships - show empty state
  if (!hasMemberships) {
    return (
      <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <header className="mb-8">
            <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
              {t('activity')}
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
              {t('yourRecentActivity')}
            </p>
          </header>

          <Section title="">
            <ActivityList 
              activities={[]}
              error={t('noMembershipsMessage')}
              showEmptyState={false}
            />
          </Section>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(paths.customerDashboard)}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
            >
              {t('backToDashboard')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // No active memberships - show empty state
  if (!hasActiveMemberships) {
    return (
      <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <header className="mb-8">
            <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
              {t('activity')}
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
              {t('yourRecentActivity')}
            </p>
          </header>

          <Section title="">
            <ActivityList 
              activities={[]}
              error={t('noActiveMembershipsMessage')}
              showEmptyState={false}
            />
          </Section>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(paths.customerDashboard)}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
            >
              {t('backToDashboard')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Transaction history is unavailable because the backend endpoint does not exist
  // GET /customers/memberships/:membershipId/transactions
  // When implemented, this page should be updated to fetch and display transactions
  return (
    <main className="flex-1 bg-[var(--surface)] p-4 md:p-8">
      <div className="mx-auto max-w-screen-md w-full">
        <header className="mb-8">
          <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
            {t('activity')}
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
            {t('yourRecentActivity')}
          </p>
        </header>

        <Section title="">
          <ActivityList 
            activities={[]}
            error={t('activityNotAvailable')}
            showEmptyState={false}
          />
        </Section>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(paths.customerDashboard)}
            className="text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
          >
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    </main>
  );
}
