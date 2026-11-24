import { describe, expect, it } from 'vitest';
import { buildJoinUrl, isLocalOrigin, isPrintableOrigin } from './joinUrl';

const QR_ID = '3f2b8c1e-9a4d-4e7b-8c21-5d6e7f809a1b';

describe('buildJoinUrl', () => {
  it('builds the absolute public join URL for the business QR id', () => {
    expect(buildJoinUrl('https://fideliy.example.workers.dev', QR_ID)).toBe(
      `https://fideliy.example.workers.dev/qr/${QR_ID}`,
    );
  });

  it('ignores a trailing slash on the origin', () => {
    expect(buildJoinUrl('https://fideliy.example.workers.dev/', QR_ID)).toBe(
      `https://fideliy.example.workers.dev/qr/${QR_ID}`,
    );
  });

  it('encodes characters that are not safe in a path segment', () => {
    expect(buildJoinUrl('https://fideliy.example.workers.dev', 'a b/c')).toBe(
      'https://fideliy.example.workers.dev/qr/a%20b%2Fc',
    );
  });
});

describe('isLocalOrigin', () => {
  it.each([
    'http://localhost:5173',
    'https://localhost',
    'http://app.localhost:8080',
    'http://127.0.0.1:8080',
    'http://[::1]:5173',
    'http://0.0.0.0:5173',
    'http://10.0.0.12:5173',
    'http://172.16.4.2',
    'http://172.31.255.1',
    'http://192.168.1.20:5173',
    'http://169.254.10.10',
    'http://my-laptop.local:5173',
  ])('treats %s as local', (origin) => {
    expect(isLocalOrigin(origin)).toBe(true);
  });

  it.each([
    'https://fideliy.example.workers.dev',
    'https://172.32.0.1',
    'https://example.tn',
  ])('treats %s as public', (origin) => {
    expect(isLocalOrigin(origin)).toBe(false);
  });
});

describe('isPrintableOrigin', () => {
  it('accepts a public https origin', () => {
    expect(isPrintableOrigin('https://fideliy.example.workers.dev')).toBe(true);
  });

  it('rejects a public origin served over http', () => {
    expect(isPrintableOrigin('http://fideliy.example.tn')).toBe(false);
  });

  it('rejects a local https origin', () => {
    expect(isPrintableOrigin('https://192.168.1.20')).toBe(false);
  });

  it('rejects a malformed origin', () => {
    expect(isPrintableOrigin('not a url')).toBe(false);
  });
});
