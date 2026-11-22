import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

// Fixed test-only key (32 bytes, hex) for deterministic customer QR derivation.
process.env.CUSTOMER_QR_SECRET =
  '0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0';

(globalThis as any).jest = jest;
(globalThis as any).describe = describe;
(globalThis as any).it = it;
(globalThis as any).test = it;
(globalThis as any).beforeEach = beforeEach;
(globalThis as any).afterEach = afterEach;
(globalThis as any).beforeAll = beforeAll;
(globalThis as any).afterAll = afterAll;
(globalThis as any).expect = expect;
(globalThis as any).fail = (message?: string | Error) => {
  throw message instanceof Error ? message : new Error(message ?? 'Test failed');
};
