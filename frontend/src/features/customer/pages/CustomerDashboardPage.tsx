import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Section } from '../../../components/ui/Section';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../../shared/i18n/i18n';
import { getApiErrorMessage } from '../../auth/utils/authErrors';
import { paths } from '../../../app/routes/paths';
import {
  useGetMembershipsWithBalancesQuery,
  useGetPersonalQrQuery,
} from '../../loyalty/api';
import { LoyaltyCard, QRCodeDisplay } from '../components';
import type { DisplayMembership } from '../types';

export default function CustomerDashboardPage() {
  const { session, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  
  const { data: membershipsData, isLoading: isLoadingMemberships, error: membershipsError } =
    useGetMembershipsWithBalancesQuery();
  const { data: qrData, isLoading: isLoadingQr, error: qrError } =
    useGetPersonalQrQuery();

  // Add default thresholds for display if not provided by API
  const memberships: DisplayMembership[] = (membershipsData ?? []).map(m => ({
    ...m,
    stampThreshold: 10, // Default stamp threshold for display
    nextRewardThreshold: 100, // Default points threshold for display
  }));

  // Filter to only active memberships
  const activeMemberships = memberships.filter(m => m.status === 'active');
  
  // Sort by joinedAt timestamp (most recent first)
  // Deterministic tie-breaking: if timestamps are equal, sort by ID, then by businessName
  const sortedMemberships = [...activeMemberships].sort((a, b) => {
    const aDate = new Date(a.joinedAt);
    const bDate = new Date(b.joinedAt);
    
    // Compare timestamps (descending - most recent first)
    if (aDate.getTime() > bDate.getTime()) return -1;
    if (aDate.getTime() < bDate.getTime()) return 1;
    
    // Tie-breaking: compare by ID (deterministic)
    if (a.id > b.id) return -1;
    if (a.id < b.id) return 1;
    
    // Final tie-breaking: compare by businessName (deterministic)
    return a.businessName.localeCompare(b.businessName);
  });

  const featuredMembership = sortedMemberships[0];
  const remainingMemberships = sortedMemberships.slice(1);
  const hasActiveMemberships = activeMemberships.length > 0;

  async function logout() {
    setPending(true);
    setError('');
    try {
      await signOut(paths.home);
    } catch (logoutError) {
      setError(getApiErrorMessage(logoutError, 'We could not sign you out. Please try again.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <a href="#workspace-main" className="sr-only">Skip to main content</a>
      <section id="workspace-main" className="workspace-page customer-wallet">
        <div className="experience-heading">
          <div>
            <p className="eyebrow text-[var(--brand)]">{t('customerSpace')}</p>
            <h1 className="text-[var(--text)]">
              {t('welcome')}{session?.user.name?.trim() ? `, ${session.user.name}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(paths.customerProfile)}
              aria-label={t('profile')}
            >
              {t('profile')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => void logout()}
              disabled={pending}
              aria-label={pending ? t('signingOut') : t('signOut')}
            >
              {pending ? t('signingOut') : t('signOut')}
            </Button>
          </div>
        </div>
      
      <Section title="Your account">
        <p className="panel-copy text-[var(--text-muted)]">You're ready to participate in loyalty programmes with local businesses.</p>
      </Section>

      {hasActiveMemberships && (
        <>
          {/* Personal QR Code */}
          <Section title="Your QR Code" subtitle="Show this to merchants to join programmes and earn rewards">
            <div className="flex justify-center">
              {qrData?.credential ? (
                <>
                  <div className="bg-[var(--surface)] rounded-[var(--radius-xl)] border border-[var(--border)] p-6 shadow-sm">
                    <div className="flex justify-center mb-4">
                      <QRCodeDisplay value={qrData.credential} size={150} />
                    </div>
                    <p className="text-center text-[var(--text-muted)] text-sm">
                      Scan this code at participating businesses
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-[var(--surface)] rounded-[var(--radius-xl)] border border-[var(--border)] p-6 text-center">
                  <Button variant="outline" isLoading={isLoadingQr}>
                    Generate QR Code
                  </Button>
                </div>
              )}
            </div>
          </Section>

          {/* Featured Membership */}
          {featuredMembership && (
            <Section title="Your Loyalty Cards" subtitle="Loyalty programmes you're enrolled in">
              {/* Featured membership - displayed prominently */}
              <div className="mb-6">
                <LoyaltyCard 
                  key={featuredMembership.id} 
                  membership={featuredMembership} 
                  isFeatured 
                  onClick={() => navigate(`/customer/memberships/${featuredMembership.id}`)}
                />
              </div>
              
              {/* Remaining memberships */}
              {remainingMemberships.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {remainingMemberships.map((membership) => (
                    <LoyaltyCard 
                      key={membership.id} 
                      membership={membership}
                      onClick={() => navigate(`/customer/memberships/${membership.id}`)}
                    />
                  ))}
                </div>
              )}
            </Section>
          )}
        </>
      )}

      {!hasActiveMemberships && !isLoadingMemberships && (
        <Section title="Get started" subtitle="Join loyalty programmes">
          <div className="info-card bg-[var(--subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <div className="text-[var(--text-muted)]">
              Visit a participating business and scan their QR code to join their loyalty programme.
            </div>
          </div>
        </Section>
      )}

      {(membershipsError || qrError) && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-[var(--radius-lg)] p-4 text-[var(--danger)]">
          Failed to load your loyalty data. Please try again.
        </div>
      )}

      {isLoadingMemberships && (
        <p role="status" className="text-[var(--text-muted)]">Loading your programmes...</p>
      )}
      
      {error && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-[var(--radius-lg)] p-4 text-[var(--danger)]">
          {error}
        </div>
      )}
    </section>
    </>
  );
}
