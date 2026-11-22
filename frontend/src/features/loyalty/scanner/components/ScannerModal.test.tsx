import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../../app/store';
import { I18nProvider } from '../../../../shared/i18n/i18n';
import { ScannerModal } from './ScannerModal';

// jsdom has no getUserMedia: replace the camera hook with inert, stable callbacks.
const cameraMock = vi.hoisted(() => ({
  failStart: false,
  videoRef: { current: null },
  streamRef: { current: null },
  codeReaderRef: { current: null },
  isScanning: false,
  permissionRequested: false,
  cameraError: undefined,
  requestCameraPermission: async () => undefined,
  startScanning: async (): Promise<undefined> => {
    if (cameraMock.failStart) throw new Error('NotAllowedError');
  },
  stopCamera: () => undefined,
  resetCamera: () => undefined,
}));

vi.mock('../hooks/useCamera', () => ({
  useCamera: () => cameraMock,
}));

function renderScanner(isOpen = true) {
  window.localStorage.setItem('fideliy-locale', 'fr');
  return render(
    <Provider store={createAppStore()}>
      <I18nProvider>
        <ScannerModal isOpen={isOpen} onClose={() => undefined} branchId="branch-1" />
      </I18nProvider>
    </Provider>,
  );
}

describe('ScannerModal manual customer QR entry', () => {
  it('keeps what the merchant types into the manual QR identifier field', () => {
    renderScanner();
    const input = screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)');

    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(input).toHaveValue('abc');
    expect(screen.getByRole('button', { name: 'Résoudre le client' })).toBeEnabled();
  });

  it('starts with an empty field again after the scanner is closed and reopened', () => {
    const store = createAppStore();
    const tree = (isOpen: boolean) => (
      <Provider store={store}>
        <I18nProvider>
          <ScannerModal isOpen={isOpen} onClose={() => undefined} branchId="branch-1" />
        </I18nProvider>
      </Provider>
    );
    window.localStorage.setItem('fideliy-locale', 'fr');
    const { rerender } = render(tree(true));
    fireEvent.change(screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)'), { target: { value: 'abc' } });

    rerender(tree(false));
    rerender(tree(true));

    expect(screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)')).toHaveValue('');
  });
});

describe('ScannerModal manual entry fallbacks', () => {
  afterEach(() => {
    cameraMock.failStart = false;
    vi.unstubAllGlobals();
  });

  it('keeps manual entry usable when the camera is denied or missing', async () => {
    cameraMock.failStart = true;
    renderScanner();
    expect(await screen.findByText('Accès à la caméra requis')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)');
    fireEvent.change(input, { target: { value: 'k7m2q-9xbd4' } });
    expect(screen.getByRole('button', { name: 'Résoudre le client' })).toBeEnabled();
  });

  it('submits the typed identifier when Enter is pressed (real form)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderScanner();
    const input = screen.getByPlaceholderText('Code QR ou identifiant court (XXXXX-XXXXX)');
    fireEvent.change(input, { target: { value: 'k7m2q-9xbd4' } });

    expect(input.closest('form')).not.toBeNull();
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
