import { NavLink, Outlet } from 'react-router-dom';
import { LanguageSwitcher } from '../../shared/i18n/LanguageSwitcher';
import { useI18n } from '../../shared/i18n/i18n';
import { paths } from '../../app/routes/paths';

type Workspace = 'customer' | 'merchant';

const navItems = {
  customer: [{ to: '/customer', label: 'Accueil' }],
  merchant: [
    { to: paths.merchantDashboard, label: 'Accueil', icon: 'home' },
    { to: paths.merchantPrograms, label: 'Programmes', icon: 'program' },
    { to: paths.merchantBranches, label: 'Branches', icon: 'branch' },
    { to: paths.merchantOnboarding, label: 'Entreprise', icon: 'business' },
  ],
} as const;

// Professional SVG icons for merchant navigation
const IconHome = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconProgram = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconBranch = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.69l-3.76-3.76a1 1 0 0 1 .71-.29h10.08a1 1 0 0 1 .71.29z" />
    <path d="M12 2.31v2.3" />
    <path d="M12 7.31v2.3" />
    <path d="M12 12.31v2.3" />
    <path d="M12 17.31v2.3" />
    <path d="M3.64 11.31h2.3" />
    <path d="M18.06 11.31h2.3" />
    <path d="M5.94 7.31h2.3" />
    <path d="M15.76 7.31h2.3" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconBusiness = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const iconComponents: Record<string, React.FC> = {
  home: IconHome,
  program: IconProgram,
  branch: IconBranch,
  business: IconBusiness,
};

function MerchantSidebar() {
  const { t } = useI18n();
  
  return (
    <aside className="sidebar-nav" aria-label={t('merchantSpace')}>
      <div className="sidebar-nav-header">
        <NavLink className="brand" to="/" aria-label="FIDELIY home">FIDELIY<span>.</span></NavLink>
      </div>
      <ul className="sidebar-nav-list">
        {navItems.merchant.map((item) => {
          const ItemIcon = iconComponents[item.icon];
          return (
            <li key={item.to} className="sidebar-nav-item">
              <NavLink to={item.to} end={item.to === paths.merchantDashboard}>
                <span className="sidebar-nav-item-icon" aria-hidden="true">
                  <ItemIcon />
                </span>
                <span className="sidebar-nav-item-label">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function AppLayout({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  
  if (workspace === 'merchant') {
    return (
      <div className="sidebar-layout merchant-workspace">
        <MerchantSidebar />
        <div className="sidebar-main">
          <header className="app-bar">
            <LanguageSwitcher />
          </header>
          <main className="app-main" id="main-content"><Outlet /></main>
          <nav className="bottom-nav" aria-label={t('merchantSpace')}>
            {navItems.merchant.map((item) => {
              const ItemIcon = iconComponents[item.icon];
              return (
                <NavLink key={item.to} to={item.to} end={item.to === paths.merchantDashboard}>
                  <span className="sidebar-nav-item-icon" aria-hidden="true">
                    <ItemIcon />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell app-shell--${workspace}`}>
      <header className="app-bar">
        <NavLink className="brand" to="/" aria-label="FIDELIY home">FIDELIY<span>.</span></NavLink>
        <LanguageSwitcher />
      </header>
      <main className="app-main" id="main-content"><Outlet /></main>
      <nav className="bottom-nav" aria-label={t('customerSpace')}>
        {navItems.customer.map((item) => <NavLink key={item.to} to={item.to} end>{item.label}</NavLink>)}
      </nav>
    </div>
  );
}
