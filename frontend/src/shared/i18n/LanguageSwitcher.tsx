import { useI18n } from './i18n';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="language-switcher">
      <span className="sr-only">{t('language')}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value as 'fr' | 'ar')} aria-label={t('language')}>
        <option value="fr">FR</option>
        <option value="ar">العربية</option>
      </select>
    </label>
  );
}
