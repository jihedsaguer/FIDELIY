import { useI18n } from '../../../shared/i18n/i18n';
import { Button, Card, Section } from '../../../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { paths } from '../../../app/routes/paths';
import { Building2, Printer, Store, User, Users, LogOut } from 'lucide-react';

export default function MerchantMorePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(paths.merchantLogin);
    } catch {
      // Ignore sign out errors
    }
  };

  const navigationItems = [
    {
      key: 'customers',
      to: paths.merchantCustomers,
      icon: Users,
      title: t('customers'),
      description: t('allYourCustomers'),
    },
    {
      key: 'businessProfile',
      to: paths.merchantBusinessProfile,
      icon: Building2,
      title: t('businessProfile'),
      description: t('manageYourBusinessInformation'),
    },
    {
      key: 'businessQr',
      to: paths.merchantBusinessQr,
      icon: Printer,
      title: t('businessQr'),
      description: t('businessQrDescription'),
    },
    {
      key: 'branches',
      to: paths.merchantBranches,
      icon: Store,
      title: t('branches'),
      description: t('manageYourBranches'),
    },
    {
      key: 'settings',
      to: paths.merchantSettings,
      icon: User,
      title: t('settings'),
      description: t('manageYourAccount'),
    },
  ];

  return (
    <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-screen-md w-full">
        <header className="mb-8">
          <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
            {t('more')}
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
            {t('merchantSettingsAndProfile')}
          </p>
        </header>

        <Section title={t('settings')}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className="block rounded-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                <Card className="p-6 hover:bg-[var(--subtle)] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
                      <item.icon className="h-6 w-6 text-[var(--brand)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[var(--text)] font-medium">{item.title}</h3>
                      <p className="text-[var(--text-muted)] text-sm">{item.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Section>

        <Section title={t('accountActions')}>
          <Card className="p-6">
            <button
              className="w-full flex items-center justify-between p-2 rounded-lg text-start hover:bg-[var(--subtle)] transition-colors"
              onClick={handleSignOut}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[var(--danger-light)] border border-[var(--danger)] flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-[var(--danger)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[var(--danger)] font-medium">{t('signOut')}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{t('endCurrentSession')}</p>
                </div>
              </div>
            </button>
          </Card>
        </Section>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate(paths.merchantDashboard)}>
            {t('backToDashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
}
