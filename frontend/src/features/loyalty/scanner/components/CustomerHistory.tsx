import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { useI18n } from '../../../../shared/i18n/i18n';
import {
  useListTransactionsQuery,
  type Balance,
} from '../../api';
import type { CurrencyTotals } from '../../api/merchantTransactionApi';
import { CATEGORY_LABEL, formatDelta } from '../utils/transactionFormat';
import { useReverseTransaction } from '../hooks/useReverseTransaction';
import { ReverseTransactionDialog } from './ReverseTransactionDialog';

interface CustomerHistoryProps {
  membershipId: string;
  /** Called with the balance returned by a successful reversal. */
  onReversed: (newBalance: Balance) => void;
  /** Customers modal: show server-computed totals and the "latest 100" note. The scanner keeps it compact. */
  showSummary?: boolean;
}

/** Shown by the history API (fixed page size, no pagination). */
const HISTORY_PAGE_SIZE = 100;

function TotalsBlock({ title, totals }: { title: string; totals: CurrencyTotals }) {
  const { t } = useI18n();
  const rows: Array<[string, number]> = [
    [t('summaryEarned'), totals.earned],
    [t('summaryEarningsReversed'), totals.earningsReversed],
    [t('summaryRedeemed'), totals.redeemed],
    [t('summaryRedemptionsReversed'), totals.redemptionsReversed],
  ];
  // Adjustments are expected to be 0 in Release 1; shown only when present so nothing is hidden.
  if (totals.adjustments !== 0) rows.push([t('summaryAdjustments'), totals.adjustments]);
  rows.push([t('summaryBalance'), totals.balance]);
  return (
    <div>
      <h5 className="mb-1 text-sm font-semibold text-[var(--text)]">{title}</h5>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[var(--text-muted)]">{label}</dt>
            <dd dir="ltr" className="text-end font-medium text-[var(--text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CustomerHistory({ membershipId, onReversed, showSummary = false }: CustomerHistoryProps) {
  const { t, formatDateTime } = useI18n();
  const query = useListTransactionsQuery({ membershipId });
  const reversal = useReverseTransaction(onReversed);

  const transactions = query.data?.transactions ?? [];
  const summary = showSummary ? query.data?.summary : undefined;
  const currencies: Array<'stamps' | 'points'> =
    summary?.programType === 'stamps'
      ? ['stamps']
      : summary?.programType === 'points'
        ? ['points']
        : ['stamps', 'points'];

  return (
    <section className="space-y-3" aria-labelledby="customer-history-title">
      {summary && (
        <section
          aria-labelledby="customer-summary-title"
          className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--subtle)] p-3"
        >
          <h4 id="customer-summary-title" className="font-semibold text-[var(--text)]">
            {t('summaryTitle')}
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {currencies.map((currency) => (
              <TotalsBlock key={currency} title={t(currency)} totals={summary[currency]} />
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {t('summaryOperations')} : <span dir="ltr">{summary.transactionCount}</span>
          </p>
        </section>
      )}
      <h4 id="customer-history-title" className="font-semibold text-[var(--text)]">
        {t('customerHistory')}
      </h4>

      {query.isLoading && <p role="status" className="text-sm text-[var(--text-muted)]">{t('loading')}</p>}

      {query.isError && (
        <div className="space-y-2">
          <FormFeedback error={t('historyLoadError')} />
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            {t('tryAgain')}
          </Button>
        </div>
      )}

      {!query.isLoading && !query.isError && transactions.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">{t('historyEmpty')}</p>
      )}

      {summary && summary.transactionCount > HISTORY_PAGE_SIZE && (
        <p className="text-sm text-[var(--text-muted)]">
          {t('historyLatestNote').replace('{count}', String(summary.transactionCount))}
        </p>
      )}

      {transactions.length > 0 && (
        <ul className="space-y-2">
          {transactions.map((tx) => {
            const isReversal = tx.category === 'reversal';
            const isReversed = tx.reversedByTransactionId !== null;
            const canReverse = !isReversal && !isReversed;
            return (
              <li key={tx.id}>
                <Card className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text)]">{t(CATEGORY_LABEL[tx.category])}</span>
                    {isReversed && <Badge variant="danger" size="sm">{t('reversedBadge')}</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{formatDateTime(tx.occurredAt)}</p>
                  <p className="text-sm text-[var(--text)]">
                    {tx.purchaseAmount && <span>{tx.purchaseAmount} {t('tnd')} · </span>}
                    {tx.stampsDelta !== 0 && <span>{formatDelta(tx.stampsDelta)} {t('stamps')} </span>}
                    {tx.pointsDelta !== 0 && <span>{formatDelta(tx.pointsDelta)} {t('points')}</span>}
                  </p>
                  {isReversal && tx.reversalReason && (
                    <p className="text-sm text-[var(--text-muted)]">{tx.reversalReason}</p>
                  )}
                  {canReverse && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => reversal.open(tx)}
                    >
                      {t('reverseTransaction')}
                    </Button>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
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
    </section>
  );
}
