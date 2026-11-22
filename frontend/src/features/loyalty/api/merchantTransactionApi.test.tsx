import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../../app/providers';
import { createAppStore } from '../../../app/store';
import { ProtectedRoute } from '../../../app/routes/RouteGuards';
import { useResolveCustomerForTransactionMutation } from './merchantTransactionApi';

function Workspace() {
  const [resolveCustomer] = useResolveCustomerForTransactionMutation();
  const [result, setResult] = useState('none');
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void resolveCustomer({ qrCredential: 'K7M2Q-9XBD4' })
            .unwrap()
            .then(() => setResult('resolved'));
        }}
      >
        resolve
      </button>
      <p>result:{result}</p>
    </div>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolving a customer from the scanner', () => {
  it('does not refetch the session, so the merchant workspace (and the open scanner) stays mounted', async () => {
    const paths: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost');
        paths.push(url.pathname);
        const json = (status: number, body: unknown) =>
          new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
        if (url.pathname === '/api/auth/get-session') {
          return json(200, { user: { id: 'u1', name: 'Merchant' }, session: { id: 's1', expiresAt: '2099-01-01T00:00:00Z' } });
        }
        if (url.pathname === '/api/merchants/profile') return json(200, { id: 'm1' });
        if (url.pathname === '/api/merchants/customers/resolve-for-transaction') return json(201, { ok: true });
        return json(404, { message: 'unexpected' });
      }),
    );

    render(
      <MemoryRouter>
        <AppProviders store={createAppStore()}>
          <ProtectedRoute role="merchant">
            <Workspace />
          </ProtectedRoute>
        </AppProviders>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'resolve' }));
    await screen.findByText('result:resolved');

    // Let any invalidation-triggered refetch run.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(paths.filter((path) => path === '/api/auth/get-session')).toHaveLength(1);
    await waitFor(() => expect(screen.getByText('result:resolved')).toBeInTheDocument());
    expect(screen.queryByText('Restoring your session…')).not.toBeInTheDocument();
  });
});
