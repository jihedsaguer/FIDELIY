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

describe('worker scheduled keep-alive', () => {
  const controller = { cron: '*/10 * * * *', scheduledTime: 0, noRetry: () => {} };
  let waitUntil: ReturnType<typeof vi.fn>;

  function ctx() {
    waitUntil = vi.fn();
    return { waitUntil: waitUntil as unknown as (promise: Promise<unknown>) => void, passThroughOnException: () => {} };
  }

  /** Runs the handler and awaits the promise it handed to ctx.waitUntil. */
  async function runScheduled(overrides: Partial<Env> = {}): Promise<void> {
    await worker.scheduled(controller, env(overrides), ctx());
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
  }

  it('pings the backend health route once with GET, the keep-alive user-agent and no cookie', async () => {
    await runScheduled();

    const { url, init, headers } = forwarded();
    expect(url).toBe(`${BACKEND}/api/health`);
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
    expect(headers.get('user-agent')).toBe('fideliy-keepalive');
    expect(headers.has('cookie')).toBe(false);
    expect(headers.has('authorization')).toBe(false);
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a URL', 'fideliy-backend.onrender.com'],
    ['plain http', 'http://fideliy-backend.onrender.com'],
  ])('does nothing but log one warning when BACKEND_ORIGIN is %s', async (_label, origin) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await worker.scheduled(controller, env({ BACKEND_ORIGIN: origin }), ctx());

    expect(upstream).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    if (origin) expect(String(warn.mock.calls[0][0])).not.toContain(origin);
    warn.mockRestore();
  });

  /** A response whose body records whether it was released (cancelled or fully read). */
  function trackedResponse(status: number): { response: Response; released: () => boolean } {
    let released = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode('{"status":"ok","secret":"s3cr3t"}'));
        controller.close();
        released = true;
      },
      cancel() {
        released = true;
      },
    }, { highWaterMark: 0 });
    return { response: new Response(body, { status }), released: () => released };
  }

  it('releases the response body on success without logging', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tracked = trackedResponse(200);
    upstream.mockResolvedValueOnce(tracked.response);

    await runScheduled();

    expect(tracked.released()).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('logs one short line with the status on a non-2xx response, releases the body and does not throw', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tracked = trackedResponse(500);
    upstream.mockResolvedValueOnce(tracked.response);

    await expect(runScheduled()).resolves.toBeUndefined();

    expect(tracked.released()).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toBe('keepalive failed: HTTP 500');
    warn.mockRestore();
  });

  it('logs only the error name when fetch rejects and does not throw', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    upstream.mockRejectedValueOnce(new TypeError(`connect failed to ${BACKEND} with token abc`));

    await expect(runScheduled()).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toBe('keepalive failed: TypeError');
    warn.mockRestore();
  });

  it('aborts a hanging request after 60 seconds, logs a timeout and does not throw', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let signal: AbortSignal | undefined;
    upstream.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init.signal ?? undefined;
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    try {
      await worker.scheduled(controller, env(), ctx());
      const settled = vi.fn();
      const done = (waitUntil.mock.calls[0][0] as Promise<unknown>).then(settled);

      await vi.advanceTimersByTimeAsync(59_000);
      expect(signal?.aborted).toBe(false);
      expect(settled).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1_000);
      await done;
      expect(signal?.aborted).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toBe('keepalive failed: timeout');
    } finally {
      warn.mockRestore();
      vi.useRealTimers();
    }
  });

  it('clears the timeout once the ping completes', async () => {
    vi.useFakeTimers();
    try {
      await runScheduled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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
