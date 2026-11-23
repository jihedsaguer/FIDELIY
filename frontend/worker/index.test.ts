// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from './index';

const BACKEND = 'https://fideliy-backend.onrender.com';
const PUBLIC = 'https://fideliy.jihedsaguer127.workers.dev';

let upstream: ReturnType<typeof vi.fn>;
let assetsFetch: ReturnType<typeof vi.fn>;

function env(overrides: Partial<Env> = {}): Env {
  return {
    BACKEND_ORIGIN: BACKEND,
    ASSETS: { fetch: assetsFetch as unknown as Env['ASSETS']['fetch'] },
    ...overrides,
  };
}

function forwarded(): { url: string; init: RequestInit; headers: Headers } {
  expect(upstream).toHaveBeenCalledTimes(1);
  const [url, init] = upstream.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

beforeEach(() => {
  upstream = vi.fn(async () => new Response('upstream', { status: 200 }));
  assetsFetch = vi.fn(async () => new Response('asset', { status: 200 }));
  vi.stubGlobal('fetch', upstream);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker /api proxy', () => {
  it('forwards /api paths to the backend origin with the query string preserved', async () => {
    await worker.fetch(new Request(`${PUBLIC}/api/merchants/transactions?membershipId=abc&x=1`), env());

    const { url, init } = forwarded();
    expect(url).toBe(`${BACKEND}/api/merchants/transactions?membershipId=abc&x=1`);
    expect(init.redirect).toBe('manual');
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it('forwards exactly /api', async () => {
    await worker.fetch(new Request(`${PUBLIC}/api`), env());

    expect(forwarded().url).toBe(`${BACKEND}/api`);
  });

  it('does not proxy paths that only start with the letters "api"', async () => {
    await worker.fetch(new Request(`${PUBLIC}/apix`), env());
    await worker.fetch(new Request(`${PUBLIC}/apiary/hive`), env());

    expect(upstream).not.toHaveBeenCalled();
    expect(assetsFetch).toHaveBeenCalledTimes(2);
  });

  it('drops host and keeps the browser Origin and Cookie', async () => {
    await worker.fetch(
      new Request(`${PUBLIC}/api/auth/get-session`, {
        headers: { Origin: PUBLIC, Cookie: 'better-auth.session_token=abc; other=1', Host: 'fideliy.jihedsaguer127.workers.dev' },
      }),
      env(),
    );

    const { headers } = forwarded();
    expect(headers.has('host')).toBe(false);
    expect(headers.get('origin')).toBe(PUBLIC);
    expect(headers.get('cookie')).toBe('better-auth.session_token=abc; other=1');
  });

  it('overwrites client-supplied forwarding headers with CF-Connecting-IP and the public host', async () => {
    await worker.fetch(
      new Request(`${PUBLIC}/api/auth/sign-in/phone`, {
        headers: {
          'CF-Connecting-IP': '197.0.0.10',
          'X-Client-IP': '1.2.3.4',
          'X-Forwarded-For': '1.2.3.4, 5.6.7.8',
          'X-Forwarded-Host': 'evil.example',
          'X-Forwarded-Proto': 'http',
        },
      }),
      env(),
    );

    const { headers } = forwarded();
    expect(headers.get('x-client-ip')).toBe('197.0.0.10');
    expect(headers.get('x-forwarded-for')).toBe('197.0.0.10');
    expect(headers.get('x-forwarded-proto')).toBe('https');
    expect(headers.get('x-forwarded-host')).toBe('fideliy.jihedsaguer127.workers.dev');
  });

  it('leaves client IP headers unset when CF-Connecting-IP is absent', async () => {
    await worker.fetch(
      new Request(`${PUBLIC}/api/health`, {
        headers: { 'X-Client-IP': '1.2.3.4', 'X-Forwarded-For': '1.2.3.4' },
      }),
      env(),
    );

    const { headers } = forwarded();
    expect(headers.has('x-client-ip')).toBe(false);
    expect(headers.has('x-forwarded-for')).toBe(false);
  });

  it('forwards the method and body of a POST', async () => {
    await worker.fetch(
      new Request(`${PUBLIC}/api/merchants/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: '12.500' }),
      }),
      env(),
    );

    const { init, headers } = forwarded();
    expect(init.method).toBe('POST');
    expect(headers.get('content-type')).toBe('application/json');
    expect(await new Response(init.body).text()).toBe('{"amount":"12.500"}');
  });

  it('sends no body for GET', async () => {
    await worker.fetch(new Request(`${PUBLIC}/api/health`), env());

    const { init } = forwarded();
    expect(init.method).toBe('GET');
    expect(init.body ?? null).toBeNull();
  });

  it('returns the upstream response with every Set-Cookie header intact', async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append('Set-Cookie', 'better-auth.session_token=abc; Path=/; HttpOnly; Secure; SameSite=Lax');
    upstreamHeaders.append('Set-Cookie', 'better-auth.session_data=xyz; Path=/; HttpOnly; Secure; SameSite=Lax');
    upstream.mockResolvedValueOnce(new Response('{"ok":true}', { status: 201, headers: upstreamHeaders }));

    const response = await worker.fetch(new Request(`${PUBLIC}/api/auth/sign-in/email`, { method: 'POST', body: '{}' }), env());

    expect(response.status).toBe(201);
    expect(response.headers.getSetCookie()).toEqual([
      'better-auth.session_token=abc; Path=/; HttpOnly; Secure; SameSite=Lax',
      'better-auth.session_data=xyz; Path=/; HttpOnly; Secure; SameSite=Lax',
    ]);
    expect(await response.text()).toBe('{"ok":true}');
  });

  it('passes redirects through without following them', async () => {
    upstream.mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: '/merchant/login' } }));

    const response = await worker.fetch(new Request(`${PUBLIC}/api/auth/callback`), env());

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/merchant/login');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a URL', 'fideliy-backend.onrender.com'],
    ['plain http', 'http://fideliy-backend.onrender.com'],
  ])('returns a 500 JSON error without calling upstream when BACKEND_ORIGIN is %s', async (_label, origin) => {
    const response = await worker.fetch(new Request(`${PUBLIC}/api/health`), env({ BACKEND_ORIGIN: origin }));

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'Backend origin is not configured' });
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('worker static assets', () => {
  it('serves non-/api paths from the ASSETS binding', async () => {
    const request = new Request(`${PUBLIC}/merchant/login`);

    const response = await worker.fetch(request, env());

    expect(assetsFetch).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe('asset');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('serves assets even when BACKEND_ORIGIN is missing', async () => {
    const response = await worker.fetch(new Request(`${PUBLIC}/`), env({ BACKEND_ORIGIN: undefined }));

    expect(response.status).toBe(200);
    expect(assetsFetch).toHaveBeenCalledTimes(1);
  });
});
