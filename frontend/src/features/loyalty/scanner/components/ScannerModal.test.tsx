import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../../app/store';
import { I18nProvider } from '../../../../shared/i18n/i18n';
import { CameraStartError, type CameraErrorKind } from '../hooks/useCamera';
import { ScannerModal } from './ScannerModal';

// jsdom has no camera: replace the hook with a fake that models open camera sessions.
// `stop()` releases every session, as the real hook does (the current reader is reset and a
// stale one resets itself when its stream arrives).
const cameraMock = vi.hoisted(() => ({
  failKind: undefined as undefined | string,
  sessions: [] as Array<{ open: boolean }>,
  videoRef: { current: null as HTMLVideoElement | null },
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('../hooks/useCamera', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useCamera')>()),
  useCamera: () => cameraMock,
}));

function openSessions() {
  return cameraMock.sessions.filter((s) => s.open).length;
}

beforeEach(() => {
  cameraMock.failKind = undefined;
  cameraMock.sessions = [];
  cameraMock.start.mockReset().mockImplementation(async () => {
    if (cameraMock.failKind) throw new CameraStartError(cameraMock.failKind as CameraErrorKind);
    cameraMock.sessions.push({ open: true });
  });
  cameraMock.stop.mockReset().mockImplementation(() => {
    cameraMock.sessions.forEach((s) => {
      s.open = false;
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function tree(isOpen: boolean, store = createAppStore()) {
  return (
    <Provider store={store}>
      <I18nProvider>
        <ScannerModal isOpen={isOpen} onClose={() => undefined} branchId="branch-1" />
      </I18nProvider>
    </Provider>
  );
}

function renderScanner(isOpen = true, locale: 'fr' | 'ar' = 'fr') {
  window.localStorage.setItem('fideliy-locale', locale);
  return render(tree(isOpen));
}

const MANUAL_PLACEHOLDER = 'Code QR ou identifiant court (XXXXX-XXXXX)';

describe('ScannerModal manual customer QR entry', () => {
  it('keeps what the merchant types into the manual QR identifier field', () => {
    renderScanner();
    const input = screen.getByPlaceholderText(MANUAL_PLACEHOLDER);

    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(input).toHaveValue('abc');
    expect(screen.getByRole('button', { name: 'Résoudre le client' })).toBeEnabled();
  });

  it('starts with an empty field again after the scanner is closed and reopened', () => {
    const store = createAppStore();
    window.localStorage.setItem('fideliy-locale', 'fr');
    const { rerender } = render(tree(true, store));
    fireEvent.change(screen.getByPlaceholderText(MANUAL_PLACEHOLDER), { target: { value: 'abc' } });

    rerender(tree(false, store));
    rerender(tree(true, store));

    expect(screen.getByPlaceholderText(MANUAL_PLACEHOLDER)).toHaveValue('');
  });
});

describe('ScannerModal camera lifecycle', () => {
  it('starts the camera on the video element when a scanner mounted closed is opened', async () => {
    const store = createAppStore();
    window.localStorage.setItem('fideliy-locale', 'fr');
    const { rerender } = render(tree(false, store));
    expect(cameraMock.start).not.toHaveBeenCalled();

    rerender(tree(true, store));

    await waitFor(() => expect(cameraMock.start).toHaveBeenCalledTimes(1));
    const [video] = cameraMock.start.mock.calls[0];
    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect(document.body.contains(video as Node)).toBe(true);
  });

  it('releases the camera on close and starts it again on reopen', async () => {
    const store = createAppStore();
    window.localStorage.setItem('fideliy-locale', 'fr');
    const { rerender } = render(tree(false, store));
    rerender(tree(true, store));
    await waitFor(() => expect(openSessions()).toBe(1));

    rerender(tree(false, store));
    expect(cameraMock.stop).toHaveBeenCalled();
    expect(openSessions()).toBe(0);

    rerender(tree(true, store));
    await waitFor(() => expect(cameraMock.start).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(openSessions()).toBe(1));
  });

  it('leaves exactly one camera session under StrictMode and none after closing', async () => {
    const store = createAppStore();
    window.localStorage.setItem('fideliy-locale', 'fr');
    const strictTree = (isOpen: boolean) => <StrictMode>{tree(isOpen, store)}</StrictMode>;
    const { rerender } = render(strictTree(true));

    await waitFor(() => expect(cameraMock.start).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(openSessions()).toBe(1));

    rerender(strictTree(false));
    expect(openSessions()).toBe(0);
  });

  it('releases the camera when unmounted', async () => {
    const { unmount } = renderScanner();
    await waitFor(() => expect(openSessions()).toBe(1));

    unmount();

    expect(openSessions()).toBe(0);
  });
});

describe('ScannerModal camera errors', () => {
  it('shows the permission step with manual entry when camera access is denied', async () => {
    cameraMock.failKind = 'denied';
    renderScanner();

    expect(await screen.findByText('Accès à la caméra requis')).toBeInTheDocument();
    expect(screen.getByText(/paramètres du site/)).toBeInTheDocument();
    const input = screen.getByPlaceholderText(MANUAL_PLACEHOLDER);
    fireEvent.change(input, { target: { value: 'k7m2q-9xbd4' } });
    expect(screen.getByRole('button', { name: 'Résoudre le client' })).toBeEnabled();
  });

  it.each([
    ['insecure', /adresse sécurisée \(https\)/],
    ['unsupported', /Chrome ou Safari/],
    ['no-camera', /Aucune caméra/],
    ['busy', /déjà utilisée par une autre application/],
    ['unknown', /Impossible de démarrer la caméra/],
  ])('explains the %s failure in French and keeps manual entry', async (kind, message) => {
    cameraMock.failKind = kind;
    renderScanner();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText('Erreur de caméra')).toBeInTheDocument();
    expect(screen.queryByText('Accès à la caméra requis')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(MANUAL_PLACEHOLDER)).toBeInTheDocument();
  });

  it('explains a busy camera in Darija', async () => {
    cameraMock.failKind = 'busy';
    renderScanner(true, 'ar');

    expect(await screen.findByText(/مستعملة في تطبيق آخر/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('رمز QR أو المعرّف القصير (XXXXX-XXXXX)')).toBeInTheDocument();
  });

  it('tries the camera again from the error step', async () => {
    cameraMock.failKind = 'busy';
    renderScanner();
    await screen.findByText(/déjà utilisée/);

    cameraMock.failKind = undefined;
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(cameraMock.start).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(openSessions()).toBe(1));
  });
});

describe('ScannerModal manual entry form', () => {
  it('submits the typed identifier when Enter is pressed (real form)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderScanner();
    const input = screen.getByPlaceholderText(MANUAL_PLACEHOLDER);
    fireEvent.change(input, { target: { value: 'k7m2q-9xbd4' } });

    expect(input.closest('form')).not.toBeNull();
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
