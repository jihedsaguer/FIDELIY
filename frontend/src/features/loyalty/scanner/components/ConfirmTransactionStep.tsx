import { User } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import type { ConfirmTransactionStepProps } from '../types';

export function ConfirmTransactionStep({
  customerData,
  earnings,
  onConfirm,
  onBack,
  isBusy,
  errorMessage,
}: ConfirmTransactionStepProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-[var(--text-muted)]" />
          <div>
            <p className="font-semibold text-[var(--text)]">{customerData.customer.name}</p>
            <p className="text-[var(--text-muted)] text-sm">Confirm Transaction</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Purchase Amount</span>
            <span className="font-medium text-[var(--text)]">
              {earnings.purchaseAmount} {customerData.program.type === 'stamps' ? 'purchases' : 'TND'}
            </span>
          </div>
          
          {earnings.stampsToEarn > 0 && (
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-muted)]">Stamps to earn</span>
              <span className="font-medium text-[var(--success)]">+{earnings.stampsToEarn}</span>
            </div>
          )}
          
          {earnings.pointsToEarn > 0 && (
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-muted)]">Points to earn</span>
              <span className="font-medium text-[var(--success)]">+{earnings.pointsToEarn}</span>
            </div>
          )}
          
          <div className="pt-3 border-t border-[var(--border)]">
            <div className="flex justify-between font-bold text-[var(--text)]">
              <span>New Stamps</span>
              <span>{earnings.totalStampsAfter}</span>
            </div>
            <div className="flex justify-between font-bold text-[var(--text)]">
              <span>New Points</span>
              <span>{earnings.totalPointsAfter}</span>
            </div>
          </div>
        </div>
      </Card>

      {errorMessage && <FormFeedback error={errorMessage} />}

      <div className="flex gap-3">
        <Button 
          className="flex-1"
          onClick={onConfirm} 
          disabled={isBusy}
          isLoading={isBusy}
        >
          Confirm Transaction
        </Button>
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
