import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../app/store';
import { AuthProvider } from '../../auth/AuthProvider';
import { I18nProvider } from '../../../shared/i18n/i18n';
import { createSession } from '../../../test-utils/mockBackend';
import LandingPage from './LandingPage';

type SessionReply = 'none' | 'present' | 'error';

function createBackend(reply: SessionReply) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input), 'http://localhost');
    calls.push(url.pathname);
    if (url.pathname === '/api/auth/get-session') {
      if (reply === 'error') return new Response(JSON.stringify({ message: 'down' }), { status: 500 });
      return new Response(JSON.stringify(reply === 'present' ? createSession() : null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'unexpected' }), { status: 404 });
  });
  return { fetch: fetchMock, sessionCalls: () => calls.filter((path) => path === '/api/auth/get-session').length };
}

function renderLanding(options: { locale?: 'fr' | 'ar'; session?: SessionReply } = {}) {
  const backend = createBackend(options.session ?? 'none');
  vi.stubGlobal('fetch', backend.fetch);
  window.localStorage.setItem('fideliy-locale', options.locale ?? 'fr');
  const view = render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/']}>
            <LandingPage />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </Provider>,
  );
  return { ...view, backend };
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.documentElement.lang = '';
  document.documentElement.dir = '';
});

describe('LandingPage', () => {
  it('has a skip link to the main landmark and exactly one h1', () => {
    renderLanding();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vos clients reviennent.');
    expect(screen.getByRole('link', { name: 'Aller au contenu principal' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('labels every section with its h2', () => {
    const { container } = renderLanding();
    const sections = container.querySelectorAll('main section');
    expect(sections.length).toBeGreaterThanOrEqual(9);
    for (const section of sections) {
      const labelId = section.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      expect(document.getElementById(labelId!)?.tagName).toMatch(/^H[12]$/);
    }
  });

  it('points the calls to action at the existing routes', () => {
    renderLanding();
    const createLinks = screen.getAllByRole('link', { name: 'Créer mon programme' });
    expect(createLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of createLinks) expect(link).toHaveAttribute('href', '/merchant/register');
    for (const link of screen.getAllByRole('link', { name: 'Connexion' })) {
      expect(link).toHaveAttribute('href', '/merchant/login');
    }
    expect(screen.getByRole('link', { name: 'Vous êtes client ? Mes cartes' })).toHaveAttribute('href', '/customer/login');
    expect(screen.getByRole('link', { name: 'Créer un compte commerçant' })).toHaveAttribute('href', '/merchant/register');
    expect(screen.getByRole('link', { name: 'Mes cartes' })).toHaveAttribute('href', '/customer/login');
  });

  it('links every navigation anchor to a section of the page', () => {
    renderLanding();
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    const anchors = within(nav).getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('#'));
    expect(anchors.map((link) => link.textContent)).toEqual(['Fonctionnalités', 'Comment ça marche', 'Estimation', 'Questions']);
    for (const link of anchors) {
      const id = link.getAttribute('href')!.slice(1);
      expect(document.getElementById(id)?.tagName).toBe('SECTION');
    }
  });

  it('renders the typed business name on the sample card, with a fallback when empty', () => {
    renderLanding();
    const input = screen.getByRole('textbox', { name: 'Le nom de votre commerce' });
    expect(input).toHaveAttribute('maxLength', '255');
    const hero = screen.getByTestId('hero-sample-card');
    expect(within(hero).getByText('Votre commerce')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Café Soleil' } });
    expect(within(hero).getByText('Café Soleil')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '   ' } });
    expect(within(hero).getByText('Votre commerce')).toBeInTheDocument();
  });

  it('adds stamps to the sample card in the counter demo, labelled as example data', () => {
    renderLanding();
    const demo = screen.getByTestId('demo-card');
    expect(within(demo).getByRole('img', { name: '3 / 10 Timbres' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un timbre (exemple)' }));
    expect(within(demo).getByRole('img', { name: '4 / 10 Timbres' })).toBeInTheDocument();
    const status = screen.getByTestId('demo-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent("Carte d'exemple : 4 / 10 Timbres");
    expect(screen.getByText("Données d'exemple : rien n'est enregistré.")).toBeInTheDocument();
  });

  it('shows login and register when there is no session', async () => {
    const { backend } = renderLanding();
    await waitFor(() => expect(backend.sessionCalls()).toBe(1));
    expect(screen.queryByRole('button', { name: 'Mon espace' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Connexion' }).length).toBeGreaterThanOrEqual(1);
  });

  it('offers the customer and merchant spaces when a session exists', async () => {
    renderLanding({ session: 'present' });
    const toggle = await screen.findByRole('button', { name: 'Mon espace' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(within(panel).getByRole('link', { name: 'Espace client' })).toHaveAttribute('href', '/customer');
    expect(within(panel).getByRole('link', { name: 'Espace commerçant' })).toHaveAttribute('href', '/merchant');
  });

  it('offers a retry when the session cannot be loaded', async () => {
    const { backend } = renderLanding({ session: 'error' });
    expect(await screen.findByRole('alert')).toHaveTextContent("Votre session n'a pas pu être chargée.");
    const calls = backend.sessionCalls();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(backend.sessionCalls()).toBeGreaterThan(calls));
  });

  it('closes the mobile menu with Escape and returns focus to its button', () => {
    renderLanding();
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(menuButton.getAttribute('aria-controls')!)!;
    expect(panel).toBeVisible();
    const firstLink = within(panel).getAllByRole('link')[0];
    firstLink.focus();
    fireEvent.keyDown(firstLink, { key: 'Escape' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();
  });

  it('switches language with pressed-state buttons and sets the document title', async () => {
    renderLanding();
    expect(document.title).toBe('FIDELIY — La carte de fidélité dans le téléphone de vos clients');
    const [arabic] = screen.getAllByRole('button', { name: 'العربية' });
    expect(arabic).toHaveAttribute('aria-pressed', 'false');
    expect(arabic).toHaveAttribute('lang', 'ar');
    expect(arabic).toHaveTextContent('ع');
    fireEvent.click(arabic);
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('خلّي كليانك يرجعولك.');
    expect(screen.getAllByRole('button', { name: 'العربية' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(document.title).toBe('FIDELIY — كارت الوفاء في تليفون الكليان متاعك');
  });

  it('renders in Arabic right to left', async () => {
    renderLanding({ locale: 'ar' });
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('خلّي كليانك يرجعولك.');
    for (const link of screen.getAllByRole('link', { name: 'أعمل البرنامج متاعي' })) {
      expect(link).toHaveAttribute('href', '/merchant/register');
    }
  });
});
