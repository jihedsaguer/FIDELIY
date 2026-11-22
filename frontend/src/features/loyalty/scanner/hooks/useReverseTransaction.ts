import { useState } from 'react';
import { useI18n } from '../../../../shared/i18n/i18n';
import {
  useReverseTransactionMutation,
  type Balance,
  type MerchantTransactionHistoryItem,
} from '../../api';
import { transactionErrorKey } from '../utils/apiError';
import { useIdempotencyKey } from './useIdempotencyKey';

export interface UseReverseTransactionResult {
  /** The transaction the dialog is open for, or null. */
  target: MerchantTransactionHistoryItem | null;
  isPending: boolean;
  /** Localized error of the last failed attempt; the dialog stays open for a retry. */
  errorMessage?: string;
  open: (transaction: MerchantTransactionHistoryItem) => void;
  close: () => void;
  /** Submits the reversal; a retry with the same reason reuses the same idempotency key. */
  submit: (reason: string) => Promise<void>;
}

/**
 * Reversal submit logic shared by the history rows and the "Cancel last" button
 * (DECISIONS #15: reversal needs a reason, is final, and is idempotent per key).
 */
export function useReverseTransaction(onReversed: (newBalance: Balance) => void): UseReverseTransactionResult {
  const { t } = useI18n();
  const [reverse, reverseState] = useReverseTransactionMutation();
  const { keyFor, clear } = useIdempotencyKey();
  const [target, setTarget] = useState<MerchantTransactionHistoryItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  function open(transaction: MerchantTransactionHistoryItem) {
    setErrorMessage(undefined);
    clear();
    setTarget(transaction);
  }

  function close() {
    setTarget(null);
    setErrorMessage(undefined);
    clear();
  }

  async function submit(reason: string) {
    if (!target) return;
    setErrorMessage(undefined);
    try {
      const result = await reverse({
        transactionId: target.id,
        reason,
        idempotencyKey: keyFor(`reverse|${target.id}|${reason}`),
      }).unwrap();
      close();
      onReversed(result.newBalance);
    } catch (err) {
      setErrorMessage(t(transactionErrorKey(err, 'reverse')));
    }
  }

  return { target, isPending: reverseState.isLoading, errorMessage, open, close, submit };
}
