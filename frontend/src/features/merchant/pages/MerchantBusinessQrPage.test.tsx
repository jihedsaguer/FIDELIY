import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { I18nProvider } from '../../../shared/i18n/i18n';
import { buildJoinUrl } from '../utils/joinUrl';
import MerchantBusinessQrPage from './MerchantBusinessQrPage';

const QR_ID = '3f2b8c1e-9a4d-4e7b-8c21-5d6e7f809a1b';
const BUSINESS_NAME = 'Café Soleil';

type Reply = { status: number; body: unknown };

interface BackendOptions {
  setupReplies?: Reply[];
  programReply?: Reply;
}

const setupWithBusiness = {
  status: 'complete',
  business: { id: 'b1', publicQrId: QR_ID, name: BUSINESS_NAME, logoUrl: null },
  branches: [],
};

const activeProgram = { id: 'p1', type: 'stamps', status: 'active' };

function createBackend(options: BackendOptions = {}) {
  const setupReplies = [...(options.setupReplies ?? [{ status: 200, body: setupWithBusiness }])];
  const urls: string[] = [];
  const json = ({ status, body }: Reply) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input), 'http://localhost');
    urls.push(url.toString());
    if (url.pathname === '/api/merchants/business-setup') {
      const reply = setupReplies.length > 1 ? setupReplies.shift()! : setupReplies[0];
      return json(reply);
    }
    if (url.pathname === '/api/programs/current') {
      return json(options.programReply ?? { status: 200, body: activeProgram });
    }
    return json({ status: 404, body: { message: 'unexpected' } });
  });

  return {
    fetch: fetchMock,
    urls,
    setupCalls: () => urls.filter((u) => new URL(u).pathname === '/api/merchants/business-setup').length,
  };
}

function renderPage(backend: ReturnType<typeof createBackend>, locale: 'fr' | 'ar' = 'fr') {
  vi.stubGlobal('fetch', backend.fetch);
  window.localStorage.setItem('fideliy-locale', locale);
  return render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/merchant/business-qr']}>
          <MerchantBusinessQrPage />
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );
}

const QR_NAME = `Code QR pour rejoindre le programme de fidélité de ${BUSINESS_NAME}`;
const expectedUrl = () => buildJoinUrl(window.location.origin, QR_ID);

beforeEach(() => {
  window.localStorage.clear();
  // jsdom has no canvas 2D context; the QR library skips drawing when it is null.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MerchantBusinessQrPage', () => {
  it('shows a loading state while the business loads', () => {
    renderPage(createBackend());
    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
  });

  it('shows the business name, the QR with its accessible name and the join URL', async () => {
    const backend = createBackend();
    const { container } = renderPage(backend);

    expect(await screen.findByRole('img', { name: QR_NAME })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: "Mon QR d'entreprise" })).toBeInTheDocument();
    expect(screen.getAllByText(BUSINESS_NAME).length).toBeGreaterThan(0);
    const url = screen.getByTestId('business-qr-url');
    expect(url).toHaveTextContent(expectedUrl());
    expect(url).toHaveAttribute('dir', 'ltr');
    expect(expectedUrl()).toBe(`${window.location.origin}/qr/${QR_ID}`);
    expect(container.querySelector('main')).toBeNull();
  });

  it('only calls the API under /api', async () => {
    const backend = createBackend();
    renderPage(backend);
    await screen.findByRole('img', { name: QR_NAME });
    await waitFor(() => expect(backend.urls.some((u) => u.includes('/programs/current'))).toBe(true));
    for (const url of backend.urls) {
      expect(new URL(url).pathname.startsWith('/api/')).toBe(true);
    }
  });

  it('asks to set up the business when there is none', async () => {
    renderPage(createBackend({ setupReplies: [{ status: 200, body: { status: 'required', business: null, branches: [] } }] }));
    expect(await screen.findByText('Aucune entreprise configurée')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Configurer l'entreprise" })).toHaveAttribute('href', '/merchant/onboarding');
    expect(screen.queryByRole('img', { name: QR_NAME })).not.toBeInTheDocument();
  });

  it('shows a localized error and retries the load', async () => {
    const backend = createBackend({
      setupReplies: [
        { status: 500, body: { message: 'boom internal' } },
        { status: 200, body: setupWithBusiness },
      ],
    });
    renderPage(backend);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Impossible de charger votre code QR d'entreprise.");
    expect(alert).not.toHaveTextContent('boom internal');
    const before = backend.setupCalls();

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('img', { name: QR_NAME })).toBeInTheDocument();
    expect(backend.setupCalls()).toBeGreaterThan(before);
  });

  it('copies the join URL and announces it', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPage(createBackend());

    fireEvent.click(await screen.findByRole('button', { name: 'Copier le lien' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expectedUrl()));
    expect(await screen.findByText('Lien copié')).toBeInTheDocument();
  });

  it('tells the merchant to copy manually when the clipboard fails', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied');
    });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPage(createBackend());

    fireEvent.click(await screen.findByRole('button', { name: 'Copier le lien' }));
    expect(
      await screen.findByText('Copie impossible. Sélectionnez le lien et copiez-le manuellement.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Lien copié')).not.toBeInTheDocument();
  });

  it('prints with the browser print dialog', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    renderPage(createBackend());

    fireEvent.click(await screen.findByRole('button', { name: "Imprimer l'affiche" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('downloads a PNG from the high-resolution canvas', async () => {
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,AAAA');
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    const { container } = renderPage(createBackend());

    fireEvent.click(await screen.findByRole('button', { name: 'Télécharger en PNG' }));
    expect(toDataURL).toHaveBeenCalledWith('image/png');
    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe('data:image/png;base64,AAAA');
    expect(clicked[0].getAttribute('download')).toMatch(/\.png$/);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('width', '1024');
    expect(canvas?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('downloads an SVG file and releases the object URL', async () => {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:qr-svg';
    });
    const revokeObjectURL = vi.fn();
    // Replace the object-URL functions for this test only, then restore them.
    const original = {
      create: Object.getOwnPropertyDescriptor(URL, 'createObjectURL'),
      revoke: Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL'),
    };
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true });
    onTestFinished(() => {
      for (const [name, descriptor] of [
        ['createObjectURL', original.create],
        ['revokeObjectURL', original.revoke],
      ] as const) {
        if (descriptor) Object.defineProperty(URL, name, descriptor);
        else Reflect.deleteProperty(URL, name);
      }
    });
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    renderPage(createBackend());

    fireEvent.click(await screen.findByRole('button', { name: 'Télécharger en SVG' }));
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe('image/svg+xml');
    const text = await blobs[0].text();
    expect(text).toContain('<svg');
    expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(text).not.toContain('aria-label');
    expect(clicked).toHaveLength(1);
    expect(clicked[0].getAttribute('download')).toMatch(/\.svg$/);
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr-svg'), { timeout: 2000 });
  });

  it('warns that customers cannot join without an active programme, keeping downloads and print enabled', async () => {
    renderPage(createBackend({ programReply: { status: 200, body: null } }));

    const notice = await screen.findByText('Aucun programme actif : vos clients ne peuvent pas encore rejoindre.');
    expect(within(notice.closest('[role="status"]') as HTMLElement).getByRole('link', { name: 'Aller aux programmes' }))
      .toHaveAttribute('href', '/merchant/programs');
    for (const name of ['Télécharger en PNG', 'Télécharger en SVG', "Imprimer l'affiche"]) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }
  });

  it('omits the programme notice when the programme query fails', async () => {
    const backend = createBackend({ programReply: { status: 500, body: { message: 'boom' } } });
    renderPage(backend);

    await screen.findByRole('img', { name: QR_NAME });
    await waitFor(() => expect(backend.urls.some((u) => u.includes('/programs/current'))).toBe(true));
    expect(screen.queryByText(/Aucun programme actif/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert', { name: /programme/ })).not.toBeInTheDocument();
  });

  it('does not show the programme notice when a programme is active', async () => {
    const backend = createBackend();
    renderPage(backend);
    await screen.findByRole('img', { name: QR_NAME });
    await waitFor(() => expect(backend.urls.some((u) => u.includes('/programs/current'))).toBe(true));
    expect(screen.queryByText(/Aucun programme actif/)).not.toBeInTheDocument();
  });

  it('warns not to print or share on a local http origin', async () => {
    // jsdom runs on http://localhost:3000.
    expect(window.location.origin.startsWith('http://localhost')).toBe(true);
    renderPage(createBackend());
    expect(await screen.findByText(/N'imprimez pas et ne partagez pas ce code/)).toBeInTheDocument();
  });

  it('prints a bilingual poster in French and Tunisian Darija whatever the UI language', async () => {
    renderPage(createBackend(), 'fr');
    await screen.findByRole('img', { name: QR_NAME });

    const poster = screen.getByTestId('business-qr-poster');
    expect(poster).toHaveClass('hidden');
    expect(poster).toHaveTextContent(BUSINESS_NAME);
    expect(poster).toHaveTextContent('FIDELIY');
    expect(poster).toHaveTextContent(expectedUrl());

    const fr = within(poster).getByText('Scannez pour rejoindre notre programme de fidélité').closest('[lang]');
    expect(fr).toHaveAttribute('lang', 'fr');
    expect(fr).toHaveAttribute('dir', 'ltr');
    expect(fr).toHaveTextContent("Ouvrez l'appareil photo de votre téléphone et pointez-le vers le code.");

    const ar = within(poster).getByText('سكاني الكود وادخل لبرنامج الوفاء متاعنا').closest('[lang]');
    expect(ar).toHaveAttribute('lang', 'ar');
    expect(ar).toHaveAttribute('dir', 'rtl');
    expect(ar).toHaveTextContent('حلّ الكاميرا متاع تليفونك ووجّهها للكود.');
    expect(ar?.className).not.toMatch(/uppercase|tracking-/);
  });

  it('renders Arabic UI while keeping the URL left-to-right and the poster bilingual', async () => {
    renderPage(createBackend(), 'ar');
    expect(await screen.findByTestId('business-qr-url')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('heading', { level: 1, name: 'رمز QR متاع المحل' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `رمز QR باش تدخل لبرنامج الوفاء متاع ${BUSINESS_NAME}` })).toBeInTheDocument();
    const poster = screen.getByTestId('business-qr-poster');
    expect(poster).toHaveTextContent('Scannez pour rejoindre notre programme de fidélité');
    expect(poster).toHaveTextContent('سكاني الكود وادخل لبرنامج الوفاء متاعنا');
  });
});
