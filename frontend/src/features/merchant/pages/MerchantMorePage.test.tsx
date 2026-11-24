import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../shared/i18n/i18n';
import { Sidebar } from '../../../components/layout/Sidebar';
import MerchantMorePage from './MerchantMorePage';

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock('../../loyalty/context/ScannerContext', () => ({
  useScanner: () => ({ openScanner: vi.fn() }),
}));

function renderWithProviders(ui: React.ReactNode) {
  window.localStorage.setItem('fideliy-locale', 'fr');
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/merchant/more']}>{ui}</MemoryRouter>
    </I18nProvider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe('business QR navigation', () => {
  it('the More page links to the business QR page', () => {
    renderWithProviders(<MerchantMorePage />);
    const link = screen.getByRole('link', { name: /Mon QR d'entreprise/ });
    expect(link).toHaveAttribute('href', '/merchant/business-qr');
  });

  it('the expanded sidebar More list links to the business QR page', () => {
    // jsdom defaults to a 1024px-wide window: the sidebar is expanded.
    renderWithProviders(<Sidebar workspace="merchant" />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }));
    const link = screen.getByRole('link', { name: "Mon QR d'entreprise" });
    expect(link).toHaveAttribute('href', '/merchant/business-qr');
  });
});
