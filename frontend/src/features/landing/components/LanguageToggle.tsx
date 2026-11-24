import { cn } from '../../../lib/utils';
import { useI18n, type Locale } from '../../../shared/i18n/i18n';

const OPTIONS: Array<{ locale: Locale; label: 'landingLangFr' | 'landingLangAr'; name: 'landingLangFrName' | 'landingLangArName' }> = [
  { locale: 'fr', label: 'landingLangFr', name: 'landingLangFrName' },
  { locale: 'ar', label: 'landingLangAr', name: 'landingLangArName' },
];

/** FR / ع switch: two pressed-state buttons using the app-wide locale setter. */
export function LanguageToggle({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t('language')} className={cn('landing-lang', `landing-lang--${tone}`, className)}>
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          lang={option.locale}
          aria-pressed={locale === option.locale}
          aria-label={t(option.name)}
          onClick={() => setLocale(option.locale)}
          className="landing-lang-button"
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}
