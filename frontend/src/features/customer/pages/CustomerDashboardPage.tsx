import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
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
import { LoyaltyCard } from '../components';

export default function CustomerDashboardPage() {
  const { session, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  
  const { data: membershipsData, isLoading: isLoadingMemberships, error: membershipsError } =
    useGetMembershipsWithBalancesQuery(undefined, {
      // The merchant cannot push updates: refresh on mount, focus and reconnect (no polling).
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    });
  const { data: qrData, isLoading: isLoadingQr, error: qrError } =
    useGetPersonalQrQuery();
  // 404 means "not issued yet", not a failure.
  const qrStatusFailed = Boolean(qrError) && !(typeof qrError === 'object' && qrError !== null && 'status' in qrError && qrError.status === 404);

  // Balance and rewards come from the API; nothing is defaulted client-side.
  const memberships = membershipsData ?? [];

  // Filter to only active memberships
  const activeMemberships = memberships.filter(m => m.status === 'active');
  
  // Sort by joinedAt timestamp (most recent first)
  // Deterministic tie-breaking: if timestamps are equal, sort by ID, then by business name
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
    return a.business.name.localeCompare(b.business.name);
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
      setError(getApiErrorMessage(logoutError, t('signOutError')));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <a href="#workspace-main" className="sr-only">{t('skipToMainContent')}</a>
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
      
      <Section title={t('customerAccountTitle')}>
        <p className="panel-copy text-[var(--text-muted)]">{t('customerAccountIntro')}</p>
      </Section>

      {hasActiveMemberships && (
        <>
          {/* Personal QR status: GET never returns the secret, so no QR is rendered here. */}
          <Section title={t('yourQRCode')} subtitle={t('showQRToMerchant')}>
            <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 text-start">
                <QrCode className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                <p className="text-[var(--text)]">
                  {isLoadingQr
                    ? t('loading')
                    : qrData?.active
                      ? t('personalQrStatusActive')
                      : qrStatusFailed
                        ? t('personalQrLoadError')
                        : t('personalQrNotIssuedTitle')}
                </p>
              </div>
              <Link
                to={paths.customerQr}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-lg)] border border-[var(--brand)] bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] sm:w-auto"
              >
                {t('personalQrOpen')}
              </Link>
            </div>
          </Section>

          {/* Featured Membership */}
          {featuredMembership && (
            <Section title={t('yourLoyaltyCards')} subtitle={t('loyaltyCardsSubtitle')}>
              {/* Featured membership - displayed prominently */}
              <div className="mb-6">
                <LoyaltyCard 
                  key={featuredMembership.id} 
                  membership={featuredMembership} 
                  isFeatured 
                />
              </div>
              
              {/* Remaining memberships */}
              {remainingMemberships.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {remainingMemberships.map((membership) => (
                    <LoyaltyCard 
                      key={membership.id} 
                      membership={membership}
                    />
                  ))}
                </div>
              )}
            </Section>
          )}
        </>
      )}

      {!hasActiveMemberships && !isLoadingMemberships && (
        <Section title={t('getStartedTitle')} subtitle={t('getStartedSubtitle')}>
          <div className="info-card bg-[var(--subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <div className="text-[var(--text-muted)]">
              {t('getStartedBody')}
            </div>
          </div>
        </Section>
      )}

      {(membershipsError || qrStatusFailed) && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-[var(--radius-lg)] p-4 text-[var(--danger)]">
          {t('loyaltyDataLoadError')}
        </div>
      )}

      {isLoadingMemberships && (
        <p role="status" className="text-[var(--text-muted)]">{t('loadingProgrammes')}</p>
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
