import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { I18nProvider } from '../../../shared/i18n/i18n';
import type { ProgramDto } from '../api/programApi';
import MerchantProgramsPage from './MerchantProgramsPage';

function makeProgram(overrides: Partial<ProgramDto> = {}): ProgramDto {
  return {
    id: 'p2',
    businessId: 'b1',
    name: 'Carte Café Soleil',
    description: null,
    type: 'both',
    version: 2,
    status: 'active',
    activatedAt: '2026-05-01T10:00:00.000Z',
    deactivatedAt: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    configurations: {
      stamps: {
        earningRule: { purchasesPerStamp: 1 },
        rewardThresholds: [{ stampsRequired: 10, name: 'Café offert', isActive: true }],
      },
      points: {
        earningRule: { pointsPerCurrencyUnit: 1.5, currencyCode: 'TND' },
        rewardThresholds: [{ pointsRequired: 200, name: 'Remise 10 %', isActive: true }],
      },
    },
    ...overrides,
  };
}

const OLD_PROGRAM = makeProgram({
  id: 'p1',
  name: 'Ancienne carte',
  type: 'stamps',
  version: 1,
  status: 'inactive',
  activatedAt: '2026-01-01T10:00:00.000Z',
  deactivatedAt: '2026-05-01T10:00:00.000Z',
  configurations: {
    stamps: { rewardThresholds: [{ stampsRequired: 8, name: 'Thé offert' }] },
    points: {},
  },
});

interface BackendOptions {
  current?: ProgramDto | null;
  history?: ProgramDto[];
  failCurrentTimes?: number;
  createStatus?: number;
}

function createBackend(options: BackendOptions = {}) {
  let current: ProgramDto | null = options.current === undefined ? null : options.current;
  let history: ProgramDto[] = options.history ?? (current ? [current] : []);
  let failures = options.failCurrentTimes ?? 0;
  const calls = { current: 0, history: 0, posts: [] as unknown[], patches: [] as string[] };
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(new URL(String(input), 'http://localhost'));
    const url = new URL(request.url, 'http://localhost');

    if (url.pathname === '/api/programs/current' && request.method === 'GET') {
      calls.current += 1;
      if (failures > 0) {
        failures -= 1;
        return json(500, { message: 'boom' });
      }
      return json(200, current);
    }
    if (url.pathname === '/api/programs/history' && request.method === 'GET') {
      calls.history += 1;
      return json(200, history);
    }
    if (url.pathname === '/api/programs/enhanced' && request.method === 'POST') {
      const body = await request.json();
      calls.posts.push(body);
      if (options.createStatus && options.createStatus >= 400) {
        return json(options.createStatus, { message: ['name must be shorter'], error: 'Bad Request' });
      }
      const created = makeProgram({ id: 'p9', name: body.name, type: body.type, version: 9 });
      history = [created, ...history.map((p) => ({ ...p, status: 'inactive' as const }))];
      current = created;
      return json(201, created);
    }
    const deactivate = url.pathname.match(/^\/api\/programs\/([^/]+)\/deactivate$/);
    if (deactivate && request.method === 'PATCH') {
      calls.patches.push(deactivate[1]);
      history = history.map((p) => (p.id === deactivate[1] ? { ...p, status: 'inactive' as const } : p));
      current = null;
      return json(200, { success: true, message: 'ok' });
    }
    return json(404, { message: 'unexpected' });
  });

  return { fetch: fetchMock, calls };
}

function renderPage(backend: ReturnType<typeof createBackend>, locale: 'fr' | 'ar' = 'fr') {
  vi.stubGlobal('fetch', backend.fetch);
  window.localStorage.setItem('fideliy-locale', locale);
  return render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <MemoryRouter>
          <MerchantProgramsPage />
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );
}

describe('MerchantProgramsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state first', async () => {
    renderPage(createBackend({ current: makeProgram() }));
    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
    expect(await screen.findByRole('heading', { name: 'Carte Café Soleil' })).toBeInTheDocument();
  });

  it('shows the empty state with a create action when there is no active programme', async () => {
    renderPage(createBackend({ current: null, history: [] }));
    expect(await screen.findByText('Aucun programme actif')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer un programme' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Se déconnecter/ })).not.toBeInTheDocument();
  });

  it('shows the active programme with its real rewards and keeps it out of the closed history', async () => {
    renderPage(createBackend({ current: makeProgram(), history: [makeProgram(), OLD_PROGRAM] }));

    const card = (await screen.findByRole('heading', { name: 'Carte Café Soleil' })).closest('article');
    expect(card).not.toBeNull();
    const active = within(card as HTMLElement);
    expect(active.getByText('Café offert')).toBeInTheDocument();
    expect(active.getByText('Remise 10 %')).toBeInTheDocument();
    expect(active.getByText('1,5')).toBeInTheDocument();
    expect(active.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer une nouvelle version' })).toBeInTheDocument();

    const historyTrigger = screen.getByRole('button', { name: /Historique des programmes/ });
    expect(historyTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(historyTrigger).toHaveTextContent('1');
    expect(screen.queryByText('Ancienne carte')).not.toBeInTheDocument();

    fireEvent.click(historyTrigger);
    const region = screen.getByRole('region', { name: /Historique des programmes/ });
    expect(within(region).getByText('Ancienne carte')).toBeInTheDocument();
    expect(within(region).getByText('Inactif')).toBeInTheDocument();
    expect(within(region).queryByText('Carte Café Soleil')).not.toBeInTheDocument();
  });

  it('shows an empty history when the only version is the active one', async () => {
    renderPage(createBackend({ current: makeProgram(), history: [makeProgram()] }));
    const trigger = await screen.findByRole('button', { name: /Historique des programmes/ });
    expect(trigger).toHaveTextContent('0');
    fireEvent.click(trigger);
    expect(screen.getByText('Aucune version précédente')).toBeInTheDocument();
  });

  it('shows a localized error and refetches both requests on retry, without reloading', async () => {
    const backend = createBackend({ current: makeProgram(), failCurrentTimes: 1 });
    renderPage(backend);

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger vos programmes.');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('heading', { name: 'Carte Café Soleil' })).toBeInTheDocument();
    expect(backend.calls.current).toBe(2);
    expect(backend.calls.history).toBe(2);
  });

  it('creates a combined programme from the modal and refreshes the page data', async () => {
    const user = userEvent.setup();
    const backend = createBackend({ current: null, history: [] });
    renderPage(backend);

    await user.click(await screen.findByRole('button', { name: 'Créer un programme' }));
    const dialog = screen.getByRole('dialog', { name: 'Créer un programme' });
    const form = within(dialog);

    await user.type(form.getByLabelText(/Nom du programme/), 'Carte Café Soleil');

    const typeBox = form.getByRole('combobox', { name: /Type de programme/ });
    typeBox.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(typeBox).toHaveTextContent('Combiné');

    const stamps = within(form.getByRole('group', { name: 'Configuration des timbres' }));
    await user.type(stamps.getByLabelText(/Nom de la récompense/), 'Café offert');
    await user.click(stamps.getByRole('combobox', { name: /Timbres requis/ }));
    await user.click(stamps.getByRole('option', { name: '8' }));

    const points = within(form.getByRole('group', { name: 'Configuration des points' }));
    await user.type(points.getByLabelText(/Nom de la récompense/), 'Remise');
    const rate = points.getByLabelText(/Points par TND/);
    await user.clear(rate);
    await user.type(rate, '1.5');
    await user.click(points.getByRole('combobox', { name: /Points requis/ }));
    await user.click(points.getByRole('option', { name: 'Autre' }));
    const custom = points.getByLabelText('Saisissez un nombre');
    await user.clear(custom);
    await user.type(custom, '7');

    const callsBefore = backend.calls.current;
    await user.click(form.getByRole('button', { name: 'Créer' }));

    await waitFor(() => expect(backend.calls.posts).toHaveLength(1));
    expect(backend.calls.posts[0]).toEqual({
      name: 'Carte Café Soleil',
      type: 'both',
      stamps: {
        earningRule: { purchasesPerStamp: 1 },
        rewardThresholds: [{ stampsRequired: 8, name: 'Café offert', isActive: true }],
      },
      points: {
        earningRule: { pointsPerCurrencyUnit: 1.5, currencyCode: 'TND' },
        rewardThresholds: [{ pointsRequired: 7, name: 'Remise', isActive: true }],
      },
    });

    expect(await screen.findByText('Programme créé et activé.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(backend.calls.current).toBeGreaterThan(callsBefore));
    expect(await screen.findByRole('heading', { name: 'Carte Café Soleil' })).toBeInTheDocument();
  });

  it('shows localized field errors and sends nothing when the name is empty', async () => {
    const user = userEvent.setup();
    const backend = createBackend({ current: null, history: [] });
    renderPage(backend);

    await user.click(await screen.findByRole('button', { name: 'Créer un programme' }));
    const dialog = screen.getByRole('dialog', { name: 'Créer un programme' });
    await user.click(within(dialog).getByRole('button', { name: 'Créer' }));

    expect(within(dialog).getByText('Donnez un nom au programme')).toBeInTheDocument();
    expect(within(dialog).getByText('Donnez un nom à la récompense')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Nom du programme/)).toHaveAttribute('aria-invalid', 'true');
    expect(backend.calls.posts).toHaveLength(0);
  });

  it('keeps the modal open with a localized error when the backend rejects the programme', async () => {
    const user = userEvent.setup();
    const backend = createBackend({ current: makeProgram(), createStatus: 400 });
    renderPage(backend);

    await user.click(await screen.findByRole('button', { name: 'Créer une nouvelle version' }));
    const dialog = screen.getByRole('dialog', { name: 'Créer une nouvelle version' });
    expect(within(dialog).getByText(/remplacera le programme actuel/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/Nom du programme/), 'V3');
    await user.type(within(dialog).getByLabelText(/Nom de la récompense/), 'Café');
    await user.click(within(dialog).getByRole('button', { name: 'Créer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Impossible de créer le programme. Vérifiez les informations et réessayez.',
    );
    expect(screen.queryByText(/name must be shorter/)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Créer une nouvelle version' })).toBeInTheDocument();
  });

  it('deactivates the active programme only after confirmation', async () => {
    const user = userEvent.setup();
    const backend = createBackend({ current: makeProgram() });
    renderPage(backend);

    await user.click(await screen.findByRole('button', { name: 'Désactiver le programme' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Désactiver ce programme ?' });
    expect(backend.calls.patches).toHaveLength(0);
    expect(within(confirm).getByRole('button', { name: 'Annuler' })).toHaveFocus();

    await user.click(within(confirm).getByRole('button', { name: 'Désactiver le programme' }));

    await waitFor(() => expect(backend.calls.patches).toEqual(['p2']));
    expect(await screen.findByText('Programme désactivé.')).toBeInTheDocument();
    expect(await screen.findByText('Aucun programme actif')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders in Arabic, right to left', async () => {
    renderPage(createBackend({ current: makeProgram() }), 'ar');
    expect(await screen.findByRole('button', { name: 'اعمل نسخة جديدة' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'البرامج' })).toBeInTheDocument();
    expect(screen.getByText('برنامج الفيديليتي', { exact: false, selector: 'p' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
  });
});
