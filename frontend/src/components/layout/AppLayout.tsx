import { NavLink, Outlet } from 'react-router-dom';
import { LanguageSwitcher } from '../../shared/i18n/LanguageSwitcher';
import { useI18n } from '../../shared/i18n/i18n';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../features/auth/AuthProvider';
import { ScannerProvider, useScanner } from '../../features/loyalty/context/ScannerContext';
import { ScannerModal } from '../../features/loyalty/components/ScannerModal';
import { Award, LayoutDashboard, MoreHorizontal, QrCode } from 'lucide-react';
import { paths } from '../../app/routes/paths';

type Workspace = 'customer' | 'merchant';

// Customer Bottom Navigation
function CustomerBottomNav() {
  const { t } = useI18n();

  const navItems = [
    { to: '/customer', label: t('home') },
    { to: '/customer/qr', label: t('myQr') },
    { to: '/customer/activity', label: t('activity') },
  ];

  return (
    <nav className="bottom-nav" aria-label="Customer navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/customer'}
          className={({ isActive }) =>
            `bottom-nav-item text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors ${
              isActive ? 'active' : ''
            }`
          }
        >
          <span className="text-sm font-semibold">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// Merchant mobile bottom navigation (< md). Desktop uses the Sidebar.
function MerchantBottomNav() {
  const { t } = useI18n();
  const { openScanner } = useScanner();

  const itemClasses =
    'gap-1 rounded-[var(--radius-lg)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]';
  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `${itemClasses} ${isActive ? 'active text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--brand)]'}`;

  return (
    <div className="md:hidden">
      <nav className="bottom-nav" aria-label={t('merchantSpace')}>
        <NavLink to={paths.merchantDashboard} end className={linkClasses}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-xs font-semibold">{t('home')}</span>
        </NavLink>
        <NavLink to={paths.merchantPrograms} className={linkClasses}>
          <Award className="w-5 h-5" />
          <span className="text-xs font-semibold">{t('programs')}</span>
        </NavLink>
        <button
          type="button"
          onClick={openScanner}
          className={`flex-1 grid place-items-center min-h-[44px] text-[var(--text-muted)] hover:text-[var(--brand)] ${itemClasses}`}
        >
          <QrCode className="w-5 h-5" />
          <span className="text-xs font-semibold">{t('scan')}</span>
        </button>
        <NavLink to={paths.merchantMore} className={linkClasses}>
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-xs font-semibold">{t('more')}</span>
        </NavLink>
      </nav>
    </div>
  );
}

// Merchant Layout with Scanner Modal
function MerchantLayoutWithScanner() {
  const { signOut } = useAuth();
  const { isScannerOpen, closeScanner } = useScanner();

  return (
    <>
      <div className="relative min-h-screen bg-[var(--surface)]">
        <Sidebar workspace="merchant" onSignOut={() => signOut()} />
        <div className="ml-0 md:ml-16 lg:ml-64 transition-all duration-300">
          <header className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)]">
            <div className="flex items-center justify-end h-16 px-4 md:px-6 lg:px-8">
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
              </div>
            </div>
          </header>
          <main className="p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8" id="main-content">
            <Outlet />
          </main>
        </div>
      </div>
      <MerchantBottomNav />
      
      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={closeScanner}
      />
    </>
  );
}

// Customer Layout
function CustomerLayout() {
  return (
    <div className="app-shell app-shell--customer bg-[var(--surface)] min-h-screen flex flex-col">
      <header className="app-bar sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)]">
        <a className="brand-light" href="/" aria-label="FIDELIY home">
          FIDELIY<span className="text-[var(--brand)]">.</span>
        </a>
        <div className="app-bar-actions">
          <LanguageSwitcher />
        </div>
      </header>
      <main className="app-main flex-1" id="main-content">
        <Outlet />
      </main>
      <CustomerBottomNav />
    </div>
  );
}

export function AppLayout({ workspace }: { workspace: Workspace }) {
  if (workspace === 'merchant') {
    return (
      <ScannerProvider>
        <MerchantLayoutWithScanner />
      </ScannerProvider>
    );
  }

  // Customer layout
  return <CustomerLayout />;
}
