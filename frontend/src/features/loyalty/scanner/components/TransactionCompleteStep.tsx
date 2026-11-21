import { CheckCircle } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import type { TransactionCompleteStepProps } from '../types';

export function TransactionCompleteStep({
  transaction,
  customerData,
  onScanAnother,
  onClose,
}: TransactionCompleteStepProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--success-light)] flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-[var(--success)]" />
      </div>
      
      <h3 className="text-2xl font-bold text-[var(--success)]">Transaction Complete</h3>
      <p className="text-[var(--text-muted)]">
        Transaction recorded successfully
      </p>
      
      <Card className="p-4 text-left">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Customer</span>
            <span className="font-medium text-[var(--text)]">{customerData.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Amount</span>
            <span className="font-medium text-[var(--text)]">
              {transaction.purchaseAmount} {customerData.program.type === 'stamps' ? 'purchases' : 'TND'}
            </span>
          </div>
          {transaction.stampsEarned > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Stamps Earned</span>
              <span className="font-medium text-[var(--success)]">+{transaction.stampsEarned}</span>
            </div>
          )}
          {transaction.pointsEarned > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Points Earned</span>
              <span className="font-medium text-[var(--success)]">+{transaction.pointsEarned}</span>
            </div>
          )}
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between font-bold">
              <span>New Balance</span>
              <span className="text-[var(--text)]">
                {transaction.newBalance.stamps} stamps, {transaction.newBalance.points} points
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={onScanAnother}>
          Scan Another Customer
        </Button>
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
