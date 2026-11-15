import { render, screen } from '@testing-library/react';
import { useGetSessionQuery } from '../../features/auth/api/authApi';
import { useGetBusinessSetupQuery } from '../../features/business-onboarding/api/businessOnboardingApi';
import { AppProviders } from '../../app/providers';
import { createAppStore } from '../../app/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

function SessionQuery() {
  const query = useGetSessionQuery();
  return <p>{query.isSuccess ? 'loaded' : 'loading'}</p>;
}

function SetupErrorQuery() {
  const query = useGetBusinessSetupQuery();
  const error = query.error && 'data' in query.error ? query.error.data : null;
  return <pre>{error ? JSON.stringify(error) : 'loading'}</pre>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RTK Query base API', () => {
  it('uses the /api proxy and includes credentials for Better Auth cookies', async () => {
    const requestOptions: Array<{ url: string; credentials?: RequestCredentials }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestOptions.push({
        url: input instanceof Request ? input.url : String(input),
        credentials: init?.credentials ?? (input instanceof Request ? input.credentials : undefined),
      });
      return new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore();
    expect(store.getState()).toHaveProperty('api');
    render(
      <AppProviders store={store}>
        <SessionQuery />
      </AppProviders>,
    );

    expect(await screen.findByText('loaded')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(requestOptions[0]?.url).toContain('/api/auth/get-session');
    expect(requestOptions[0]?.credentials).toBe('include');
  });

  it('keeps structured backend validation details available to feature UIs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({
        message: 'Business setup is incomplete',
        missingFields: ['business.logoUrl'],
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )));
    render(
      <AppProviders store={createAppStore()}>
        <SetupErrorQuery />
      </AppProviders>,
    );

    expect(await screen.findByText(/business\.logoUrl/)).toBeInTheDocument();
  });
});
