import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../../shared/i18n/i18n';
import { LoyaltyCardView, type LoyaltyCardViewProps } from './LoyaltyCardView';

function renderView(props: Partial<LoyaltyCardViewProps> = {}) {
  window.localStorage.setItem('fideliy-locale', 'fr');
  return render(
    <I18nProvider>
      <MemoryRouter>
        <LoyaltyCardView
          businessName="Café Lila"
          logoUrl={null}
          programType="stamps"
          balance={{ stamps: 4, points: 0 }}
          rewards={[{ name: 'Café offert', activityType: 'stamps', cost: 10 }]}
          joinedAt="2026-03-04T10:00:00.000Z"
          {...props}
        />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('LoyaltyCardView', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders no link when detailsHref is not set', () => {
    renderView();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Café Lila')).toBeInTheDocument();
  });

  it('renders the header as a link with the given label when detailsHref is set', () => {
    renderView({ detailsHref: '/somewhere/1', detailsLabel: 'Ouvrir Café Lila' });
    const link = screen.getByRole('link', { name: 'Ouvrir Café Lila' });
    expect(link).toHaveAttribute('href', '/somewhere/1');
  });

  it('shows the balance, progress toward the next reward and the join date', () => {
    renderView();
    expect(screen.getByText('4 Timbres')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4 / 10 Timbres' })).toBeInTheDocument();
    expect(screen.getByText(/Membre depuis/)).toHaveTextContent(/2026/);
  });

  it('shows the business initial when there is no logo', () => {
    renderView();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
