import { createHash, createHmac } from 'node:crypto';
import {
  classifyCustomerQrInput,
  deriveCustomerQrCodes,
  deriveCustomerQrCredential,
  deriveCustomerQrShortCode,
  hashCustomerQrCredential,
  hashCustomerQrShortCode,
  normalizeCustomerQrShortCode,
  validateCustomerQrSecretForProduction,
  verifyCustomerQrCredential,
} from '../../src/shared/security/customer-qr';

const ACCOUNT = '11111111-1111-4111-8111-111111111111';
const ROW_A = '22222222-2222-4222-8222-222222222222';
const ROW_B = '33333333-3333-4333-8333-333333333333';
const CROCKFORD = /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

describe('customer QR derivation', () => {
  const originalSecret = process.env.CUSTOMER_QR_SECRET;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.CUSTOMER_QR_SECRET = originalSecret as string;
    process.env.NODE_ENV = originalEnv;
  });

  it('matches an independently computed HMAC-SHA256 base64url value (43 chars)', () => {
    const key = Buffer.from(process.env.CUSTOMER_QR_SECRET as string, 'hex');
    const expected = createHmac('sha256', key)
      .update(`fideliy:customer-qr:v1:${ACCOUNT}:${ROW_A}`)
      .digest('base64url');
    const credential = deriveCustomerQrCredential(ACCOUNT, ROW_A);
    expect(credential).toBe(expected);
    expect(credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('is deterministic and differs by credential row id and by account', () => {
    expect(deriveCustomerQrCredential(ACCOUNT, ROW_A)).toBe(
      deriveCustomerQrCredential(ACCOUNT, ROW_A),
    );
    expect(deriveCustomerQrCredential(ACCOUNT, ROW_A)).not.toBe(
      deriveCustomerQrCredential(ACCOUNT, ROW_B),
    );
    expect(deriveCustomerQrCredential(ACCOUNT, ROW_A)).not.toBe(
      deriveCustomerQrCredential(ROW_B, ROW_A),
    );
  });

  it('differs when the key differs', () => {
    const before = deriveCustomerQrCredential(ACCOUNT, ROW_A);
    process.env.CUSTOMER_QR_SECRET = Buffer.alloc(32, 7).toString('base64');
    expect(deriveCustomerQrCredential(ACCOUNT, ROW_A)).not.toBe(before);
  });

  it('accepts a base64 key and rejects a missing or short key', () => {
    process.env.CUSTOMER_QR_SECRET = Buffer.alloc(32, 9).toString('base64');
    expect(deriveCustomerQrCredential(ACCOUNT, ROW_A)).toHaveLength(43);

    delete process.env.CUSTOMER_QR_SECRET;
    expect(() => deriveCustomerQrCredential(ACCOUNT, ROW_A)).toThrow(
      /CUSTOMER_QR_SECRET/,
    );

    process.env.CUSTOMER_QR_SECRET = Buffer.alloc(31, 1).toString('hex');
    expect(() => deriveCustomerQrCredential(ACCOUNT, ROW_A)).toThrow(
      /at least 32 bytes/,
    );
    expect(() => deriveCustomerQrShortCode(ACCOUNT, ROW_A)).toThrow(
      /at least 32 bytes/,
    );
  });

  it('stored hash is the SHA-256 of the credential and verification is exact', () => {
    const credential = deriveCustomerQrCredential(ACCOUNT, ROW_A);
    const hash = hashCustomerQrCredential(credential);
    expect(hash).toBe(createHash('sha256').update(credential).digest('hex'));
    expect(verifyCustomerQrCredential(credential, hash)).toBe(true);
    expect(
      verifyCustomerQrCredential(deriveCustomerQrCredential(ACCOUNT, ROW_B), hash),
    ).toBe(false);
  });

  describe('short code', () => {
    it('is XXXXX-XXXXX in the Crockford alphabet, deterministic, row-dependent', () => {
      const short = deriveCustomerQrShortCode(ACCOUNT, ROW_A);
      expect(short).toMatch(CROCKFORD);
      expect(deriveCustomerQrShortCode(ACCOUNT, ROW_A)).toBe(short);
      expect(deriveCustomerQrShortCode(ACCOUNT, ROW_B)).not.toBe(short);
    });

    it('uses a different domain label than the credential', () => {
      const key = Buffer.from(process.env.CUSTOMER_QR_SECRET as string, 'hex');
      const digest = createHmac('sha256', key)
        .update(`fideliy:customer-qr-short:v1:${ACCOUNT}:${ROW_A}`)
        .digest();
      // First 50 bits (10 base32 chars) taken from the digest.
      const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      let bits = '';
      for (const byte of digest.subarray(0, 7)) bits += byte.toString(2).padStart(8, '0');
      let expected = '';
      for (let i = 0; i < 50; i += 5) expected += alphabet[parseInt(bits.slice(i, i + 5), 2)];
      expect(deriveCustomerQrShortCode(ACCOUNT, ROW_A).replace('-', '')).toBe(expected);
      expect(deriveCustomerQrCredential(ACCOUNT, ROW_A)).not.toContain(expected);
    });

    it('normalises case, separators and Crockford confusables', () => {
      expect(normalizeCustomerQrShortCode('abcde-fghjk')).toBe('ABCDEFGHJK');
      expect(normalizeCustomerQrShortCode(' ABCDE fghjk ')).toBe('ABCDEFGHJK');
      expect(normalizeCustomerQrShortCode('O0I1L-1ABCD')).toBe('001111ABCD');
      expect(normalizeCustomerQrShortCode('ABCDE-FGHJ')).toBeNull();
      expect(normalizeCustomerQrShortCode('ABCDE-FGHJU')).toBeNull();
      expect(normalizeCustomerQrShortCode('')).toBeNull();
    });

    it('hashes the normalised code so typing variants match', () => {
      const short = deriveCustomerQrShortCode(ACCOUNT, ROW_A);
      const typed = short.toLowerCase().replace('-', ' ');
      expect(hashCustomerQrShortCode(typed)).toBe(hashCustomerQrShortCode(short));
      expect(hashCustomerQrShortCode(short)).toMatch(/^[0-9a-f]{64}$/);
      expect(hashCustomerQrShortCode(short)).not.toBe(
        hashCustomerQrCredential(deriveCustomerQrCredential(ACCOUNT, ROW_A)),
      );
    });
  });

  it('derives both codes and their hashes together', () => {
    const codes = deriveCustomerQrCodes(ACCOUNT, ROW_A);
    expect(codes.credential).toBe(deriveCustomerQrCredential(ACCOUNT, ROW_A));
    expect(codes.shortCode).toBe(deriveCustomerQrShortCode(ACCOUNT, ROW_A));
    expect(codes.credentialHash).toBe(hashCustomerQrCredential(codes.credential));
    expect(codes.shortCodeHash).toBe(hashCustomerQrShortCode(codes.shortCode));
  });

  describe('classifyCustomerQrInput', () => {
    it('routes a 43-char credential to credential_hash', () => {
      const credential = deriveCustomerQrCredential(ACCOUNT, ROW_A);
      expect(classifyCustomerQrInput(credential)).toEqual({
        column: 'credential_hash',
        hash: hashCustomerQrCredential(credential),
      });
    });

    it('routes a short ID (any typing variant) to short_code_hash', () => {
      const short = deriveCustomerQrShortCode(ACCOUNT, ROW_A);
      expect(classifyCustomerQrInput(short.toLowerCase())).toEqual({
        column: 'short_code_hash',
        hash: hashCustomerQrShortCode(short),
      });
    });

    it('falls back to a credential_hash lookup of the raw value for anything else', () => {
      expect(classifyCustomerQrInput('unknown')).toEqual({
        column: 'credential_hash',
        hash: hashCustomerQrCredential('unknown'),
      });
    });
  });

  describe('validateCustomerQrSecretForProduction', () => {
    it('throws in production without a valid key and passes otherwise', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CUSTOMER_QR_SECRET;
      expect(() => validateCustomerQrSecretForProduction()).toThrow(/CUSTOMER_QR_SECRET/);
      process.env.CUSTOMER_QR_SECRET = 'short';
      expect(() => validateCustomerQrSecretForProduction()).toThrow();
      process.env.CUSTOMER_QR_SECRET = Buffer.alloc(32, 3).toString('hex');
      expect(() => validateCustomerQrSecretForProduction()).not.toThrow();
    });

    it('does not throw outside production', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CUSTOMER_QR_SECRET;
      expect(() => validateCustomerQrSecretForProduction()).not.toThrow();
    });
  });
});
