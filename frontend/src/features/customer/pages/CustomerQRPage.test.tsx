import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { I18nProvider } from '../../../shared/i18n/i18n';
import CustomerQRPage from './CustomerQRPage';

const ISSUED_AT = '2026-03-04T10:00:00.000Z';
const SECRET = 'secret-credential-value-abc123';
const SHORT = 'K7M2Q-9XBD4';
const ROTATED_SECRET = 'rotated-credential-value-xyz789';
const ROTATED_SHORT = 'R2T5V-8WCF1';

type Reply = { status: number; body?: unknown };
type Call = { method: string; path: string };

/** Minimal fake of the three personal-QR endpoints, stateful like the backend. */
function createQrBackend(
  options: { issued?: boolean; legacy?: boolean; postReply?: Reply; getReply?: Reply } = {},
) {
  let issued = options.issued ?? false;
  let legacy = options.legacy ?? false;
  let current = { credential: SECRET, shortCode: SHORT };
  const calls: Call[] = [];
  const json = ({ status, body }: Reply) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input), 'http://localhost');
    const method = (request?.method ?? init?.method ?? 'GET').toUpperCase();
    calls.push({ method, path: url.pathname });

    if (url.pathname === '/api/customers/personal-qr' && method === 'GET') {
      if (options.getReply) return json(options.getReply);
      if (issued && legacy) {
        return json({
          status: 200,
          body: { issuedAt: ISSUED_AT, active: true, credential: null, shortCode: null, requiresRotation: true },
        });
      }
      return issued
        ? json({ status: 200, body: { issuedAt: ISSUED_AT, active: true, ...current } })
        : json({ status: 404, body: { message: 'Personal QR credential has not been issued' } });
    }
    if (url.pathname === '/api/customers/personal-qr' && method === 'POST') {
      if (options.postReply) {
        if (options.postReply.status === 409) issued = true;
        return json(options.postReply);
      }
      if (issued) return json({ status: 409, body: { message: 'exists' } });
      issued = true;
      return json({ status: 201, body: { ...current, issuedAt: ISSUED_AT } });
    }
    if (url.pathname === '/api/customers/personal-qr/rotate' && method === 'POST') {
      issued = true;
      legacy = false;
      current = { credential: ROTATED_SECRET, shortCode: ROTATED_SHORT };
      return json({ status: 201, body: { ...current, issuedAt: ISSUED_AT } });
    }
    return json({ status: 404, body: { message: 'unexpected' } });
  });

  return {
    fetch: fetchMock,
    calls,
    posts: () => calls.filter((call) => call.method === 'POST'),
  };
}

function renderPage(backend: ReturnType<typeof createQrBackend>, locale: 'fr' | 'ar' = 'fr') {
  vi.stubGlobal('fetch', backend.fetch);
  window.localStorage.setItem('fideliy-locale', locale);
  return render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/customer/qr']}>
          <CustomerQRPage />
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );
}

function storageValues() {
  const values: string[] = [];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)!;
      values.push(key, storage.getItem(key) ?? '');
    }
  }
  return values.join('\n');
}

const QR_IMAGE = 'Votre code QR personnel FIDELIY';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  // jsdom has no canvas 2D context; the QR library skips drawing when it is null.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CustomerQRPage', () => {
  it('offers to create a QR when none is issued, then shows the QR and short ID', async () => {
    const backend = createQrBackend();
    const { container } = renderPage(backend);

    const create = await screen.findByRole('button', { name: 'Créer mon code QR' });
    expect(backend.posts()).toHaveLength(0);
    expect(screen.queryByRole('img', { name: QR_IMAGE })).not.toBeInTheDocument();

    fireEvent.click(create);

    expect(await screen.findByRole('img', { name: QR_IMAGE })).toBeInTheDocument();
    expect(await screen.findByText(SHORT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Enregistrer l'image" })).toBeInTheDocument();
    expect(screen.queryByText(/qu'une seule fois/)).not.toBeInTheDocument();
    expect(backend.posts()).toEqual([{ method: 'POST', path: '/api/customers/personal-qr' }]);
    expect(container.querySelector('main')).toBeNull();
  });

  it('shows the QR and a copyable, LTR short ID from GET without any POST', async () => {
    const backend = createQrBackend({ issued: true });
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPage(backend);

    expect(await screen.findByRole('img', { name: QR_IMAGE })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Enregistrer l'image" })).toBeInTheDocument();
    expect(screen.getByText('Identifiant à donner au commerçant si le scan échoue')).toBeInTheDocument();
    expect(screen.getByText(SHORT)).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('button', { name: 'Générer un nouveau code QR' })).toBeInTheDocument();
    expect(backend.posts()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: "Copier l'identifiant" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SHORT));
    expect(await screen.findByText('Identifiant copié')).toBeInTheDocument();
  });

  it('asks to rotate once when the stored QR cannot be displayed (requiresRotation)', async () => {
    const backend = createQrBackend({ issued: true, legacy: true });
    renderPage(backend);

    expect(await screen.findByText(/Votre ancien code QR ne peut plus être affiché/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: QR_IMAGE })).not.toBeInTheDocument();
    expect(screen.queryByText(SHORT)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Générer un nouveau code QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Générer le nouveau code' }));

    expect(await screen.findByRole('img', { name: QR_IMAGE })).toBeInTheDocument();
    expect(await screen.findByText(ROTATED_SHORT)).toBeInTheDocument();
    expect(backend.posts()).toEqual([{ method: 'POST', path: '/api/customers/personal-qr/rotate' }]);
  });

  it('treats a 409 on creation as already issued and then shows the current QR', async () => {
    const backend = createQrBackend({ postReply: { status: 409, body: { message: 'exists' } } });
    renderPage(backend);

    fireEvent.click(await screen.findByRole('button', { name: 'Créer mon code QR' }));

    expect(await screen.findByRole('img', { name: QR_IMAGE })).toBeInTheDocument();
    expect(await screen.findByText(SHORT)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('requires confirmation before rotating, and cancel keeps the current QR', async () => {
    const backend = createQrBackend({ issued: true });
    renderPage(backend);

    fireEvent.click(await screen.findByRole('button', { name: 'Générer un nouveau code QR' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Générer un nouveau code QR ?' });
    expect(dialog).toHaveTextContent(/cesseront immédiatement de fonctionner/);
    expect(backend.posts()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backend.posts()).toHaveLength(0);
    expect(screen.getByText(SHORT)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Générer un nouveau code QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Générer le nouveau code' }));

    expect(await screen.findByText(ROTATED_SHORT)).toBeInTheDocument();
    expect(screen.queryByText(SHORT)).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backend.posts()).toEqual([{ method: 'POST', path: '/api/customers/personal-qr/rotate' }]);
    expect(storageValues()).not.toContain(ROTATED_SECRET);
    expect(storageValues()).not.toContain(ROTATED_SHORT);
  });

  it('shows a localized error with a working retry when the status cannot be loaded', async () => {
    const backend = createQrBackend({ getReply: { status: 500, body: { message: 'boom internal' } } });
    renderPage(backend);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Impossible de charger l'état de votre code QR.");
    expect(alert).not.toHaveTextContent('boom internal');
    const getsBefore = backend.calls.filter((call) => call.method === 'GET').length;

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() =>
      expect(backend.calls.filter((call) => call.method === 'GET').length).toBeGreaterThan(getsBefore),
    );
    expect(backend.posts()).toHaveLength(0);
  });

  it('shows a localized error and retries creation when the POST fails', async () => {
    const backend = createQrBackend({ postReply: { status: 500, body: { message: 'boom' } } });
    renderPage(backend);

    fireEvent.click(await screen.findByRole('button', { name: 'Créer mon code QR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de créer votre code QR.');

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(backend.posts()).toHaveLength(2));
  });

  it('renders Arabic strings', async () => {
    renderPage(createQrBackend(), 'ar');
    expect(await screen.findByRole('button', { name: 'إنشاء رمز QR الخاص بي' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'رمز QR الخاص بك' })).toBeInTheDocument();
  });
});
