import type { Request } from 'express';

/**
 * Client IP for per-client limits (phone sign-in rate limit).
 *
 * Behind Render and the Cloudflare Worker every request reaches the backend
 * from the same proxy address, so `req.ip` alone would put all customers in
 * one rate-limit bucket. The Worker (and the local nginx in
 * docker-compose.prod.yml) overwrites `x-client-ip` with the real client
 * address; we take its first value, else fall back to `req.ip`.
 *
 * Residual risk: a caller hitting the onrender.com URL directly (bypassing
 * the Worker) can set any `x-client-ip` and so evade the per-IP limit.
 */
export function getClientIp(req: Pick<Request, 'headers' | 'ip'>): string {
  const header = req.headers['x-client-ip'];
  const raw = Array.isArray(header) ? header[0] : header;
  const first = raw?.split(',')[0]?.trim();
  if (first) return first;
  return req.ip || 'unknown';
}
