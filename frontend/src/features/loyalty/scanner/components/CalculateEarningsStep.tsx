import { User } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { InputField } from '../../../../components/ui/InputField';
import { Button } from '../../../../components/ui/Button';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import type { CalculateEarningsStepProps } from '../types';

export function CalculateEarningsStep({
  customerData,
  purchaseAmountInput,
  onAmountChange,
  onCalculate,
  isBusy,
  errorMessage,
  onBack,
}: CalculateEarningsStepProps) {
  const isStampsProgramme = customerData.program.type === 'stamps';
  const inputType = isStampsProgramme ? 'number' : 'number';
  const inputStep = isStampsProgramme ? '1' : '0.01';
  const inputMin = isStampsProgramme ? '1' : '0.01';
  const label = isStampsProgramme ? 'Number of Purchases' : 'Amount (TND)';
  const hint = isStampsProgramme 
    ? 'Enter the number of purchases/visits' 
    : 'Enter the purchase amount in Tunisian Dinars';

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-[var(--text-muted)]" />
          <div>
            <p className="font-semibold text-[var(--text)]">{customerData.customer.name}</p>
            <p className="text-[var(--text-muted)] text-sm">
              {customerData.program.type} programme
            </p>
          </div>
        </div>
      </Card>

      <InputField
        id="purchase-amount"
        label={label}
        type={inputType}
        step={inputStep}
        min={inputMin}
        value={purchaseAmountInput}
        onChange={(e) => {
          onAmountChange(e.target.value);
        }}
        hint={hint}
      />
      
      <Button 
        className="w-full"
        onClick={onCalculate}
        disabled={isBusy || !purchaseAmountInput}
        isLoading={isBusy}
      >
        Calculate Earnings
      </Button>

      {errorMessage && <FormFeedback error={errorMessage} />}

      <Button variant="ghost" className="w-full" onClick={onBack}>
        Back to Customer
      </Button>
    </div>
  );
}
