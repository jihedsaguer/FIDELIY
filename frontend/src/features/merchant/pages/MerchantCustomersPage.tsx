import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, QrCode, Search } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n';
import { Badge, Button, Card, FormFeedback, Input, Modal } from '../../../components/ui';
import { LoadingPanel } from '../../../components/ui/LoadingPanel';
import { useScanner } from '../../loyalty/context/ScannerContext';
import { LoyaltyCardView } from '../../loyalty/components';
import { useListTransactionsQuery } from '../../loyalty/api';
import { CustomerHistory } from '../../loyalty/scanner/components/CustomerHistory';
import { useGetBusinessSetupQuery } from '../../business-onboarding/api/businessOnboardingApi';
import {
  useListMerchantCustomersQuery,
  type MerchantCustomerItem,
  type MerchantCustomerStatus,
} from '../api/merchantApi';
import { useGetCurrentProgramQuery } from '../api/programApi';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const selectClasses =
  'w-full min-h-[44px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] px-3 py-2 text-sm text-[var(--text)]';
const thClasses =
  'text-start p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider';

/** Customer card in the Customers modal; same cached request as the history below (one source of truth). */
function CustomerCardInModal({ customer }: { customer: MerchantCustomerItem }) {
  const { t } = useI18n();
  const summary = useListTransactionsQuery({ membershipId: customer.membershipId }).data?.summary;
  const business = useGetBusinessSetupQuery().data?.business ?? null;
  if (!summary) return null;
  return (
    <LoyaltyCardView
      businessName={business?.name || t('business')}
      logoUrl={business?.logoUrl ?? null}
      programType={summary.programType}
      balance={{ stamps: summary.stamps.balance, points: summary.points.balance }}
      rewards={summary.rewards}
      joinedAt={customer.joinedAt}
    />
  );
}

export default function MerchantCustomersPage() {
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const { openScanner } = useScanner();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MerchantCustomerStatus | ''>('');
  const [offset, setOffset] = useState(0);
  const [historyFor, setHistoryFor] = useState<MerchantCustomerItem | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearch((current) => {
        if (current !== next) setOffset(0);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const listQuery = useListMerchantCustomersQuery({
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    limit: PAGE_SIZE,
    offset,
  });
  const programQuery = useGetCurrentProgramQuery();

  const data = listQuery.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const programType = programQuery.data?.type;
  // Only the balances the programme uses; both when the programme is unknown.
  const showStamps = programType !== 'points';
  const showPoints = programType !== 'stamps';
  const filtersActive = search !== '' || status !== '';

  if (listQuery.isLoading || programQuery.isLoading) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-7xl w-full">
          <LoadingPanel>{t('loading')}</LoadingPanel>
        </div>
      </div>
    );
  }

  const header = (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">{t('customers')}</h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">{t('allYourCustomers')}</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={openScanner} className="gap-2">
            <QrCode className="h-4 w-4" />
            <span>{t('scan')}</span>
          </Button>
        </div>
      </div>
    </header>
  );

  if (listQuery.isError && !data) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-7xl w-full">
          {header}
          <div className="space-y-4">
            <FormFeedback error={t('customersLoadError')} />
            <Button variant="outline" onClick={() => { void listQuery.refetch(); }}>
              {t('tryAgain')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!filtersActive && total === 0) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-7xl w-full">
          {header}
          <Card className="p-8 text-center">
            <QrCode className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-[var(--text)] text-lg font-semibold mb-2">{t('noCustomersFound')}</h3>
            <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">{t('manageYourCustomers')}</p>
            <div className="mt-6">
              <Button onClick={openScanner} className="gap-2">
                <QrCode className="h-4 w-4" />
                <span>{t('scanCustomerQR')}</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const historyLabel = (name: string) => `${t('viewHistory')} : ${name}`;
  const statusBadge = (value: MerchantCustomerStatus) => (
    <Badge variant={value === 'active' ? 'success' : 'secondary'} size="sm">
      {value === 'active' ? t('active') : t('inactiveStatus')}
    </Badge>
  );
  const lastActivity = (value: string | null) =>
    value ? formatDate(value) : t('customerNoActivity');
  const rangeStart = items.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + items.length;

  return (
    <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl w-full">
        {header}

        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                type="search"
                aria-label={t('customersSearchLabel')}
                placeholder={t('searchCustomers')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-10"
              />
            </div>
            <div className="md:w-56">
              <select
                aria-label={t('customersStatusFilter')}
                className={selectClasses}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as MerchantCustomerStatus | '');
                  setOffset(0);
                }}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactiveStatus')}</option>
              </select>
            </div>
          </div>
        </Card>

        {listQuery.isError && (
          <div className="mb-4 space-y-2">
            <FormFeedback error={t('customersLoadError')} />
            <Button variant="outline" onClick={() => { void listQuery.refetch(); }}>
              {t('tryAgain')}
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <Card className="p-8 text-center">
            <Search className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-[var(--text)] text-lg font-semibold mb-2">{t('noCustomersFound')}</h3>
            <p className="text-[var(--text-muted)] text-sm">{t('tryDifferentSearch')}</p>
          </Card>
        ) : (
          <div aria-busy={listQuery.isFetching}>
            <div className="hidden md:block bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border)]">
              <table className="w-full">
                <caption className="sr-only">{t('customersTableCaption')}</caption>
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--subtle)]">
                    <th scope="col" className={thClasses}>{t('name')}</th>
                    <th scope="col" className={thClasses}>{t('phoneNumber')}</th>
                    <th scope="col" className={thClasses}>{t('status')}</th>
                    <th scope="col" className={thClasses}>{t('joinedOn')}</th>
                    {showStamps && <th scope="col" className={thClasses}>{t('stamps')}</th>}
                    {showPoints && <th scope="col" className={thClasses}>{t('points')}</th>}
                    <th scope="col" className={thClasses}>{t('lastActivity')}</th>
                    <th scope="col" className="text-end p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.membershipId}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--subtle)] transition-colors"
                    >
                      <td className="p-4 text-start text-[var(--text)] font-medium">{c.customer.name}</td>
                      <td className="p-4 text-start text-[var(--text-muted)]">
                        <span dir="ltr" className="inline-block">{c.customer.phoneNumber}</span>
                      </td>
                      <td className="p-4 text-start">{statusBadge(c.status)}</td>
                      <td className="p-4 text-start text-[var(--text-muted)] text-sm">{formatDate(c.joinedAt)}</td>
                      {showStamps && <td className="p-4 text-start text-[var(--text)]">{c.balance.stamps}</td>}
                      {showPoints && <td className="p-4 text-start text-[var(--text)]">{c.balance.points}</td>}
                      <td className="p-4 text-start text-[var(--text-muted)] text-sm">{lastActivity(c.lastActivityAt)}</td>
                      <td className="p-4 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] gap-2"
                          aria-label={historyLabel(c.customer.name)}
                          onClick={() => setHistoryFor(c)}
                        >
                          <History className="h-4 w-4" aria-hidden="true" />
                          <span>{t('viewHistory')}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden space-y-3">
              {items.map((c) => (
                <li key={c.membershipId}>
                  <Card className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text)] break-words">{c.customer.name}</p>
                        <p dir="ltr" className="text-sm text-[var(--text-muted)] text-start">{c.customer.phoneNumber}</p>
                      </div>
                      {statusBadge(c.status)}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-[var(--text-muted)]">{t('joinedOn')}</dt>
                        <dd className="text-[var(--text)]">{formatDate(c.joinedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">{t('lastActivity')}</dt>
                        <dd className="text-[var(--text)]">{lastActivity(c.lastActivityAt)}</dd>
                      </div>
                      {showStamps && (
                        <div>
                          <dt className="text-[var(--text-muted)]">{t('stamps')}</dt>
                          <dd className="text-[var(--text)]">{c.balance.stamps}</dd>
                        </div>
                      )}
                      {showPoints && (
                        <div>
                          <dt className="text-[var(--text-muted)]">{t('points')}</dt>
                          <dd className="text-[var(--text)]">{c.balance.points}</dd>
                        </div>
                      )}
                    </dl>
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] gap-2"
                      aria-label={historyLabel(c.customer.name)}
                      onClick={() => setHistoryFor(c)}
                    >
                      <History className="h-4 w-4" aria-hidden="true" />
                      <span>{t('viewHistory')}</span>
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>

            <nav className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                className="min-h-[44px]"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                {t('previous')}
              </Button>
              <span dir="ltr" className="text-sm text-[var(--text-muted)]">
                {rangeStart}–{rangeEnd} / {total}
              </span>
              <Button
                variant="outline"
                className="min-h-[44px]"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                {t('next')}
              </Button>
            </nav>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/merchant')}
            className="text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
          >
            {t('backToDashboard')}
          </button>
        </div>
      </div>

      <Modal
        isOpen={historyFor !== null}
        onClose={() => setHistoryFor(null)}
        title={historyFor?.customer.name}
        size="lg"
      >
        {historyFor && (
          <div className="space-y-4">
            <CustomerCardInModal customer={historyFor} />
            <CustomerHistory
              membershipId={historyFor.membershipId}
              onReversed={() => { void listQuery.refetch(); }}
              showSummary
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
