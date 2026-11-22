import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { I18nProvider } from '../../../shared/i18n/i18n';
import MerchantCustomersPage from './MerchantCustomersPage';

vi.mock('../../loyalty/context/ScannerContext', () => ({
  useScanner: () => ({ openScanner: vi.fn() }),
}));

type Item = {
  membershipId: string;
  customer: { name: string; phoneNumber: string };
  status: 'active' | 'inactive';
  joinedAt: string;
  leftAt: string | null;
  balance: { stamps: number; points: number };
  lastActivityAt: string | null;
};

function item(i: number, overrides: Partial<Item> = {}): Item {
  return {
    membershipId: `m-${i}`,
    customer: { name: `Client ${i}`, phoneNumber: `+2165500000${i}` },
    status: 'active',
    joinedAt: '2026-03-01T10:00:00.000Z',
    leftAt: null,
    balance: { stamps: 12, points: 0 },
    lastActivityAt: '2026-04-02T09:00:00.000Z',
    ...overrides,
  };
}

interface BackendOptions {
  items?: Item[];
  total?: number;
  programType?: 'stamps' | 'points' | 'both';
  failListTimes?: number;
  summary?: unknown;
}

const zeros = { earned: 0, earningsReversed: 0, redeemed: 0, redemptionsReversed: 0, adjustments: 0, balance: 0 };
const defaultSummary = {
  stamps: { earned: 14, earningsReversed: 2, redeemed: 10, redemptionsReversed: 10, adjustments: 0, balance: 12 },
  points: zeros,
  transactionCount: 26,
  programType: 'stamps',
  rewards: [{ configurationId: 'cfg-1', rewardIndex: 0, name: 'Café offert', activityType: 'stamps', cost: 10 }],
};

function createBackend(options: BackendOptions = {}) {
  const items = options.items ?? [item(1)];
  let failures = options.failListTimes ?? 0;
  const listUrls: URL[] = [];
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input), 'http://localhost');

    if (url.pathname === '/api/merchants/customers') {
      listUrls.push(url);
      if (failures > 0) {
        failures -= 1;
        return json(500, { message: 'boom' });
      }
      const search = url.searchParams.get('search')?.toLowerCase();
      const status = url.searchParams.get('status');
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const filtered = items
        .filter((i) => !status || i.status === status)
        .filter((i) => !search || i.customer.name.toLowerCase().includes(search));
      return json(200, {
        items: filtered.slice(offset),
        total: options.total ?? filtered.length,
      });
    }
    if (url.pathname === '/api/programs/current') {
      return json(200, { id: 'p1', type: options.programType ?? 'stamps', status: 'active' });
    }
    if (url.pathname === '/api/merchants/business-setup') {
      return json(200, { business: { id: 'b1', name: 'Café Soleil', logoUrl: null } });
    }
    if (url.pathname === '/api/merchants/transactions') {
      return json(200, {
        summary: options.summary ?? defaultSummary,
        transactions: [
          {
            id: 'tx-1',
            membershipId: url.searchParams.get('membershipId'),
            branchId: null,
            category: 'purchase',
            occurredAt: '2026-04-02T09:00:00.000Z',
            purchaseAmount: null,
            reversalReason: null,
            reversesTransactionId: null,
            reversedByTransactionId: null,
            stampsDelta: 1,
            pointsDelta: 0,
            entries: [],
          },
        ],
      });
    }
    return json(404, { message: 'unexpected' });
  });

  return { fetch: fetchMock, listUrls };
}

function renderPage(backend: ReturnType<typeof createBackend>, locale: 'fr' | 'ar' = 'fr') {
  vi.stubGlobal('fetch', backend.fetch);
  window.localStorage.setItem('fideliy-locale', locale);
  return render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <MemoryRouter>
          <MerchantCustomersPage />
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );
}

describe('MerchantCustomersPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state, then the customers', async () => {
    renderPage(createBackend());

    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Client 1')).toBeInTheDocument();
  });

  it('shows an empty state when the business has no customers', async () => {
    renderPage(createBackend({ items: [] }));

    expect(await screen.findByText('Aucun client trouvé')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error and retries the request', async () => {
    const backend = createBackend({ failListTimes: 1 });
    renderPage(backend);

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les clients');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Client 1')).toBeInTheDocument();
    expect(backend.listUrls.length).toBe(2);
  });

  it('renders the full phone number left-to-right and a plain stamp count (no fake threshold)', async () => {
    renderPage(
      createBackend({
        items: [
          item(1, { balance: { stamps: 12, points: 0 }, lastActivityAt: null }),
          item(2, { status: 'inactive', leftAt: '2026-05-01T00:00:00.000Z' }),
        ],
        programType: 'stamps',
      }),
    );

    const table = await screen.findByRole('table');
    const phone = within(table).getByText('+21655000001');
    expect(phone).toHaveAttribute('dir', 'ltr');
    expect(within(table).getAllByText('12', { selector: 'td' })).toHaveLength(2);
    expect(within(table).getByText('Aucune activité')).toBeInTheDocument();
    expect(within(table).getByText('Actif')).toBeInTheDocument();
    expect(within(table).getByText('Inactif')).toBeInTheDocument();
    // The programme only uses stamps: no points column.
    expect(within(table).getByRole('columnheader', { name: 'Timbres' })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Points' })).not.toBeInTheDocument();
    expect(screen.queryByText('Dernière visite')).not.toBeInTheDocument();
  });

  it('shows both balance columns for a combined programme', async () => {
    renderPage(createBackend({ programType: 'both' }));

    const table = await screen.findByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Timbres' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Points' })).toBeInTheDocument();
  });

  it('searches by name after a debounce and shows a no-result message', async () => {
    const backend = createBackend({ items: [item(1), item(2)] });
    renderPage(backend);
    await screen.findByRole('table');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher par nom ou téléphone' }), {
      target: { value: 'Client 2' },
    });
    expect(backend.listUrls.some((u) => u.searchParams.get('search') === 'Client 2')).toBe(false);

    await waitFor(() =>
      expect(backend.listUrls.some((u) => u.searchParams.get('search') === 'Client 2')).toBe(true),
    );
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).queryByText('Client 1')).not.toBeInTheDocument();
      expect(within(table).getByText('Client 2')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(await screen.findByText('Essayez une autre recherche')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const backend = createBackend({
      items: [item(1), item(2, { status: 'inactive', leftAt: '2026-05-01T00:00:00.000Z' })],
    });
    renderPage(backend);
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText('Filtrer par statut'), { target: { value: 'inactive' } });

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).queryByText('Client 1')).not.toBeInTheDocument();
      expect(within(table).getByText('Client 2')).toBeInTheDocument();
    });
    expect(backend.listUrls.some((u) => u.searchParams.get('status') === 'inactive')).toBe(true);
  });

  it('paginates with next and previous', async () => {
    const items = Array.from({ length: 30 }, (_, i) => item(i + 1));
    const backend = createBackend({ items, total: 30 });
    renderPage(backend);
    await screen.findByRole('table');

    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    await waitFor(() =>
      expect(backend.listUrls.some((u) => u.searchParams.get('offset') === '25')).toBe(true),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Précédent' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();
  });

  it('opens the customer history in a modal for the chosen membership', async () => {
    renderPage(createBackend({ items: [item(1), item(2)] }));
    const table = await screen.findByRole('table');

    fireEvent.click(within(table).getAllByRole('button', { name: /Voir l'historique/ })[1]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Client 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Historique du client')).toBeInTheDocument();
    expect(await within(dialog).findByText('Achat')).toBeInTheDocument();
    // History is read-only from the list: no earning controls.
    expect(within(dialog).queryByText('Ajouter un timbre')).not.toBeInTheDocument();
  });

  it('shows the loyalty card, the server totals exactly as returned and no earning controls in the modal', async () => {
    renderPage(createBackend());
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Voir l'historique/ }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Café Soleil')).toBeInTheDocument();
    const totals = await within(dialog).findByRole('region', { name: 'Récapitulatif' });
    const value = (label: string) => within(totals).getByText(label).nextElementSibling;
    expect(value('Gagnés')).toHaveTextContent('14');
    expect(value('Annulés (achats)')).toHaveTextContent('2');
    expect(value('Utilisés')).toHaveTextContent('10');
    expect(value('Utilisations annulées')).toHaveTextContent('10');
    expect(value('Solde')).toHaveTextContent('12');
    // Programme uses stamps only: no points block, zero adjustments hidden.
    expect(within(totals).queryByText('Ajustements')).not.toBeInTheDocument();
    expect(within(totals).getAllByText('Solde')).toHaveLength(1);
    // 26 operations: no "latest 100" note.
    expect(within(dialog).queryByText(/100 dernières/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Ajouter un timbre')).not.toBeInTheDocument();
  });

  it('shows the latest-100 note when there are more than 100 operations, and non-zero adjustments', async () => {
    const summary = {
      ...defaultSummary,
      stamps: { ...defaultSummary.stamps, adjustments: 3 },
      transactionCount: 130,
    };
    renderPage(createBackend({ summary }));
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Voir l'historique/ }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/Les 100 dernières opérations sont affichées sur 130/)).toBeInTheDocument();
    expect(within(dialog).getByText('Ajustements').nextElementSibling).toHaveTextContent('3');
  });

  it('shows the totals labels in Arabic', async () => {
    renderPage(createBackend(), 'ar');
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /عرض السجل/ }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('region', { name: 'الملخص' })).toBeInTheDocument();
  });

  it('renders in Arabic with Latin-script phone numbers kept left-to-right', async () => {
    renderPage(createBackend(), 'ar');

    const table = await screen.findByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'الاسم' })).toBeInTheDocument();
    expect(within(table).getByText('+21655000001')).toHaveAttribute('dir', 'ltr');
    expect(within(table).getByRole('button', { name: /عرض السجل/ })).toBeInTheDocument();
  });
});
