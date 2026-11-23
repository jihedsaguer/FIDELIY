/**
 * FIDELIY Cloudflare Worker (frontend host).
 *
 * Serves the built SPA from the static-assets binding and proxies `/api` and
 * `/api/*` to the Render backend, so the browser sees a single origin and the
 * Better Auth cookies stay first-party. BACKEND_ORIGIN is passed at deploy time
 * (`wrangler deploy --var BACKEND_ORIGIN:<https url>`), never hardcoded.
 * Local mimic: `frontend/nginx.conf` (docker-compose.prod.yml).
 *
 * Trust model: the backend trusts `x-client-ip` (rate limits, Better Auth IP
 * headers) only because this Worker deletes any client-supplied value and
 * re-sets it from CF-Connecting-IP. Anyone calling the onrender.com URL
 * directly bypasses the Worker and can spoof it. Possible later hardening: a
 * shared secret header set here and required by the backend.
 *
 * Never log cookies, headers or bodies here.
 */

export interface Env {
  BACKEND_ORIGIN?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const CLIENT_FORWARDING_HEADERS = ['x-client-ip', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto'];

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

/** Origin (scheme://host[:port]) of an https BACKEND_ORIGIN, otherwise null. */
function backendOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

async function proxyToBackend(request: Request, origin: string): Promise<Response> {
  const incoming = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete('host');
  for (const name of CLIENT_FORWARDING_HEADERS) headers.delete(name);

  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) {
    headers.set('x-client-ip', clientIp);
    headers.set('x-forwarded-for', clientIp);
  }
  headers.set('x-forwarded-proto', 'https');
  headers.set('x-forwarded-host', incoming.host);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  // Returned as-is: rebuilding the Response could merge multiple Set-Cookie headers.
  return fetch(`${origin}${incoming.pathname}${incoming.search}`, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!isApiPath(pathname)) return env.ASSETS.fetch(request);

    const origin = backendOrigin(env.BACKEND_ORIGIN);
    if (!origin) {
      return new Response(JSON.stringify({ error: 'Backend origin is not configured' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    return proxyToBackend(request, origin);
  },
};
