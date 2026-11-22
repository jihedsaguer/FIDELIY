import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { I18nProvider } from '../../../shared/i18n/i18n';
import CustomerDashboardPage from './CustomerDashboardPage';

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { user: { name: 'Sami' } },
    signOut: vi.fn(),
  }),
}));

type Reply = { status: number; body?: unknown };

const apiMembership = (overrides: Record<string, unknown> = {}) => ({
  id: 'm-1',
  status: 'active',
  joinedAt: '2026-03-04T10:00:00.000Z',
  leftAt: null,
  business: { name: 'Café Lila', logoUrl: null },
  program: { type: 'both', version: 1 },
  balance: { stamps: 4, points: 150 },
  rewards: [
    { name: 'Café offert', activityType: 'stamps', cost: 10 },
    { name: 'Gâteau', activityType: 'points', cost: 200 },
  ],
  ...overrides,
});

function stubBackend(memberships: Reply) {
  const json = ({ status, body }: Reply) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input), 'http://localhost');
    if (url.pathname === '/api/customers/memberships') return json(memberships);
    if (url.pathname === '/api/customers/personal-qr') {
      return json({ status: 404, body: { message: 'not issued' } });
    }
    return json({ status: 404, body: { message: 'unexpected' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function membershipFetchCount(fetchMock: ReturnType<typeof stubBackend>) {
  return fetchMock.mock.calls.filter(([input]) => {
    const request = input instanceof Request ? input : undefined;
    return new URL(request ? request.url : String(input), 'http://localhost').pathname === '/api/customers/memberships';
  }).length;
}

function pageTree(store: ReturnType<typeof createAppStore>) {
  return (
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          <CustomerDashboardPage />
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

function renderPage(locale: 'fr' | 'ar' = 'fr') {
  window.localStorage.setItem('fideliy-locale', locale);
  return render(pageTree(createAppStore()));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CustomerDashboardPage', () => {
  it('renders each active membership card from the real API shape, without fake thresholds', async () => {
    stubBackend({
      status: 200,
      body: [
        apiMembership(),
        apiMembership({
          id: 'm-2',
          joinedAt: '2026-01-01T10:00:00.000Z',
          business: { name: 'Boulangerie Nour', logoUrl: null },
          program: { type: 'points', version: 1 },
          balance: { stamps: 0, points: 30 },
          rewards: [{ name: 'Pain offert', activityType: 'points', cost: 60 }],
        }),
        apiMembership({
          id: 'm-3',
          status: 'inactive',
          business: { name: 'Ancien Magasin', logoUrl: null },
        }),
      ],
    });

    renderPage();

    expect(await screen.findByText('Café Lila')).toBeInTheDocument();
    expect(screen.getByText('Boulangerie Nour')).toBeInTheDocument();
    expect(screen.queryByText('Ancien Magasin')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vos cartes de fidélité' })).toBeInTheDocument();

    // Real thresholds (10 stamps, 200 and 60 points), not the old fake 10 / 100.
    expect(screen.getByRole('img', { name: '4 / 10 Timbres' })).toBeInTheDocument();
    const maxima = screen.getAllByRole('progressbar').map((bar) => bar.getAttribute('aria-valuemax'));
    expect(maxima).toEqual(['200', '60']);
    expect(screen.getAllByRole('link', { name: /Voir les détails pour/ })).toHaveLength(2);
  });

  it('shows the localized get-started empty state when there is no active membership', async () => {
    stubBackend({ status: 200, body: [] });
    renderPage();
    expect(await screen.findByText('Pour commencer')).toBeInTheDocument();
    expect(screen.queryByText('Get started')).not.toBeInTheDocument();
  });

  it('shows a localized error when memberships fail to load', async () => {
    stubBackend({ status: 500, body: { message: 'boom' } });
    renderPage();
    expect(
      await screen.findByText('Impossible de charger vos données de fidélité. Veuillez réessayer.'),
    ).toBeInTheDocument();
  });

  it('refetches memberships when the page is mounted again with cached data', async () => {
    const fetchMock = stubBackend({ status: 200, body: [apiMembership()] });
    window.localStorage.setItem('fideliy-locale', 'fr');
    const store = createAppStore();
    const first = render(pageTree(store));
    await screen.findByText('Café Lila');
    expect(membershipFetchCount(fetchMock)).toBe(1);
    first.unmount();

    render(pageTree(store));
    await screen.findByText('Café Lila');
    await waitFor(() => expect(membershipFetchCount(fetchMock)).toBe(2));
  });

  it('refetches memberships when the window regains focus', async () => {
    const fetchMock = stubBackend({ status: 200, body: [apiMembership()] });
    renderPage();
    await screen.findByText('Café Lila');
    expect(membershipFetchCount(fetchMock)).toBe(1);

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(membershipFetchCount(fetchMock)).toBe(2));
  });

  it('renders Arabic copy', async () => {
    stubBackend({ status: 200, body: [] });
    renderPage('ar');
    expect(await screen.findByText('ابدأ الآن')).toBeInTheDocument();
  });
});
