import { CheckCircle } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import type { RedemptionCompleteStepProps } from '../types';

export function RedemptionCompleteStep({
  redemption,
  customerData,
  onScanAnother,
  onClose,
}: RedemptionCompleteStepProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--success-light)] flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-[var(--success)]" />
      </div>
      
      <h3 className="text-2xl font-bold text-[var(--success)]">Redemption Complete</h3>
      <p className="text-[var(--text-muted)]">
        Reward redeemed successfully
      </p>
      
      <Card className="p-4 text-left">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Customer</span>
            <span className="font-medium text-[var(--text)]">{customerData.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Reward</span>
            <span className="font-medium text-[var(--text)]">{redemption.reward.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Cost</span>
            <span className="font-medium text-[var(--text)]">
              {redemption.reward.pointsCost} points
              {redemption.reward.stampsCost ? ` + ${redemption.reward.stampsCost} stamps` : ''}
            </span>
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Balance Before</span>
              <span className="text-sm">
                {redemption.customerBalanceBefore.stamps} stamps, {redemption.customerBalanceBefore.points} points
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Balance After</span>
              <span className="text-[var(--text)]">
                {redemption.customerBalanceAfter.stamps} stamps, {redemption.customerBalanceAfter.points} points
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
