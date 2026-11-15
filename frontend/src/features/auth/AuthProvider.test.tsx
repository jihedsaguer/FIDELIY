import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../app/providers';
import { createAppStore } from '../../app/store';
import { createMockBackend } from '../../test-utils/mockBackend';
import { useAuth } from './AuthProvider';

function SessionStatus() {
  const { session, status, refreshSession, signOut } = useAuth();
  return (
    <>
      <p>{status}</p>
      {session && <p>{session.user.name}</p>}
      <button onClick={() => void refreshSession().catch(() => undefined)}>Refresh</button>
      <button onClick={() => void signOut()}>Sign out</button>
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthProvider', () => {
  it('initializes session state from the credentialed RTK Query endpoint', async () => {
    const backend = createMockBackend({ authenticated: true });
    vi.stubGlobal('fetch', backend.fetch);
    render(
      <AppProviders store={createAppStore()}>
        <SessionStatus />
      </AppProviders>,
    );

    expect(await screen.findByText('Test Merchant')).toBeInTheDocument();
    expect(screen.getByText('authenticated')).toBeInTheDocument();
    expect(backend.calls.filter((call) => call.path === '/api/auth/get-session')).toHaveLength(1);
  });

  it('refreshes session state and signs out through feature API mutations', async () => {
    const backend = createMockBackend({ authenticated: true });
    vi.stubGlobal('fetch', backend.fetch);
    render(
      <AppProviders store={createAppStore()}>
        <SessionStatus />
      </AppProviders>,
    );
    await screen.findByText('authenticated');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(backend.calls.filter((call) => call.path === '/api/auth/get-session').length).toBeGreaterThan(1));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('unauthenticated')).toBeInTheDocument();
    expect(backend.calls.some((call) => call.path === '/api/auth/sign-out' && call.method === 'POST')).toBe(true);
  });
});
