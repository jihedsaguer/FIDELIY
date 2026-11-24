import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { paths } from '../../../app/routes/paths';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { useI18n, type MessageKey } from '../../../shared/i18n/i18n';
import { useAuth } from '../../auth/AuthProvider';
import { useDisclosure } from '../hooks/useDisclosure';
import { LanguageToggle } from './LanguageToggle';

export const LANDING_ANCHORS: Array<{ href: string; label: MessageKey }> = [
  { href: '#features', label: 'landingNavFeatures' },
  { href: '#how-it-works', label: 'landingNavHow' },
  { href: '#estimate', label: 'landingNavEstimate' },
  { href: '#faq', label: 'landingNavFaq' },
];

/**
 * Floating pill navigation. From 768px: anchors, FR/ع, session-aware
 * "Connexion" or "Mon espace", and the register CTA. Below 768px: wordmark,
 * CTA and a menu button (disclosure; Escape closes and returns focus).
 * Session handling mirrors the former home page: a session shows the customer
 * and merchant spaces, a session error offers a retry.
 */
export function LandingNav() {
  const { t } = useI18n();
  const { status, session, refreshSession } = useAuth();
  const menu = useDisclosure();
  const space = useDisclosure();
  const hasSession = Boolean(session) && status !== 'error';

  const spaceLinks = (onNavigate?: () => void) => (
    <>
      <Link to={paths.customerDashboard} onClick={onNavigate} className="landing-menu-link">
        {t('landingCustomerSpace')}
      </Link>
      <Link to={paths.merchantDashboard} onClick={onNavigate} className="landing-menu-link">
        {t('landingMerchantSpace')}
      </Link>
    </>
  );

  return (
    <header className="landing-nav-wrap">
      <nav aria-label={t('landingNavLabel')} className="landing-nav">
        <Link to={paths.home} aria-label={t('landingHomeLink')} className="landing-wordmark">
          FIDELIY<span aria-hidden="true">.</span>
        </Link>

        <ul className="landing-nav-anchors">
          {LANDING_ANCHORS.map((anchor) => (
            <li key={anchor.href}>
              <a href={anchor.href} className="landing-nav-link">
                {t(anchor.label)}
              </a>
            </li>
          ))}
        </ul>

        <div className="landing-nav-actions">
          <LanguageToggle className="landing-desktop-only" />
          {hasSession ? (
            <div className="landing-desktop-only relative">
              <button {...space.buttonProps} className="landing-nav-link">
                {t('landingMySpace')}
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </button>
              <div id={space.panelId} ref={space.panelRef} hidden={!space.open} className="landing-popover">
                {spaceLinks(() => space.close())}
              </div>
            </div>
          ) : (
            <Link to={paths.merchantLogin} className="landing-nav-link landing-desktop-only">
              {t('landingLogin')}
            </Link>
          )}
          <Link to={paths.merchantRegister} className="landing-button landing-button--primary landing-button--sm">
            {t('landingCtaCreate')}
          </Link>
          <button {...menu.buttonProps} aria-label={t('landingMenu')} className="landing-menu-button">
            {menu.open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>

        <div id={menu.panelId} ref={menu.panelRef} hidden={!menu.open} className="landing-menu-panel">
          <ul className="grid gap-1">
            {LANDING_ANCHORS.map((anchor) => (
              <li key={anchor.href}>
                <a href={anchor.href} onClick={() => menu.close()} className="landing-menu-link">
                  {t(anchor.label)}
                </a>
              </li>
            ))}
          </ul>
          <div className="landing-menu-group">
            {hasSession ? (
              <>
                <p className="landing-menu-heading">{t('landingMySpace')}</p>
                {spaceLinks(() => menu.close())}
              </>
            ) : (
              <Link to={paths.merchantLogin} onClick={() => menu.close()} className="landing-menu-link">
                {t('landingLogin')}
              </Link>
            )}
          </div>
          <LanguageToggle />
        </div>
      </nav>

      {status === 'error' && (
        <div className="landing-session-error">
          <FormFeedback error={t('landingSessionError')}>
            {' '}
            <button
              type="button"
              className="landing-inline-button"
              onClick={() => void refreshSession().catch(() => undefined)}
            >
              {t('tryAgain')}
            </button>
          </FormFeedback>
        </div>
      )}
    </header>
  );
}
