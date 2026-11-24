import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { I18nProvider } from '../../../shared/i18n/i18n';
import { createPopulatedSetup } from '../../../test-utils/mockBackend';
import MerchantBusinessProfilePage from './MerchantBusinessProfilePage';

type Call = { method: string; path: string; body: unknown };

function createBackend(logoUrl: string | null) {
  const setup = createPopulatedSetup();
  setup.status = 'complete';
  setup.business!.logoUrl = logoUrl;
  const calls: Call[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input), 'http://localhost');
    const method = init.method ?? request?.method ?? 'GET';
    const raw = init.body ?? (request ? await request.clone().text() : undefined);
    const body = typeof raw === 'string' && raw ? JSON.parse(raw) : undefined;
    calls.push({ method, path: url.pathname, body });
    if (url.pathname === '/api/merchants/business-setup' && method === 'GET') return json(setup);
    if (url.pathname === '/api/merchants/business-setup/business' && method === 'PATCH') {
      if (typeof body?.logoUrl === 'string') setup.business!.logoUrl = body.logoUrl;
      return json(setup);
    }
    return json({ message: 'unexpected' }, 404);
  });
  return { fetch: fetchMock, calls };
}

function renderPage(backend: ReturnType<typeof createBackend>, locale: 'fr' | 'ar' = 'fr') {
  vi.stubGlobal('fetch', backend.fetch);
  window.localStorage.setItem('fideliy-locale', locale);
  return render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/merchant/business-profile']}>
          <MerchantBusinessProfilePage />
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MerchantBusinessProfilePage logo', () => {
  it('shows the preset name, offers no file upload and saves a newly chosen preset', async () => {
    const backend = createBackend('preset:coffee');
    renderPage(backend);
    expect(await screen.findByText('Café')).toBeInTheDocument();
    // The device logo endpoint is no longer requested.
    expect(backend.calls.some((call) => call.path.endsWith('/logo'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByRole('group', { name: 'Logo de votre commerce' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Café' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Fleuriste' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(backend.calls.find((call) => call.method === 'PATCH')?.body).toEqual({ logoUrl: 'preset:flowers' }),
    );
    expect(await screen.findByText('Entreprise mise à jour avec succès')).toBeInTheDocument();
    expect(backend.calls.some((call) => call.path.endsWith('/logo'))).toBe(false);
  });

  it('keeps an existing URL logo when saving other changes', async () => {
    const backend = createBackend('https://example.com/logo.png');
    renderPage(backend);
    await screen.findByText('Logo actuel');
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByRole('radio', { name: 'Logo actuel' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Aucune modification apportée')).toBeInTheDocument();
    expect(backend.calls.some((call) => call.method === 'PATCH')).toBe(false);
  });

  it('renders the picker in Darija', async () => {
    renderPage(createBackend('preset:barber'), 'ar');
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل' }));
    expect(screen.getByRole('group', { name: 'لوغو المحل متاعك' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'حجّام' })).toBeChecked();
  });
});
