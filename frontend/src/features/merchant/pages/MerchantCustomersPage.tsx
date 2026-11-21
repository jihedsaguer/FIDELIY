import { useI18n } from '../../../shared/i18n/i18n';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { useScanner } from '../../loyalty/context/ScannerContext';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, QrCode } from 'lucide-react';
import { useState } from 'react';

export default function MerchantCustomersPage() {
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { openScanner } = useScanner();

  // Note: The backend does not currently provide a customer list API.
  // Customers can only be accessed via QR code scanning.
  // This is a backend limitation - see backend/src/features/merchants/merchants.controller.ts
  // Only resolveCustomerQr and resolveCustomerForTransaction endpoints are available.
  
  const customers: Array<{
    id: string;
    name: string;
    phone: string;
    stamps: number;
    points: number;
    lastVisit: string;
  }> = [];

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleScanQR = () => {
    openScanner();
  };

  return (
    <main className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl w-full">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
                {t('customers')}
              </h1>
              <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
                {t('allYourCustomers')}
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleScanQR} className="gap-2">
                <QrCode className="h-4 w-4" />
                <span>{t('scan')}</span>
              </Button>
            </div>
          </div>
        </header>

        {customers.length === 0 ? null : (
          <Card className="p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <Input
                    placeholder={t('searchCustomers')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span>{t('actions')}</span>
              </Button>
            </div>
          </Card>
        )}

        {filteredCustomers.length === 0 && searchQuery === '' ? (
          <Card className="text-center py-12 px-4">
            <QrCode className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-[var(--text)] text-lg font-semibold mb-2">
              {t('noCustomersFound')}
            </h3>
            <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">
              {t('manageYourCustomers')}
            </p>
            <div className="mt-6">
              <Button onClick={handleScanQR} className="gap-2">
                <QrCode className="h-4 w-4" />
                <span>{t('scanCustomerQR')}</span>
              </Button>
            </div>
          </Card>
        ) : filteredCustomers.length === 0 ? (
          <Card className="text-center py-12 px-4">
            <Search className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-[var(--text)] text-lg font-semibold mb-2">
              {t('noCustomersFound')}
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              {t('tryDifferentSearch')}
            </p>
          </Card>
        ) : (
          <div className="bg-[var(--surface)] rounded-md border border-[var(--border)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
                    {t('name')}
                  </th>
                  <th className="text-left p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
                    {t('phoneNumber')}
                  </th>
                  <th className="text-left p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
                    {t('stamps')}
                  </th>
                  <th className="text-left p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
                    {t('points')}
                  </th>
                  <th className="text-left p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
                    {t('lastVisit')}
                  </th>
                  <th className="text-right p-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--subtle)] transition-colors"
                  >
                    <td className="p-4 text-[var(--text)]">
                      <span className="font-medium">{customer.name}</span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">{customer.phone}</td>
                    <td className="p-4">
                      {customer.stamps > 0 && (
                        <Badge variant={customer.stamps >= 10 ? 'default' : 'secondary'}>
                          {customer.stamps}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {customer.points > 0 && (
                        <Badge variant="primary">{customer.points}</Badge>
                      )}
                    </td>
                    <td className="p-4 text-[var(--text-muted)] text-sm">{formatDate(customer.lastVisit)}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" onClick={handleScanQR}>
                        <QrCode className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </main>
  );
}
