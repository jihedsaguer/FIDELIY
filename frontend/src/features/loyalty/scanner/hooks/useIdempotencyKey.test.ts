import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIdempotencyKey } from './useIdempotencyKey';

describe('useIdempotencyKey', () => {
  it('keeps the key while the signature is unchanged and renews it otherwise', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const first = result.current.keyFor('a');
    expect(result.current.keyFor('a')).toBe(first);
    const second = result.current.keyFor('b');
    expect(second).not.toBe(first);
    result.current.clear();
    expect(result.current.keyFor('b')).not.toBe(second);
  });
});
