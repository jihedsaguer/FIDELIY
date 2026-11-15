import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Computes deterministic SHA-256 hex digest for customer QR credentials.
 * Used for constant-length hashed storage and secure hash-based lookup.
 */
export function hashCustomerQrCredential(credential: string): string {
  return createHash('sha256').update(credential, 'utf8').digest('hex');
}

/**
 * Constant-time comparison between a presented raw credential and a stored SHA-256 hash.
 */
export function verifyCustomerQrCredential(
  presentedCredential: string,
  storedHash: string,
): boolean {
  const presentedHash = hashCustomerQrCredential(presentedCredential);
  const a = Buffer.from(presentedHash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

