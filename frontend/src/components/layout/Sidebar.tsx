import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/i18n';
import { paths } from '../../app/routes/paths';
import { useScanner } from '../../features/loyalty/context/ScannerContext';
import {
  Award,
  Building2,
  LayoutDashboard,
  Store,
  QrCode,
  Menu,
  X,
  LogOut,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';

type Workspace = 'customer' | 'merchant';

const merchantMainNavItems = [
  { to: paths.merchantDashboard, labelKey: 'home', icon: LayoutDashboard },
  { to: paths.merchantPrograms, labelKey: 'programs', icon: Award },
] as const;

const merchantMoreItems = [
  { to: paths.merchantBusinessProfile, labelKey: 'businessProfile', icon: Building2 },
  { to: paths.merchantBranches, labelKey: 'branches', icon: Store },
  { to: paths.merchantSettings, labelKey: 'settings', icon: User },
] as const;

interface SidebarProps {
  workspace: Workspace;
  onSignOut?: () => void;
}

export function Sidebar({ workspace, onSignOut }: SidebarProps) {
  const { t } = useI18n();
  const location = useLocation();
  const { openScanner } = useScanner();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  if (workspace === 'customer') {
    return null;
  }

  const [isMoreExpanded, setIsMoreExpanded] = useState(false);

  return (
    <>
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[99]"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-[100] bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${isMobile && isCollapsed ? '-translate-x-full' : 'translate-x-0'}`}
        aria-label={t('merchantSpace')}
      >
        <div className="p-4 border-b border-[var(--border)]">
          {!isCollapsed && (
            <NavLink
              className="brand-light flex items-center gap-2 text-lg font-bold"
              to="/"
              aria-label="FIDELIY home"
            >
              FIDELIY<span className="text-[var(--brand)]">.</span>
            </NavLink>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--glass-brand)]">
              <span className="text-[var(--brand)] font-bold text-xl">F</span>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {merchantMainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || 
                            (item.to === paths.merchantDashboard && location.pathname === '/merchant');
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] transition-all duration-200 ${
                  isActive 
                    ? 'bg-[var(--glass-brand)] text-[var(--brand)]' 
                    : 'text-[var(--text-muted)] hover:bg-[var(--subtle)] hover:text-[var(--text)]'
                }`}
                end={item.to === paths.merchantDashboard}
                onClick={() => isMobile && setIsCollapsed(true)}
              >
                <span className="flex items-center justify-center w-6 h-6">
                  <Icon className="w-5 h-5" />
                </span>
                {!isCollapsed && (
                  <span className="text-sm font-medium">{t(item.labelKey)}</span>
                )}
              </NavLink>
            );
          })}
          
          {/* Scanner button - opens modal instead of navigating (prominent central action) */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left bg-[var(--glass-brand)] text-[var(--brand)] hover:bg-[var(--glass-brand-strong)]"
            onClick={() => {
              openScanner();
              if (isMobile) setIsCollapsed(true);
            }}
          >
            <span className="flex items-center justify-center w-6 h-6">
              <QrCode className="w-5 h-5" />
            </span>
            {!isCollapsed && (
              <span className="text-sm font-medium">{t('scan')}</span>
            )}
          </button>
          
          {/* More section - expandable */}
          <div className="flex flex-col gap-1">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-left text-[var(--text-muted)] hover:bg-[var(--subtle)] hover:text-[var(--text)]"
              onClick={() => setIsMoreExpanded(!isMoreExpanded)}
              aria-expanded={isMoreExpanded}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6">
                  <MoreHorizontal className="w-5 h-5" />
                </span>
                {!isCollapsed && (
                  <span className="text-sm font-medium">{t('more')}</span>
                )}
              </div>
              {!isCollapsed && (
                <span className="flex items-center justify-center w-6 h-6">
                  {isMoreExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              )}
            </button>
            
            {/* More items - shown when expanded */}
            {isMoreExpanded && !isCollapsed && (
              <div className="ml-6 flex flex-col gap-1">
                {merchantMoreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.to);
                  
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'bg-[var(--glass-brand)] text-[var(--brand)]' 
                          : 'text-[var(--text-muted)] hover:bg-[var(--subtle)] hover:text-[var(--text)]'
                      }`}
                      onClick={() => {
                        setIsMoreExpanded(false);
                        if (isMobile) setIsCollapsed(true);
                      }}
                    >
                      <span className="flex items-center justify-center w-5 h-5">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-medium">{t(item.labelKey)}</span>
                    </NavLink>
                  );
                })}
                
                {/* Sign Out in More menu */}
                <button
                  key="signOut"
                  onClick={() => {
                    onSignOut?.();
                    setIsMoreExpanded(false);
                    if (isMobile) setIsCollapsed(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--danger)] hover:bg-[var(--danger-light)] transition-all duration-200"
                >
                  <span className="flex items-center justify-center w-5 h-5">
                    <LogOut className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-medium">{t('signOut')}</span>
                </button>
              </div>
            )}
          </div>
        </nav>



        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 w-6 h-6 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center shadow-md hover:bg-[var(--subtle)] transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}

export default Sidebar;
