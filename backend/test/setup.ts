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
