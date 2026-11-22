import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Customer personal QR credentials (DECISIONS.md #20).
 *
 * The credential is derived, not random:
 *   base64url(HMAC-SHA256(CUSTOMER_QR_SECRET,
 *     "fideliy:customer-qr:v1:" + customerAccountId + ":" + credentialRowId))
 * so the customer can see the same QR again. Only SHA-256 hashes are stored.
 * The short ID (manual entry) is derived from the same key with another label.
 */

const CREDENTIAL_LABEL = 'fideliy:customer-qr:v1:';
const SHORT_CODE_LABEL = 'fideliy:customer-qr-short:v1:';
const MIN_KEY_BYTES = 32;
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SHORT_CODE_LENGTH = 10;

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

/**
 * Loads CUSTOMER_QR_SECRET (hex or base64/base64url, at least 32 decoded bytes).
 * Hex takes precedence when the value is valid hex. Throws a clear error when
 * the key is missing, malformed or too short.
 */
export function loadCustomerQrKey(): Buffer {
  const raw = process.env.CUSTOMER_QR_SECRET?.trim();
  if (!raw) {
    throw new Error('CUSTOMER_QR_SECRET environment variable is required.');
  }
  let key: Buffer;
  if (/^(?:[0-9a-fA-F]{2})+$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(raw)) {
    key = Buffer.from(raw, 'base64');
  } else {
    throw new Error('CUSTOMER_QR_SECRET must be hex or base64 encoded.');
  }
  if (key.length < MIN_KEY_BYTES) {
    throw new Error(
      `CUSTOMER_QR_SECRET must decode to at least ${MIN_KEY_BYTES} bytes.`,
    );
  }
  return key;
}

/** Startup check: the key is required (and validated) in production only. */
export function validateCustomerQrSecretForProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    loadCustomerQrKey();
  }
}

export function deriveCustomerQrCredential(
  customerAccountId: string,
  credentialId: string,
): string {
  return createHmac('sha256', loadCustomerQrKey())
    .update(`${CREDENTIAL_LABEL}${customerAccountId}:${credentialId}`)
    .digest('base64url');
}

function toCrockford(bytes: Uint8Array, length: number): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CROCKFORD_ALPHABET[parseInt(bits.slice(i * 5, i * 5 + 5), 2)];
  }
  return out;
}

/** Short ID for manual entry, formatted XXXXX-XXXXX (50 bits). */
export function deriveCustomerQrShortCode(
  customerAccountId: string,
  credentialId: string,
): string {
  const digest = createHmac('sha256', loadCustomerQrKey())
    .update(`${SHORT_CODE_LABEL}${customerAccountId}:${credentialId}`)
    .digest();
  const code = toCrockford(digest.subarray(0, 7), SHORT_CODE_LENGTH);
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/**
 * Canonical short ID (10 Crockford chars) or null when the input is not one.
 * Uppercases, strips dashes and whitespace, maps O to 0 and I/L to 1.
 */
export function normalizeCustomerQrShortCode(input: string): string | null {
  const canonical = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{10}$/.test(canonical) ? canonical : null;
}

export function hashCustomerQrShortCode(shortCode: string): string {
  const canonical = normalizeCustomerQrShortCode(shortCode);
  return createHash('sha256')
    .update(canonical ?? shortCode, 'utf8')
    .digest('hex');
}

export interface DerivedCustomerQrCodes {
  credential: string;
  shortCode: string;
  credentialHash: string;
  shortCodeHash: string;
}

export function deriveCustomerQrCodes(
  customerAccountId: string,
  credentialId: string,
): DerivedCustomerQrCodes {
  const credential = deriveCustomerQrCredential(customerAccountId, credentialId);
  const shortCode = deriveCustomerQrShortCode(customerAccountId, credentialId);
  return {
    credential,
    shortCode,
    credentialHash: hashCustomerQrCredential(credential),
    shortCodeHash: hashCustomerQrShortCode(shortCode),
  };
}

export interface CustomerQrLookup {
  column: 'credential_hash' | 'short_code_hash';
  hash: string;
}

/**
 * Decides how a merchant-presented value is looked up. A 43-char base64url
 * value is the full credential; a value that normalises to 10 Crockford chars
 * is a short ID; anything else is looked up as a credential and finds nothing,
 * so unknown and malformed codes behave identically (404).
 */
export function classifyCustomerQrInput(input: string): CustomerQrLookup {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{43}$/.test(trimmed)) {
    return { column: 'credential_hash', hash: hashCustomerQrCredential(trimmed) };
  }
  if (normalizeCustomerQrShortCode(trimmed)) {
    return { column: 'short_code_hash', hash: hashCustomerQrShortCode(trimmed) };
  }
  return { column: 'credential_hash', hash: hashCustomerQrCredential(input) };
}
