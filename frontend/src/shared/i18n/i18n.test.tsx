import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider, messageKeys, translate, useI18n } from './i18n';

function Probe() {
  const { t } = useI18n();
  return <p>{t('tryAgain')}</p>;
}

afterEach(() => {
  window.localStorage.clear();
});

describe('translate', () => {
  it('reads a key in the requested locale, whatever the current UI locale', () => {
    window.localStorage.setItem('fideliy-locale', 'fr');
    expect(translate('fr', 'tryAgain')).toBe('Réessayer');
    expect(translate('ar', 'tryAgain')).toBe('حاول مرة أخرى');
  });

  it('leaves the context t() on the current locale', () => {
    window.localStorage.setItem('fideliy-locale', 'ar');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText('حاول مرة أخرى')).toBeInTheDocument();
  });
});

describe('message catalogue', () => {
  it('has the same keys in French and Arabic', () => {
    const fr = [...messageKeys('fr')].sort();
    const ar = [...messageKeys('ar')].sort();
    expect(ar).toEqual(fr);
  });
});
