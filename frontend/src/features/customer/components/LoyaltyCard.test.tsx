import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CustomerMembership, MembershipReward } from '../../loyalty/api/customerApi';
import { I18nProvider } from '../../../shared/i18n/i18n';
import { LoyaltyCard } from './LoyaltyCard';

function membership(overrides: Partial<CustomerMembership> = {}): CustomerMembership {
  return {
    id: 'm-1',
    status: 'active',
    joinedAt: '2026-03-04T10:00:00.000Z',
    leftAt: null,
    business: { name: 'Café Lila', logoUrl: null },
    program: { type: 'stamps', version: 1 },
    balance: { stamps: 0, points: 0 },
    rewards: [],
    ...overrides,
  };
}

const stampReward = (cost: number, name = `Timbres ${cost}`): MembershipReward => ({
  name,
  activityType: 'stamps',
  cost,
});
const pointsReward = (cost: number, name = `Points ${cost}`): MembershipReward => ({
  name,
  activityType: 'points',
  cost,
});

function renderCard(value: CustomerMembership, locale: 'fr' | 'ar' = 'fr') {
  window.localStorage.setItem('fideliy-locale', locale);
  return render(
    <I18nProvider>
      <MemoryRouter>
        <LoyaltyCard membership={value} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('LoyaltyCard', () => {
  beforeEach(() => window.localStorage.clear());

  it('links to the membership detail page with an accessible name', () => {
    renderCard(membership());
    const link = screen.getByRole('link', { name: 'Voir les détails pour Café Lila' });
    expect(link).toHaveAttribute('href', '/customer/memberships/m-1');
  });

  it('shows the business initial when there is no logo and the localized join date', () => {
    renderCard(membership());
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText(/Membre depuis/)).toHaveTextContent(/2026/);
  });

  it('targets the cheapest reward not yet affordable (stamps)', () => {
    renderCard(
      membership({
        balance: { stamps: 7, points: 0 },
        rewards: [stampReward(20), stampReward(5), stampReward(10)],
      }),
    );
    expect(screen.getByRole('img', { name: '7 / 10 Timbres' })).toBeInTheDocument();
    expect(screen.getByText('Récompense disponible')).toBeInTheDocument();
  });

  it('shows the points progress bar toward the next reward with ARIA values', () => {
    renderCard(
      membership({
        program: { type: 'points', version: 1 },
        balance: { stamps: 0, points: 150 },
        rewards: [pointsReward(500), pointsReward(200, 'Gâteau'), pointsReward(100)],
      }),
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '150');
    expect(bar).toHaveAttribute('aria-valuemax', '200');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAccessibleName(/Gâteau/);
    expect(screen.getByText('Récompense disponible')).toBeInTheDocument();
  });

  it('does not claim a reward is available when none is affordable', () => {
    renderCard(
      membership({
        balance: { stamps: 2, points: 0 },
        rewards: [stampReward(10)],
      }),
    );
    expect(screen.queryByText('Récompense disponible')).not.toBeInTheDocument();
  });

  it('shows the reward available state without a progress bar once every reward is affordable', () => {
    renderCard(
      membership({
        program: { type: 'points', version: 1 },
        balance: { stamps: 0, points: 250 },
        rewards: [pointsReward(100), pointsReward(200)],
      }),
    );
    expect(screen.getByText('Récompense disponible')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows no progress bar or stamp slots when there are no rewards', () => {
    renderCard(membership({ balance: { stamps: 4, points: 0 } }));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('4 Timbres')).toBeInTheDocument();
    expect(screen.queryByText('Récompense disponible')).not.toBeInTheDocument();
  });

  it('shows both stamps and points for a combined programme', () => {
    renderCard(
      membership({
        program: { type: 'both', version: 2 },
        balance: { stamps: 3, points: 40 },
        rewards: [stampReward(8), pointsReward(100, 'Boisson')],
      }),
    );
    expect(screen.getByRole('img', { name: '3 / 8 Timbres' })).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('draws stamp slots up to 12 and falls back to a text count above', () => {
    const { unmount } = renderCard(
      membership({ balance: { stamps: 5, points: 0 }, rewards: [stampReward(12)] }),
    );
    expect(screen.getByRole('img', { name: '5 / 12 Timbres' })).toBeInTheDocument();
    unmount();

    renderCard(
      membership({ balance: { stamps: 5, points: 0 }, rewards: [stampReward(13)] }),
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('5 / 13 Timbres')).toBeInTheDocument();
  });

  it('flips to the rewards list; the hidden face is inert', () => {
    renderCard(
      membership({
        balance: { stamps: 4, points: 0 },
        rewards: [stampReward(10, 'Café offert'), stampReward(5, 'Biscuit')],
      }),
    );
    const toggle = screen.getByRole('button', { name: 'Récompenses' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const rewardName = screen.getByText('Café offert');
    expect(rewardName.closest('[inert]')).not.toBeNull();
    expect(screen.getByRole('link').closest('[inert]')).toBeNull();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(rewardName.closest('[inert]')).toBeNull();
    expect(screen.getByRole('link', { hidden: true }).closest('[inert]')).not.toBeNull();
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items[0]).toContain('Biscuit');
    expect(items[1]).toContain('Café offert');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('says so on the back face when there are no rewards', () => {
    renderCard(membership());
    expect(screen.getByText("Aucune récompense n'est définie pour le moment.")).toBeInTheDocument();
  });

  it('renders Arabic strings', () => {
    renderCard(
      membership({ balance: { stamps: 10, points: 0 }, rewards: [stampReward(10)] }),
      'ar',
    );
    expect(screen.getByText('مكافأة متاحة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'المكافآت' })).toBeInTheDocument();
  });
});
