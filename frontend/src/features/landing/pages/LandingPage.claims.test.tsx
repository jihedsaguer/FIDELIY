import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { AuthProvider } from '../../auth/AuthProvider';
import { I18nProvider, messageKeys, translate, type Locale, type MessageKey } from '../../../shared/i18n/i18n';
import LandingPage from './LandingPage';

/**
 * Claim guard: the landing page must not promise anything Release 1 does not
 * do (wallet passes, SMS/e-mail campaigns, notifications, offline mode,
 * pricing, guarantees, OTP, installable app, verification, real time).
 */
const FORBIDDEN: RegExp[] = [
  /wallet/i, /apple/i, /google/i, /\bsms\b/i, /e-?mail/i, /campagne/i, /notification/i,
  /offline/i, /hors[\s-]?ligne/i, /hors connexion/i, /tarif/i, /prix/i, /gratuit/i, /\bfree\b/i,
  /garanti/i, /\botp\b/i, /installer l['’]app/i, /installez l['’]app/i, /ajouter à l['’]écran/i,
  /écran d['’]accueil/i, /vérification/i, /temps réel/i, /instantan/i, /abonnement/i, /whatsapp/i,
  // Arabic (Darija and MSA)
  /مجان/, /بلاش/, /سعر/, /أسعار/, /تعريفة/, /ثمن/, /واتساب/, /واتس/, /إشعار/, /اشعار/, /نوتيف/,
  /مضمون/, /ضمان/, /أوفلاين/, /اوفلاين/, /إنترنت/, /انترنت/, /حملة/, /حملات/, /محفظة/, /والت/,
  /أبل/, /آبل/, /جوجل/, /غوغل/, /قوقل/, /تحقق/, /التحقّق/, /فوري/, /اشتراك/, /إس إم إس/, /ميساج/, /مساج/,
];

function findForbidden(text: string): string[] {
  return FORBIDDEN.filter((pattern) => pattern.test(text)).map(String);
}

function stubSession() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } })));
}

function renderedText(locale: Locale): string {
  stubSession();
  window.localStorage.setItem('fideliy-locale', locale);
  const { container, unmount } = render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <AuthProvider>
          <MemoryRouter>
            <LandingPage />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </Provider>,
  );
  // Open everything that hides text: the mobile menu and every FAQ answer.
  fireEvent.click(screen.getByRole('button', { name: translate(locale, 'landingMenu') }));
  for (const trigger of container.querySelectorAll<HTMLButtonElement>('.landing-faq button[aria-expanded="false"]')) {
    fireEvent.click(trigger);
  }
  const attributes = Array.from(container.querySelectorAll('*')).flatMap((element) =>
    ['aria-label', 'aria-valuetext', 'placeholder', 'title', 'alt']
      .map((name) => element.getAttribute(name))
      .filter((value): value is string => Boolean(value)),
  );
  const text = [container.textContent ?? '', ...attributes, document.title].join('\n');
  unmount();
  return text;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('landing claim guard', () => {
  it('detects a forbidden claim when one is added (guard self-check)', () => {
    expect(findForbidden('Vos clients reçoivent un SMS')).toEqual(['/\\bsms\\b/i']);
    expect(findForbidden('Essai gratuit')).toHaveLength(1);
    expect(findForbidden('Ajoutez la carte à Apple Wallet')).toHaveLength(2);
    expect(findForbidden('التسجيل مجاني')).toHaveLength(1);
    expect(findForbidden('Vos clients reviennent.')).toEqual([]);
  });

  it.each(['fr', 'ar'] as const)('renders no forbidden claim in %s (all FAQ answers and the menu open)', (locale) => {
    const text = renderedText(locale);
    expect(text).toContain(translate(locale, 'landingFaq4A'));
    expect(findForbidden(text)).toEqual([]);
  });

  it.each(['fr', 'ar'] as const)('has no forbidden claim in any %s landing message', (locale) => {
    const keys = messageKeys(locale).filter((key) => key.startsWith('landing')) as MessageKey[];
    expect(keys.length).toBeGreaterThan(100);
    const offending = keys.filter((key) => findForbidden(translate(locale, key)).length > 0);
    expect(offending).toEqual([]);
  });

  it('keeps the French landing copy free of Arabic script and the Arabic copy in Arabic script', () => {
    const keys = messageKeys('fr').filter((key) => key.startsWith('landing')) as MessageKey[];
    const languageNames: string[] = ['landingLangAr', 'landingLangArName'];
    const frWithArabic = keys.filter((key) => !languageNames.includes(key) && /[؀-ۿ]/.test(translate('fr', key)));
    expect(frWithArabic).toEqual([]);
    const neutral = ['landingLangFr', 'landingLangFrName', 'landingCompareAppTitle', 'landingStickerQr', 'landingUnitPercent'];
    const arWithoutArabic = keys.filter((key) => !neutral.includes(key) && !/[؀-ۿ]/.test(translate('ar', key)));
    expect(arWithoutArabic).toEqual([]);
  });
});
