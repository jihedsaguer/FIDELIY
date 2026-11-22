import type { MessageKey } from '../../../../shared/i18n/i18n';
import { RECENT_EARNING_CONFIRMATION_REQUIRED } from '../../api/merchantTransactionApi';

export interface ReadApiError {
  status?: number;
  code?: string;
  message: string;
}

export type TransactionErrorContext = 'resolve' | 'earn' | 'redeem' | 'reverse';

/**
 * Reads an RTK Query error. The backend (NestJS) sends `{ statusCode, message, code? }`;
 * `message` may be an array for validation errors.
 */
export function readApiError(err: unknown): ReadApiError {
  const error = (err ?? {}) as { status?: unknown; data?: { code?: unknown; message?: unknown } };
  const data = error.data && typeof error.data === 'object' ? error.data : undefined;
  const rawMessage = data?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(' ')
    : typeof rawMessage === 'string'
      ? rawMessage
      : '';
  return {
    status: typeof error.status === 'number' ? error.status : undefined,
    code: typeof data?.code === 'string' ? data.code : undefined,
    message,
  };
}

export function isRepeatConfirmationRequired(err: unknown): boolean {
  const { status, code } = readApiError(err);
  return status === 409 && code === RECENT_EARNING_CONFIRMATION_REQUIRED;
}

/** Maps a transaction API error to a localized message key (never the raw server text). */
export function transactionErrorKey(err: unknown, context: TransactionErrorContext): MessageKey {
  const { status, message } = readApiError(err);
  const text = message.toLowerCase();

  if (context === 'reverse') {
    if (status === 404) return 'transactionNotFound';
    if (status === 400) return text.includes('reason') ? 'reversalReasonRequired' : 'reversalNotAllowed';
    if (status === 409) {
      return text.includes('already been reversed') ? 'alreadyReversed' : 'reverseRedemptionFirst';
    }
    return 'genericTransactionError';
  }

  if (status === 400 && text.includes('branch')) return 'branchRequired';
  if (status === 409 && (text.includes('not active') || text.includes('must join'))) return 'notActiveMember';
  if (status === 409 && text.includes('insufficient balance')) return 'notEnoughBalance';
  if (status === 404 && text.includes('no active loyalty programme')) return 'noActiveProgramme';
  if (status === 404 && context === 'resolve') return 'customerNotFoundMessage';
  if (status === 404 && text.includes('membership')) return 'notActiveMember';
  return 'genericTransactionError';
}
