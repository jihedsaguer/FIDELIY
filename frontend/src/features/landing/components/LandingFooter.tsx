import { Link } from 'react-router-dom';
import { paths } from '../../../app/routes/paths';
import { useI18n } from '../../../shared/i18n/i18n';
import { LanguageToggle } from './LanguageToggle';

export function LandingFooter() {
  const { t } = useI18n();
  return (
    <footer className="landing-footer landing-on-dark">
      <div className="landing-container landing-footer-grid">
        <div className="grid gap-3">
          <p className="landing-wordmark landing-wordmark--footer" dir="ltr">
            FIDELIY<span aria-hidden="true">.</span>
          </p>
          <p className="landing-body">{t('landingFooterTagline')}</p>
        </div>
        <nav aria-label={t('landingFooterNav')} className="landing-footer-nav">
          <div>
            <p className="landing-footer-heading">{t('landingFooterMerchants')}</p>
            <ul className="grid gap-1">
              <li>
                <Link to={paths.merchantLogin} className="landing-footer-link">{t('landingLogin')}</Link>
              </li>
              <li>
                <Link to={paths.merchantRegister} className="landing-footer-link">{t('landingFooterRegister')}</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="landing-footer-heading">{t('landingFooterCustomers')}</p>
            <ul className="grid gap-1">
              <li>
                <Link to={paths.customerLogin} className="landing-footer-link">{t('landingFooterCustomerLogin')}</Link>
              </li>
            </ul>
          </div>
        </nav>
        <LanguageToggle tone="dark" />
      </div>
    </footer>
  );
}
