import { describe, expect, it } from 'vitest';
import { isRepeatConfirmationRequired, readApiError, transactionErrorKey } from './apiError';

const err = (status: number, message: string, code?: string) => ({ status, data: { message, code } });

describe('apiError', () => {
  it('reads status, code and message from RTK Query errors', () => {
    expect(readApiError(err(409, 'x', 'C'))).toEqual({ status: 409, code: 'C', message: 'x' });
    expect(readApiError({ status: 'FETCH_ERROR', error: 'boom' })).toEqual({ status: undefined, code: undefined, message: '' });
    expect(readApiError({ status: 400, data: { message: ['a', 'b'] } }).message).toBe('a b');
  });

  it('detects the repeat-earning confirmation error by code', () => {
    expect(isRepeatConfirmationRequired(err(409, 'm', 'RECENT_EARNING_CONFIRMATION_REQUIRED'))).toBe(true);
    expect(isRepeatConfirmationRequired(err(409, 'm'))).toBe(false);
  });

  it('maps reversal errors', () => {
    expect(transactionErrorKey(err(404, 'Transaction not found for this business'), 'reverse')).toBe('transactionNotFound');
    expect(transactionErrorKey(err(400, 'Cannot reverse a reversal transaction'), 'reverse')).toBe('reversalNotAllowed');
    expect(transactionErrorKey(err(409, 'Transaction has already been reversed'), 'reverse')).toBe('alreadyReversed');
    expect(transactionErrorKey(err(409, 'Insufficient balance to reverse'), 'reverse')).toBe('reverseRedemptionFirst');
  });

  it('maps earn, redeem and resolve errors', () => {
    expect(transactionErrorKey(err(400, 'A branch is required when the business has more than one branch'), 'earn')).toBe('branchRequired');
    expect(transactionErrorKey(err(409, 'Customer membership is not active for this business'), 'earn')).toBe('notActiveMember');
    expect(transactionErrorKey(err(404, 'No active loyalty programme found for this business'), 'earn')).toBe('noActiveProgramme');
    expect(transactionErrorKey(err(404, 'Customer QR credential is invalid or revoked'), 'resolve')).toBe('customerNotFoundMessage');
    expect(transactionErrorKey(err(500, ''), 'redeem')).toBe('genericTransactionError');
  });
});
