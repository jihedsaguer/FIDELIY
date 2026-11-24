import { generatePath } from 'react-router-dom';
import { paths } from '../../../app/routes/paths';

/**
 * Absolute URL of the public join page (`/qr/:qrId`) for a business QR id,
 * built on the given origin (the address the merchant is using).
 */
export function buildJoinUrl(origin: string, publicQrId: string): string {
  // generatePath percent-encodes the parameter itself.
  const path = generatePath(paths.publicQr, { qrId: publicQrId });
  return new URL(path, origin).toString();
}

function isPrivateIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/**
 * True when the origin's host is only reachable on this machine or local
 * network (localhost, loopback, private IPv4 ranges, `.local`), so a phone
 * scanning a printed code could not open it.
 */
export function isLocalOrigin(origin: string): boolean {
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '::1' ||
    isPrivateIpv4(host)
  );
}

/** True only for a public https origin, the only kind safe to print or share. */
export function isPrintableOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === 'https:' && !isLocalOrigin(origin);
  } catch {
    return false;
  }
}
