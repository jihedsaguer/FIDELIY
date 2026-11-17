import { useState } from 'react';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { InfoCard, SummaryCard } from '../../../components/ui/InfoCard';
import { Section } from '../../../components/ui/Section';
import { useAuth } from '../../auth/AuthProvider';
import { getApiErrorMessage } from '../../auth/utils/authErrors';
import { paths } from '../../../app/routes/paths';
import { useGetBusinessSetupQuery } from '../../business-onboarding/api/businessOnboardingApi';
import { useGetCurrentProgramQuery } from '../api/programApi';
import { useListBranchesQuery } from '../api/branchApi';

export default function MerchantDashboardPage() {
  const { session, signOut } = useAuth();
  const setupQuery = useGetBusinessSetupQuery();
  const programQuery = useGetCurrentProgramQuery();
  const branchesQuery = useListBranchesQuery();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const setup = setupQuery.data;
  const business = setup?.business;
  const currentProgram = programQuery.data;
  const branches = branchesQuery.data?.branches ?? [];

  const isLoading = setupQuery.isLoading || setupQuery.isFetching || programQuery.isLoading || branchesQuery.isLoading;

  async function logout() {
    setPending(true);
    setError('');
    try {
      await signOut(paths.merchantLogin);
    } catch (logoutError) {
      setError(getApiErrorMessage(logoutError, 'We could not sign you out. Please try again.'));
    } finally {
      setPending(false);
    }
  }

  if (isLoading) {
    return <section className="workspace-page"><p role="status">Loading your business information…</p></section>;
  }

  return (
    <>
      <a href="#workspace-main" className="sr-only">Skip to main content</a>
      <section id="workspace-main" className="workspace-page merchant-workspace">
        <div className="workspace-header">
          <div>
            <h1>Welcome, {session?.user.name}</h1>
            <p className="workspace-subtitle">Merchant workspace</p>
          </div>
          <button className="quiet-button" disabled={pending} onClick={() => void logout()}>
            {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        
        {business ? (
          <>
            <Section title="Your business" subtitle="Information and setup status">
              <div className="dashboard-section-cards">
                <SummaryCard title="Business name" value={business.name} />
                {business.businessPhone && <SummaryCard title="Phone" value={business.businessPhone} />}
                <SummaryCard title="Branches" value={business.branchCount} />
                <SummaryCard 
                  title="Setup status" 
                  value={setup?.status === 'complete' ? '✓ Complete' : 'In progress'}
                />
              </div>
              {business.description && (
                <div className="info-card" style={{ marginTop: 'var(--space-4)' }}>
                  <span className="info-card-label">Description</span>
                  <span className="info-card-value">{business.description}</span>
                </div>
              )}
            </Section>
            
            {branches.length > 0 && (
              <Section title="Branches" subtitle="Your business locations">
                <div className="dashboard-section-cards">
                  {branches.slice(0, 3).map((branch) => (
                    <SummaryCard key={branch.id} title={branch.name} value={branch.address ?? 'No address'} />
                  ))}
                  {branches.length > 3 && (
                    <SummaryCard title="Additional branches" value={`+${branches.length - 3} more`} />
                  )}
                </div>
              </Section>
            )}

            <Section title="Loyalty Programme" subtitle="Your current programme">
              {currentProgram ? (
                <div className="dashboard-section-cards">
                  <SummaryCard title="Programme name" value={currentProgram.name ?? 'Unnamed Programme'} />
                  <SummaryCard title="Type" value={currentProgram.type} />
                  <SummaryCard title="Version" value={String(currentProgram.version)} />
                  <SummaryCard title="Status" value={currentProgram.status} />
                </div>
              ) : (
                <InfoCard label="Status" value="No programme configured" variant="muted" />
              )}
            </Section>

            <Section title="Setup">
              {setup?.status !== 'complete' && (
                <a href={paths.merchantOnboarding} className="choice-card">
                  <span>Complete your business setup</span>
                  <strong>Continue</strong>
                </a>
              )}
              {setup?.status === 'complete' && (
                <p className="field-hint">✓ Your business setup is complete. You can now operate with customers.</p>
              )}
            </Section>
          </>
        ) : (
          <>
            <p className="panel-copy">Get started by setting up your business.</p>
            <div className="task-list">
              <a className="task-row" href={paths.merchantOnboarding}>
                <span>Create your business</span>
                <strong>Start</strong>
              </a>
            </div>
          </>
        )}

        <Section title="Manage your business">
          <div className="task-list">
            {business && business.branchCount > 0 && (
              <a className="task-row" href={paths.merchantBranches}>
                <span>Manage branches</span>
                <strong>View all</strong>
              </a>
            )}
            <a className="task-row" href={paths.merchantPrograms}>
              <span>Configure loyalty programme</span>
              <strong>{currentProgram ? 'Edit' : 'Create'}</strong>
            </a>
            {business && (
              <a className="task-row" href={paths.merchantScan}>
                <span>Scan Customer QR</span>
                <strong>Process sale</strong>
              </a>
            )}
          </div>
        </Section>

        <Section title="Available features" subtitle="What you can do with FIDELIY">
          <div className="dashboard-section-cards">
            <div className="info-card feature-card">
              <div className="info-card-label">Business setup & QR resolution</div>
              <div className="info-card-value" style={{ marginTop: 'var(--space-2)' }}>
                Configure your business information, branches, and resolve customer QR credentials.
              </div>
            </div>
            <div className="info-card feature-card">
              <div className="info-card-label">Branch management</div>
              <div className="info-card-value" style={{ marginTop: 'var(--space-2)' }}>
                Create, edit, and delete your business branches. At least one branch is required.
              </div>
            </div>
            <div className="info-card feature-card">
              <div className="info-card-label">Loyalty programme configuration</div>
              <div className="info-card-value" style={{ marginTop: 'var(--space-2)' }}>
                Set up stamp-based, points-based, or combined loyalty programmes with custom rewards.
              </div>
            </div>
          </div>
        </Section>

        <FormFeedback error={error} />
      </section>
    </>
  );
}
