import { useCallback, useRef } from 'react';

/** Generates a unique idempotency key (crypto.randomUUID with a fallback). */
export function generateIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Holds one idempotency key per logical request, in a ref only (never in storage).
 * `keyFor(signature)` returns the same key while the signature is unchanged, so a
 * retry or a confirmed repeat reuses it; a changed signature produces a new key.
 */
export function useIdempotencyKey() {
  const state = useRef<{ signature: string; key: string } | null>(null);

  const keyFor = useCallback((signature: string): string => {
    if (!state.current || state.current.signature !== signature) {
      state.current = { signature, key: generateIdempotencyKey() };
    }
    return state.current.key;
  }, []);

  const clear = useCallback(() => {
    state.current = null;
  }, []);

  return { keyFor, clear };
}
