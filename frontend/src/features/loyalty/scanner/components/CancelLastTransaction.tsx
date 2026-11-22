import { Undo2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useI18n } from '../../../../shared/i18n/i18n';
import {
  useListTransactionsQuery,
  type Balance,
  type MerchantTransactionHistoryItem,
} from '../../api';
import { useReverseTransaction } from '../hooks/useReverseTransaction';
import { CATEGORY_LABEL, formatDeltas } from '../utils/transactionFormat';
import { ReverseTransactionDialog } from './ReverseTransactionDialog';

/**
 * The only operation "Cancel last" may target: the newest transaction, and only when it is
 * a purchase or a redemption that has not been reversed yet (DECISIONS #15). The list is
 * newest first (backend order).
 */
export function findLastReversible(
  transactions: MerchantTransactionHistoryItem[],
): MerchantTransactionHistoryItem | null {
  const newest = transactions[0];
  if (!newest) return null;
  const reversible = newest.category === 'purchase' || newest.category === 'redemption';
  return reversible && newest.reversedByTransactionId === null ? newest : null;
}

interface CancelLastTransactionProps {
  membershipId: string;
  /** Called with the balance returned by a successful reversal. */
  onReversed: (newBalance: Balance) => void;
}

/** "Cancel last operation" shortcut on the scan result; hidden unless it is safe to offer. */
export function CancelLastTransaction({ membershipId, onReversed }: CancelLastTransactionProps) {
  const { t, formatDateTime } = useI18n();
  // Same arguments as CustomerHistory, so both share one cache entry.
  const query = useListTransactionsQuery({ membershipId });
  const reversal = useReverseTransaction(onReversed);

  // Hidden while loading (no data yet) and when the history failed to load.
  const last = query.isError ? null : findLastReversible(query.data?.transactions ?? []);
  if (!last && !reversal.target) return null;

  const label = last
    ? `${t('cancelLastTransaction')} : ${t(CATEGORY_LABEL[last.category])} ${formatDeltas(last, t('stamps'), t('points'))} · ${formatDateTime(last.occurredAt)}`
    : '';

  return (
    <>
      {last && (
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-11 whitespace-normal text-start"
          onClick={() => reversal.open(last)}
        >
          <Undo2 className="me-2 h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </Button>
      )}
      {reversal.target && (
        <ReverseTransactionDialog
          isOpen
          isPending={reversal.isPending}
          errorMessage={reversal.errorMessage}
          onConfirm={(reason) => { void reversal.submit(reason); }}
          onCancel={reversal.close}
        />
      )}
    </>
  );
}
