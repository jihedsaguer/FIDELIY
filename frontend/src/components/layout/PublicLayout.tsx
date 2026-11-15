import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../../shared/i18n/LanguageSwitcher';
import { useI18n } from '../../shared/i18n/i18n';

export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="page-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="FIDELIY home">FIDELIY<span>.</span></Link>
        <div className="topbar-actions"><span className="topbar-note">{t('brandTagline')}</span><LanguageSwitcher /></div>
      </header>
      <main className="main-content" id="main-content">{children}</main>
      <footer>{t('footer')}</footer>
    </div>
  );
}
