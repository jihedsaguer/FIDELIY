import { useI18n } from '../../../shared/i18n/i18n';
import { Button, Card, Section, FormFeedback } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useGetBusinessSetupQuery } from '@/features/business-onboarding/api/businessOnboardingApi';
import { User, Building2, Mail, Phone } from 'lucide-react';
import type { BusinessSetupResponse } from '@/features/business-onboarding/api/businessOnboardingApi';

export default function MerchantSettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session, status: authStatus } = useAuth();
  const setupQuery = useGetBusinessSetupQuery();

  const businessSetup = setupQuery.data as BusinessSetupResponse | undefined;
  const business = businessSetup?.business;

  const isLoading = setupQuery.isLoading || setupQuery.isFetching || authStatus === 'loading';
  const hasError = setupQuery.isError || authStatus === 'error';

  if (isLoading) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full space-y-6">
          <div className="h-10 w-64 bg-[var(--subtle)] rounded-lg animate-pulse" />
          <div className="h-40 w-full bg-[var(--subtle)] rounded-lg animate-pulse" />
          <div className="h-40 w-full bg-[var(--subtle)] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <Card className="p-6 text-center">
            <h2 className="text-[var(--danger)] text-lg font-semibold mb-2">{t('error')}</h2>
            <FormFeedback error={t('failedToLoad')} />
            <Button variant="outline" onClick={() => navigate('/merchant')} className="mt-4">
              {t('backToDashboard')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-screen-md w-full">
        <header className="mb-8">
          <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
            {t('settings')}
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
            {t('manageYourAccount')}
          </p>
        </header>

        {/* Account Information Section */}
        <Section title={t('accountInformation')}>
          {session ? (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
                    <User className="h-6 w-6 text-[var(--text)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[var(--text)] font-medium">{session.user.name}</h3>
                    <p className="text-[var(--text-muted)] text-sm">{t('accountName')}</p>
                  </div>
                </div>

                {session.user.email && (
                  <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
                    <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-[var(--text)] text-sm">{session.user.email}</p>
                      <p className="text-[var(--text-muted)] text-xs">{t('email')}</p>
                    </div>
                  </div>
                )}

                {session.user.phoneNumber && (
                  <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
                    <Phone className="h-5 w-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-[var(--text)] text-sm">{session.user.phoneNumber}</p>
                      <p className="text-[var(--text-muted)] text-xs">{t('phoneNumber')}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-[var(--text-muted)] text-sm">{t('noSessionData')}</p>
            </Card>
          )}
        </Section>

        {/* Business Information Section */}
        {business && (
          <Section title={t('business')} subtitle={t('businessInformation')}>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[var(--text)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[var(--text)] font-medium">{business.name}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{t('businessName')}</p>
                </div>
              </div>

              {business.description && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-sm">{business.description}</p>
                </div>
              )}

              {business.businessPhone && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-[var(--text)] text-sm">{business.businessPhone}</p>
                  <p className="text-[var(--text-muted)] text-xs">{t('phone')}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-[var(--text-muted)] text-xs">
                  {t('branchCount')}: {business.branchCount}
                </p>
              </div>
            </Card>
          </Section>
        )}

        {/* Navigation to Branch Management */}
        <Section title={t('manage')}>
          <Card
            className="p-4 cursor-pointer hover:bg-[var(--subtle)] transition-colors"
            onClick={() => navigate('/merchant/branches')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[var(--text)]" />
                </div>
                <div>
                  <h3 className="text-[var(--text)] font-medium">{t('branches')}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{t('manageYourBranches')}</p>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/merchant')}>
            {t('backToDashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
}
