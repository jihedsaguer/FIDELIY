import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'status' in error) {
    const queryError = error as FetchBaseQueryError;
    if ('error' in queryError && typeof queryError.error === 'string') {
      return queryError.error;
    }
    if (typeof queryError.data === 'object' && queryError.data !== null) {
      const body = queryError.data as { message?: unknown; error?: unknown };
      if (typeof body.message === 'string') return body.message;
      if (Array.isArray(body.message)) return body.message.join(' ');
      if (typeof body.error === 'string') return body.error;
    }
    if (queryError.status === 401) return 'Those credentials or that verification code were not accepted.';
    if (queryError.status === 429) return 'Too many attempts. Please wait a little and try again.';
  }
  return error instanceof Error ? error.message : fallback;
}
