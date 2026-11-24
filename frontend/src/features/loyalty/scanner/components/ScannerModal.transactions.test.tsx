import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../../app/store';
import { I18nProvider } from '../../../../shared/i18n/i18n';
import { ScannerModal } from './ScannerModal';

// jsdom has no getUserMedia: replace the camera hook with inert, stable callbacks.
const cameraMock = vi.hoisted(() => ({
  videoRef: { current: null },
  start: async () => undefined,
  stop: () => undefined,
}));

vi.mock('../hooks/useCamera', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useCamera')>()),
  useCamera: () => cameraMock,
}));

type Reply = { status: number; body?: unknown };
type Call = { method: string; path: string; search: string; body?: Record<string, unknown> };

const CONFIG_STAMPS = '11111111-1111-4111-8111-111111111111';
const CONFIG_POINTS = '22222222-2222-4222-8222-222222222222';
const MEMBERSHIP = '33333333-3333-4333-8333-333333333333';
const BRANCH_A = '44444444-4444-4444-8444-444444444441';
const BRANCH_B = '44444444-4444-4444-8444-444444444442';

function customer(
  type: 'stamps' | 'points',
  balance = { stamps: 3, points: 50 },
  enrolment: 'existing' | 'joined' | 'rejoined' = 'existing',
) {
  return {
    customer: { id: 'c1', name: 'Amel Test', phoneNumber: '+21612345678' },
    membership: { id: MEMBERSHIP, status: 'active', joinedAt: '2026-01-01T00:00:00.000Z', enrolment },
    balance,
    program: {
      id: 'p1',
      type,
      version: 1,
      name: null,
      configurations:
        type === 'stamps'
          ? { stamps: { configurationId: CONFIG_STAMPS } }
          : { points: { configurationId: CONFIG_POINTS, earningRate: '1.00' } },
    },
    rewards:
      type === 'points'
        ? [
            { configurationId: CONFIG_POINTS, rewardIndex: 0, name: 'Cafe offert', activityType: 'points', cost: 40, available: true },
            { configurationId: CONFIG_POINTS, rewardIndex: 1, name: 'Gateau offert', activityType: 'points', cost: 200, available: false },
          ]
        : [],
  };
}

const PURCHASE_TX = {
  id: 'tx-purchase',
  membershipId: MEMBERSHIP,
  branchId: null,
  category: 'purchase',
  occurredAt: '2026-03-04T10:00:00.000Z',
  purchaseAmount: '12.500',
  reversalReason: null,
  reversesTransactionId: null,
  reversedByTransactionId: null,
  stampsDelta: 0,
  pointsDelta: 12,
  entries: [],
};
const REVERSAL_TX = {
  ...PURCHASE_TX,
  id: 'tx-reversal',
  category: 'reversal',
  purchaseAmount: null,
  reversalReason: 'Erreur de caisse',
  reversesTransactionId: 'tx-old',
  pointsDelta: -5,
};
const REVERSED_TX = { ...PURCHASE_TX, id: 'tx-reversed', reversedByTransactionId: 'tx-reversal' };

interface BackendOptions {
  type?: 'stamps' | 'points';
  branches?: string[];
  createReplies?: Reply[];
  reverseReplies?: Reply[];
  history?: unknown[];
  enrolment?: 'existing' | 'joined' | 'rejoined';
  /** Failure for the resolve call: an HTTP reply, or 'network' for a dropped request. */
  resolveFailure?: Reply | 'network';
  /** The business-setup call fails (card falls back to a generic name). */
  businessSetupMissing?: boolean;
  /** The customer history call fails with a 500. */
  historyFailure?: boolean;
}

/** Minimal stateful fake of the merchant endpoints used by the scanner. */
function createBackend(options: BackendOptions = {}) {
  const calls: Call[] = [];
  const createReplies = [...(options.createReplies ?? [])];
  const reverseReplies = [...(options.reverseReplies ?? [])];
  const branchIds = options.branches ?? [BRANCH_A];
  const json = ({ status, body }: Reply) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input), 'http://localhost');
    const method = (request?.method ?? init?.method ?? 'GET').toUpperCase();
    const text = request ? await request.clone().text() : typeof init?.body === 'string' ? init.body : '';
    const call: Call = { method, path: url.pathname, search: url.search, body: text ? JSON.parse(text) : undefined };
    calls.push(call);

    if (method === 'GET' && url.pathname === '/api/merchants/branches') {
      return json({
        status: 200,
        body: {
          branches: branchIds.map((id, index) => ({ id, name: `Succursale ${index + 1}`, businessId: 'b1' })),
          total: branchIds.length,
        },
      });
    }
    if (method === 'GET' && url.pathname === '/api/merchants/business-setup') {
      if (options.businessSetupMissing) return json({ status: 404, body: { message: 'none' } });
      return json({ status: 200, body: { status: 'complete', business: { id: 'b1', name: 'Café Lila', logoUrl: null }, branches: [] } });
    }
    if (url.pathname === '/api/merchants/customers/resolve-for-transaction') {
      if (options.resolveFailure === 'network') throw new TypeError('Failed to fetch');
      if (options.resolveFailure) return json(options.resolveFailure);
      return json({ status: 201, body: customer(options.type ?? 'points', undefined, options.enrolment) });
    }
    if (url.pathname === '/api/merchants/transactions/calculate-earnings') {
      const amount = call.body?.purchaseAmount ?? null;
      return json({
        status: 201,
        body: {
          purchaseAmount: amount,
          stampsToEarn: options.type === 'stamps' ? 1 : 0,
          pointsToEarn: amount ? 12 : 0,
          earningRate: '1.00',
          totalStampsAfter: 4,
          totalPointsAfter: 62,
        },
      });
    }
    if (method === 'POST' && url.pathname === '/api/merchants/transactions') {
      const reply = createReplies.shift();
      if (reply) return json(reply);
      return json({
        status: 201,
        body: {
          transactionId: 'tx-new',
          membershipId: MEMBERSHIP,
          purchaseAmount: call.body?.purchaseAmount ?? null,
          stampsEarned: 0,
          pointsEarned: 12,
          earningRate: '1.00',
          newBalance: { stamps: 3, points: 62 },
          occurredAt: '2026-03-04T10:00:00.000Z',
          idempotencyKey: call.body?.idempotencyKey,
        },
      });
    }
    if (url.pathname === '/api/merchants/transactions/redeem-reward') {
      return json({
        status: 201,
        body: {
          transactionId: 'tx-redeem',
          membershipId: MEMBERSHIP,
          reward: { configurationId: CONFIG_POINTS, rewardIndex: 0, name: 'Cafe offert', activityType: 'points', cost: 40 },
          newBalance: { stamps: 3, points: 10 },
          occurredAt: '2026-03-04T10:00:00.000Z',
          idempotencyKey: call.body?.idempotencyKey,
        },
      });
    }
    if (method === 'GET' && url.pathname === '/api/merchants/transactions') {
      if (options.historyFailure) return json({ status: 500, body: { message: 'boom' } });
      return json({ status: 200, body: { transactions: options.history ?? [] } });
    }
    if (method === 'POST' && url.pathname.endsWith('/reverse')) {
      const reply = reverseReplies.shift();
      if (reply) return json(reply);
      return json({
        status: 201,
        body: {
          transactionId: 'tx-rev',
          reversesTransactionId: 'tx-purchase',
          membershipId: MEMBERSHIP,
          reason: String(call.body?.reason),
          stampsDelta: 0,
          pointsDelta: -12,
          newBalance: { stamps: 3, points: 38 },
          occurredAt: '2026-03-04T11:00:00.000Z',
          idempotencyKey: call.body?.idempotencyKey,
        },
      });
    }
    return json({ status: 404, body: { message: 'unexpected' } });
  });

  return {
    fetch: fetchMock,
    calls,
    posts: (path: string) => calls.filter((c) => c.method === 'POST' && c.path === path),
  };
}

function tree(store: ReturnType<typeof createAppStore>, isOpen: boolean) {
  return (
    <Provider store={store}>
      <I18nProvider>
        <ScannerModal isOpen={isOpen} onClose={() => undefined} />
      </I18nProvider>
    </Provider>
  );
}

function renderScanner(backend: ReturnType<typeof createBackend>) {
  vi.stubGlobal('fetch', backend.fetch);
  window.localStorage.setItem('fideliy-locale', 'fr');
  return render(tree(createAppStore(), true));
}

const SUCCESS = /Transaction enregistrée avec succès/;
const CANCEL_LAST = /^Annuler la dernière opération/;

async function resolveCustomer() {
  fireEvent.change(screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)'), { target: { value: 'qr-secret' } });
  fireEvent.click(screen.getByRole('button', { name: 'Résoudre le client' }));
  await screen.findByText('Client trouvé');
}

async function recordWithAmount(amount: string) {
  fireEvent.change(await screen.findByLabelText(/Montant \(TND\)/), { target: { value: amount } });
  fireEvent.click(screen.getByRole('button', { name: "Enregistrer l'achat" }));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('earning flow', () => {
  it('requires a valid amount on the same screen for a points programme and sends a decimal string', async () => {
    const backend = createBackend({ type: 'points' });
    renderScanner(backend);
    await resolveCustomer();

    const input = await screen.findByLabelText(/Montant \(TND\)/);
    expect(input).toHaveAttribute('inputmode', 'decimal');

    fireEvent.click(screen.getByRole('button', { name: "Enregistrer l'achat" }));
    expect(await screen.findByText("Le montant de l'achat est obligatoire pour les points", { selector: '[role="alert"], .form-feedback' })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '1.2345' } });
    fireEvent.click(screen.getByRole('button', { name: "Enregistrer l'achat" }));
    expect(await screen.findByText(/Montant invalide/)).toBeInTheDocument();
    expect(backend.posts('/api/merchants/transactions')).toHaveLength(0);

    await recordWithAmount('12,500');
    await screen.findByText(SUCCESS);

    expect(backend.posts('/api/merchants/transactions/calculate-earnings')).toHaveLength(0);
    expect(backend.posts('/api/merchants/transactions')).toHaveLength(1);
    const create = backend.posts('/api/merchants/transactions')[0].body!;
    expect(create.purchaseAmount).toBe('12.500');
    expect(typeof create.idempotencyKey).toBe('string');
    expect(create).not.toHaveProperty('confirmRepeat');
    expect(create).not.toHaveProperty('branchId');
  });

  it('records a stamps-only purchase with one tap, no amount and no earnings preview', async () => {
    const backend = createBackend({ type: 'stamps' });
    renderScanner(backend);
    await resolveCustomer();

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un timbre' }));
    await screen.findByText(SUCCESS);

    expect(backend.posts('/api/merchants/transactions')).toHaveLength(1);
    expect(backend.posts('/api/merchants/transactions')[0].body).not.toHaveProperty('purchaseAmount');
    expect(backend.posts('/api/merchants/transactions/calculate-earnings')).toHaveLength(0);
  });

  it('sends the optional amount of a stamps-only programme when typed, and blocks a malformed one', async () => {
    const backend = createBackend({ type: 'stamps' });
    renderScanner(backend);
    await resolveCustomer();

    const input = await screen.findByLabelText(/Montant \(TND\)/);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un timbre' }));
    expect(await screen.findByText(/Montant invalide/)).toBeInTheDocument();
    expect(backend.posts('/api/merchants/transactions')).toHaveLength(0);

    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un timbre' }));
    await screen.findByText(SUCCESS);
    expect(backend.posts('/api/merchants/transactions')[0].body!.purchaseAmount).toBe('7');
  });

  it('asks for confirmation on a recent purchase from the result screen and resends the same key with confirmRepeat', async () => {
    const backend = createBackend({
      type: 'stamps',
      createReplies: [{ status: 409, body: { message: 'recent', code: 'RECENT_EARNING_CONFIRMATION_REQUIRED' } }],
    });
    renderScanner(backend);
    await resolveCustomer();

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un timbre' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Achat récent détecté' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer quand même' }));
    await screen.findByText(SUCCESS);

    const [first, second] = backend.posts('/api/merchants/transactions');
    expect(first.body).not.toHaveProperty('confirmRepeat');
    expect(second.body!.confirmRepeat).toBe(true);
    expect(second.body!.idempotencyKey).toBe(first.body!.idempotencyKey);
  });

  it('sends nothing more when the merchant cancels the repeat warning', async () => {
    const backend = createBackend({
      createReplies: [{ status: 409, body: { message: 'recent', code: 'RECENT_EARNING_CONFIRMATION_REQUIRED' } }],
    });
    renderScanner(backend);
    await resolveCustomer();
    await recordWithAmount('5');

    const dialog = await screen.findByRole('alertdialog', { name: 'Achat récent détecté' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: "Enregistrer l'achat" })).toBeInTheDocument();
    expect(backend.posts('/api/merchants/transactions')).toHaveLength(1);
  });

  it('stays on the card screen after an earn, updates the card, shows the deltas and clears the amount', async () => {
    const backend = createBackend({ type: 'points' });
    renderScanner(backend);
    await resolveCustomer();
    expect(screen.getByText('50 Points')).toBeInTheDocument();
    expect(await screen.findByText('Café Lila')).toBeInTheDocument();

    await recordWithAmount('5');
    expect(await screen.findByText(SUCCESS)).toHaveTextContent('+12');

    expect(screen.getByText('Client trouvé')).toBeInTheDocument();
    expect(screen.getByText('62 Points')).toBeInTheDocument();
    expect(screen.getByLabelText(/Montant \(TND\)/)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Scanner un autre client' })).toBeInTheDocument();
    expect(backend.posts('/api/merchants/customers/resolve-for-transaction')).toHaveLength(1);
  });

  it('still warns on a second purchase within 10 minutes', async () => {
    const created = {
      status: 201,
      body: {
        transactionId: 'tx-new',
        membershipId: MEMBERSHIP,
        purchaseAmount: '5',
        stampsEarned: 0,
        pointsEarned: 12,
        earningRate: '1.00',
        newBalance: { stamps: 3, points: 62 },
        occurredAt: '2026-03-04T10:00:00.000Z',
        idempotencyKey: 'k',
      },
    };
    const backend = createBackend({
      type: 'points',
      createReplies: [created, { status: 409, body: { message: 'recent', code: 'RECENT_EARNING_CONFIRMATION_REQUIRED' } }],
    });
    renderScanner(backend);
    await resolveCustomer();
    await recordWithAmount('5');
    await screen.findByText(SUCCESS);

    await recordWithAmount('5');
    expect(await screen.findByRole('alertdialog', { name: 'Achat récent détecté' })).toBeInTheDocument();
    expect(backend.posts('/api/merchants/transactions')).toHaveLength(2);
  });
});

describe('loyalty card on the scan result', () => {
  it('shows the resolved balance of a stamps programme', async () => {
    renderScanner(createBackend({ type: 'stamps' }));
    await resolveCustomer();
    expect(screen.getByText('3 Timbres')).toBeInTheDocument();
    expect(await screen.findByText('Café Lila')).toBeInTheDocument();
  });

  it('falls back to a generic business name when the business cannot be loaded', async () => {
    renderScanner(createBackend({ type: 'points', businessSetupMissing: true }));
    await resolveCustomer();
    expect(screen.getByText('Entreprise')).toBeInTheDocument();
    expect(screen.getByText('50 Points')).toBeInTheDocument();
  });

  it('shows no link in the card header', async () => {
    renderScanner(createBackend({ type: 'points' }));
    await resolveCustomer();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('cancel last operation', () => {
  it('targets the newest non-reversed purchase, names its delta, fills the reason from a preset and sends reason and key', async () => {
    const backend = createBackend({ history: [PURCHASE_TX, REVERSAL_TX, REVERSED_TX] });
    renderScanner(backend);
    await resolveCustomer();

    const button = await screen.findByRole('button', { name: CANCEL_LAST });
    expect(button).toHaveTextContent('+12 Points');
    fireEvent.click(button);

    const dialog = await screen.findByRole('alertdialog', { name: 'Annuler cette opération ?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saisie en double' }));
    expect(within(dialog).getByLabelText("Motif de l'annulation")).toHaveValue('Saisie en double');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler définitivement' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    const posts = backend.posts('/api/merchants/transactions/tx-purchase/reverse');
    expect(posts).toHaveLength(1);
    expect(posts[0].body!.reason).toBe('Saisie en double');
    expect(typeof posts[0].body!.idempotencyKey).toBe('string');
    expect(screen.getByText('38 Points')).toBeInTheDocument();
  });

  it('still requires a reason when none is typed or chosen', async () => {
    const backend = createBackend({ history: [PURCHASE_TX] });
    renderScanner(backend);
    await resolveCustomer();

    fireEvent.click(await screen.findByRole('button', { name: CANCEL_LAST }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler définitivement' }));
    expect(await within(dialog).findByText('Le motif est obligatoire')).toBeInTheDocument();
    expect(backend.posts('/api/merchants/transactions/tx-purchase/reverse')).toHaveLength(0);
  });

  it('shows the mapped message on a 409 and keeps the dialog open', async () => {
    const backend = createBackend({
      history: [PURCHASE_TX],
      reverseReplies: [{ status: 409, body: { message: 'Insufficient balance to reverse this transaction' } }],
    });
    renderScanner(backend);
    await resolveCustomer();

    fireEvent.click(await screen.findByRole('button', { name: CANCEL_LAST }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Erreur de saisie' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler définitivement' }));

    expect(
      await within(dialog).findByText("Cette opération a déjà été dépensée : annulez d'abord l'échange concerné"),
    ).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('is hidden when the newest operation is a reversal', async () => {
    renderScanner(createBackend({ history: [REVERSAL_TX, PURCHASE_TX] }));
    await resolveCustomer();
    await screen.findByText('Erreur de caisse');
    expect(screen.queryByRole('button', { name: CANCEL_LAST })).not.toBeInTheDocument();
  });

  it('is hidden when the newest operation is already reversed', async () => {
    renderScanner(createBackend({ history: [REVERSED_TX] }));
    await resolveCustomer();
    await screen.findByText('Annulée');
    expect(screen.queryByRole('button', { name: CANCEL_LAST })).not.toBeInTheDocument();
  });

  it('is hidden when there is no history', async () => {
    renderScanner(createBackend({ history: [] }));
    await resolveCustomer();
    await screen.findByText('Aucune opération pour ce client');
    expect(screen.queryByRole('button', { name: CANCEL_LAST })).not.toBeInTheDocument();
  });

  it('is hidden when the history fails to load', async () => {
    renderScanner(createBackend({ historyFailure: true }));
    await resolveCustomer();
    await screen.findByText("Impossible de charger l'historique");
    expect(screen.queryByRole('button', { name: CANCEL_LAST })).not.toBeInTheDocument();
  });
});

describe('redemption flow', () => {
  it('redeems by configurationId and rewardIndex, disables unaffordable rewards, shows the new balance', async () => {
    const backend = createBackend({ type: 'points' });
    renderScanner(backend);
    await resolveCustomer();

    fireEvent.click(screen.getByRole('button', { name: /Récompenses disponibles/i }));
    const unavailable = screen.getByRole('button', { name: /Gateau offert/ });
    expect(unavailable).toBeDisabled();
    expect(within(unavailable).getByText('Solde insuffisant')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cafe offert/ }));
    expect(await screen.findByText(/Solde après l'échange: 10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'échange" }));
    await screen.findByText('Échange terminé');

    const body = backend.posts('/api/merchants/transactions/redeem-reward')[0].body!;
    expect(body).toMatchObject({ membershipId: MEMBERSHIP, configurationId: CONFIG_POINTS, rewardIndex: 0 });
    expect(typeof body.idempotencyKey).toBe('string');
    expect(body).not.toHaveProperty('branchId');
    expect(screen.getByText('3 Timbres, 10 Points')).toBeInTheDocument();
  });
});

describe('branch picker', () => {
  it('requires a branch when there are several, sends it, and remembers it for the session', async () => {
    const backend = createBackend({ branches: [BRANCH_A, BRANCH_B] });
    vi.stubGlobal('fetch', backend.fetch);
    window.localStorage.setItem('fideliy-locale', 'fr');
    const store = createAppStore();
    const { rerender } = render(tree(store, true));
    await resolveCustomer();

    const select = await screen.findByLabelText('Choisir une succursale');
    expect(screen.getByRole('button', { name: "Enregistrer l'achat" })).toBeDisabled();

    fireEvent.change(select, { target: { value: BRANCH_B } });
    expect(screen.getByRole('button', { name: "Enregistrer l'achat" })).toBeEnabled();
    expect(window.sessionStorage.getItem('fideliy-scanner-branch')).toBe(BRANCH_B);

    await recordWithAmount('5');
    await screen.findByText(SUCCESS);
    expect(backend.posts('/api/merchants/transactions')[0].body!.branchId).toBe(BRANCH_B);

    rerender(tree(store, false));
    rerender(tree(store, true));
    await resolveCustomer();
    expect(await screen.findByLabelText('Choisir une succursale')).toHaveValue(BRANCH_B);
  });

  it('shows no picker and sends no branch when the business has a single branch', async () => {
    const backend = createBackend({ branches: [BRANCH_A] });
    renderScanner(backend);
    await resolveCustomer();
    await waitFor(() => expect(backend.calls.some((c) => c.path === '/api/merchants/branches')).toBe(true));

    expect(screen.queryByLabelText('Choisir une succursale')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Enregistrer l'achat" })).toBeEnabled();
  });
});

describe('history and reversal', () => {
  const history = [PURCHASE_TX, REVERSAL_TX, REVERSED_TX];

  it('lists the history, hides Reverse on reversal and reversed rows and shows the reason', async () => {
    const backend = createBackend({ history });
    renderScanner(backend);
    await resolveCustomer();

    expect(await screen.findByText('Erreur de caisse')).toBeInTheDocument();
    expect(screen.getAllByText('Annulée')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: "Annuler l'opération" })).toHaveLength(1);
    expect(backend.calls.find((c) => c.path === '/api/merchants/transactions' && c.method === 'GET')!.search).toBe(
      `?membershipId=${MEMBERSHIP}`,
    );
  });

  it('shows an empty state', async () => {
    renderScanner(createBackend({ history: [] }));
    await resolveCustomer();
    expect(await screen.findByText('Aucune opération pour ce client')).toBeInTheDocument();
  });

  it('requires a reason, then posts the reversal and updates the balance', async () => {
    const backend = createBackend({ history: [PURCHASE_TX] });
    renderScanner(backend);
    await resolveCustomer();

    fireEvent.click(await screen.findByRole('button', { name: "Annuler l'opération" }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Annuler cette opération ?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler définitivement' }));
    expect(await within(dialog).findByText('Le motif est obligatoire')).toBeInTheDocument();
    expect(backend.posts('/api/merchants/transactions/tx-purchase/reverse')).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText("Motif de l'annulation"), { target: { value: '  Erreur de saisie  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler définitivement' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    const body = backend.posts('/api/merchants/transactions/tx-purchase/reverse')[0].body!;
    expect(body.reason).toBe('Erreur de saisie');
    expect(typeof body.idempotencyKey).toBe('string');
    expect(screen.getByText('38 Points')).toBeInTheDocument();
  });

  it('keeps the dialog open with a localized message on 409 and retries with the same key', async () => {
    const backend = createBackend({
      history: [PURCHASE_TX],
      reverseReplies: [{ status: 409, body: { message: 'Insufficient balance to reverse this transaction' } }],
    });
    renderScanner(backend);
    await resolveCustomer();

    fireEvent.click(await screen.findByRole('button', { name: "Annuler l'opération" }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText("Motif de l'annulation"), { target: { value: 'Erreur' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler définitivement' }));

    expect(
      await within(dialog).findByText("Cette opération a déjà été dépensée : annulez d'abord l'échange concerné"),
    ).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler définitivement' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    const [first, second] = backend.posts('/api/merchants/transactions/tx-purchase/reverse');
    expect(second.body!.idempotencyKey).toBe(first.body!.idempotencyKey);
  });
});

describe('enrolment notice', () => {
  it.each(['joined', 'rejoined'] as const)('tells the merchant the customer was added (%s)', async (enrolment) => {
    renderScanner(createBackend({ type: 'points', enrolment }));
    await resolveCustomer();
    expect(screen.getByText('Client ajouté à votre commerce')).toBeInTheDocument();
  });

  it('shows no notice for an existing member', async () => {
    renderScanner(createBackend({ type: 'points', enrolment: 'existing' }));
    await resolveCustomer();
    expect(screen.queryByText('Client ajouté à votre commerce')).not.toBeInTheDocument();
  });
});

describe('manual entry by short ID', () => {
  it('sends a typed short ID as qrCredential, unchanged, with the same request shape', async () => {
    const backend = createBackend({ type: 'points' });
    renderScanner(backend);

    expect(screen.getByText(/identifiant court \(XXXXX-XXXXX\) du client/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)'), {
      target: { value: '  k7m2q-9xbd4 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Résoudre le client' }));
    await screen.findByText('Client trouvé');

    const resolves = backend.posts('/api/merchants/customers/resolve-for-transaction');
    expect(resolves).toHaveLength(1);
    expect(resolves[0].body).toEqual({ qrCredential: 'k7m2q-9xbd4' });
  });
});

describe('manual entry outcomes are always visible', () => {
  async function submitManual(value = 'ZZZZZ-ZZZZZ') {
    fireEvent.change(screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Résoudre le client' }));
  }

  it('shows the unknown-code message on a 404', async () => {
    renderScanner(createBackend({ resolveFailure: { status: 404, body: { message: 'Customer QR credential is invalid or revoked' } } }));
    await submitManual();
    await screen.findByText('Client introuvable');
    expect(screen.getByText("L'identifiant QR n'a pas pu être associé à un client")).toBeInTheDocument();
  });

  it('shows the no-programme message on a 404 from a business without an active programme', async () => {
    renderScanner(createBackend({ resolveFailure: { status: 404, body: { message: 'No active loyalty programme found for this business' } } }));
    await submitManual();
    expect(await screen.findByText('Aucun programme actif pour ce commerce')).toBeInTheDocument();
  });

  it('shows a generic message on a 500', async () => {
    renderScanner(createBackend({ resolveFailure: { status: 500, body: { message: 'Internal server error' } } }));
    await submitManual();
    expect(await screen.findByText('Une erreur est survenue. Veuillez réessayer.')).toBeInTheDocument();
  });

  it('shows a generic message when the network request fails', async () => {
    renderScanner(createBackend({ resolveFailure: 'network' }));
    await submitManual();
    expect(await screen.findByText('Une erreur est survenue. Veuillez réessayer.')).toBeInTheDocument();
  });

  it('shows the Arabic unknown-code message', async () => {
    const backend = createBackend({ resolveFailure: { status: 404, body: { message: 'Customer QR credential is invalid or revoked' } } });
    vi.stubGlobal('fetch', backend.fetch);
    window.localStorage.setItem('fideliy-locale', 'ar');
    render(tree(createAppStore(), true));
    const input = document.getElementById('manual-credential') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ZZZZZ-ZZZZZ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText('لم يمكن ربط معرف QR بأي عميل')).toBeInTheDocument();
  });
});
