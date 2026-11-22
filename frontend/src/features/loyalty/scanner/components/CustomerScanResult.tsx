import { useState } from 'react';
import { CheckCircle, X, ShoppingBag } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { InputField } from '../../../../components/ui/InputField';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { useI18n } from '../../../../shared/i18n/i18n';
import { useGetBusinessSetupQuery } from '../../../business-onboarding/api/businessOnboardingApi';
import { LoyaltyCardView } from '../../components';
import type { Balance, CustomerForTransactionResponse, RewardOption } from '../../api/merchantTransactionApi';
import type { UseScannerBranchResult } from '../hooks/useScannerBranch';
import { BranchPicker } from './BranchPicker';
import { CancelLastTransaction } from './CancelLastTransaction';
import { CustomerHistory } from './CustomerHistory';

/**
 * CustomerScanResult - Displayed after successfully scanning a customer
 * 
 * Responsibilities:
 * - Show customer information
 * - Display current balances (stamps and points)
 * - Show programme information
 * - Display eligible rewards
 * - Provide actions for recording purchase or redeeming reward
 */
interface CustomerScanResultProps {
  customerData: CustomerForTransactionResponse;
  /** Records the purchase directly (stamps: one tap; points/combined: needs a valid amount). */
  onEarn: () => void;
  amountInput: string;
  onAmountChange: (value: string) => void;
  /** Localized field-level validation error for the amount. */
  amountError?: string;
  /** Inline success after an earn (the merchant stays on this screen). */
  successMessage?: string;
  isBusy: boolean;
  onRedeemReward: (reward: RewardOption) => void;
  onScanAnother: () => void;
  /** Receives the balance returned by a reversal made from the history panel. */
  onBalanceChange: (balance: Balance) => void;
  branch: UseScannerBranchResult;
  errorMessage?: string;
}


export function CustomerScanResult({
  customerData,
  onEarn,
  amountInput,
  onAmountChange,
  amountError,
  successMessage,
  isBusy,
  onRedeemReward,
  onScanAnother,
  onBalanceChange,
  branch,
  errorMessage,
}: CustomerScanResultProps) {
  const { t } = useI18n();
  const businessSetup = useGetBusinessSetupQuery();
  const business = businessSetup.data?.business ?? null;
  const [expandedRewards, setExpandedRewards] = useState(false);
  const rewards = customerData.rewards;
  const amountRequired = customerData.program.type !== 'stamps';
  
  const programmeTypeLabel = customerData.program.type === 'stamps' ? t('stampCard') : 
                            customerData.program.type === 'points' ? t('pointsSystem') : t('combined');

  return (
    <div className="space-y-6">
      {/* Customer Found Header */}
      <Card className="p-4 bg-[var(--success-light)] border border-[var(--success)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--glass-brand)] flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[var(--brand)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text)]">{t('customerFound')}</h3>
            <p className="text-[var(--text-muted)]">{customerData.customer.name}</p>
          </div>
        </div>
      </Card>

      {customerData.membership.enrolment !== 'existing' && (
        <FormFeedback notice={t('customerEnrolledNotice')} />
      )}

      {/* The customer's card: balance, progress and rewards, updated live after earn/redeem/reverse */}
      <LoyaltyCardView
        businessName={business?.name || t('business')}
        logoUrl={business?.logoUrl ?? null}
        programType={customerData.program.type}
        balance={customerData.balance}
        rewards={rewards}
        joinedAt={customerData.membership.joinedAt}
      />

      {/* Programme Info */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-[var(--text-muted)]" />
          <div>
            <p className="text-[var(--text-muted)] text-sm">{t('programme')}</p>
            <p className="font-medium text-[var(--text)]">
              {customerData.program.name || t('activeProgramme')} (v{customerData.program.version})
            </p>
            <p className="text-[var(--text-muted)] text-xs">
              {t('programmeType')}: {programmeTypeLabel}
            </p>
          </div>
        </div>
      </Card>

      {/* Branch (only when the business has several) */}
      {branch.needsChoice && (
        <BranchPicker branches={branch.branches} value={branch.branchId} onChange={branch.select} />
      )}
      {branch.isError && (
        <div className="space-y-2">
          <FormFeedback notice={t('branchesLoadError')} />
          <Button type="button" variant="outline" onClick={branch.retry}>{t('tryAgain')}</Button>
        </div>
      )}

      {/* Rewards */}
      {rewards.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between"
            onClick={() => setExpandedRewards(!expandedRewards)}
            aria-expanded={expandedRewards}
          >
            <span className="font-semibold text-[var(--text)]">
              {t('availableRewards')} ({rewards.length})
            </span>
            <span className="text-[var(--text-muted)]">
              {expandedRewards ? t('hide') : t('show')}
            </span>
          </Button>

          {expandedRewards && (
            <div className="grid gap-2">
              {rewards.map(reward => (
                <button
                  type="button"
                  key={`${reward.configurationId}:${reward.rewardIndex}`}
                  className="w-full min-h-11 text-start bg-[var(--subtle)] hover:bg-[var(--subtle)] border border-[var(--border)] rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onRedeemReward(reward)}
                  disabled={!reward.available || branch.blocked}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--text)]">{reward.name}</span>
                    <span className="text-sm text-[var(--text-muted)]">
                      {reward.cost} {reward.activityType === 'stamps' ? t('stamps') : t('points')}
                    </span>
                  </div>
                  {!reward.available && (
                    <p className="text-xs text-[var(--danger)] mt-1">{t('notEnoughBalance')}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions: recording a purchase happens right here (no intermediate steps) */}
      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onEarn();
        }}
      >
        <InputField
          id="purchase-amount"
          label={t('amountTND')}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          required={amountRequired}
          value={amountInput}
          onChange={(e) => onAmountChange(e.target.value)}
          error={amountError}
          hint={amountRequired ? t('amountRequiredForPoints') : t('amountOptionalForStamps')}
        />
        <Button
          type="submit"
          className="w-full min-h-11"
          disabled={branch.blocked || isBusy}
          isLoading={isBusy}
        >
          {amountRequired ? t('recordPurchase') : t('addStamp')}
        </Button>
      </form>
      <FormFeedback success={successMessage} />
      <CancelLastTransaction membershipId={customerData.membership.id} onReversed={onBalanceChange} />
      {rewards.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-11"
          onClick={() => setExpandedRewards(!expandedRewards)}
          disabled={branch.blocked}
        >
          {t('redeemReward')}
        </Button>
      )}

      <Button variant="ghost" className="w-full" onClick={onScanAnother}>
        {t('scanDifferentCustomer')}
      </Button>

      {errorMessage && <FormFeedback error={errorMessage} />}

      <CustomerHistory membershipId={customerData.membership.id} onReversed={onBalanceChange} />
    </div>
  );
}

/**
 * CustomerNotFound - Displayed when QR credential doesn't resolve to a customer
 */
interface CustomerNotFoundProps {
  errorMessage?: string;
  onTryAgain: () => void;
  onClose: () => void;
  onRegisterCustomer?: () => void;
}


export function CustomerNotFound({
  errorMessage,
  onTryAgain,
  onClose,
  onRegisterCustomer,
}: CustomerNotFoundProps) {
  const { t } = useI18n();
  
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--danger-light)] flex items-center justify-center mb-6">
        <X className="w-10 h-10 text-[var(--danger)]" />
      </div>
      <h3 className="text-xl font-bold text-[var(--danger)] mb-2">{t('customerNotFound')}</h3>
      <p className="text-[var(--text-muted)] mb-6">
        {errorMessage || t('customerNotFoundMessage')}
      </p>
      <div className="space-y-3">
        {onRegisterCustomer && (
          <Button className="w-full" variant="outline" onClick={onRegisterCustomer}>
            {t('registerCustomer')}
          </Button>
        )}
        <Button className="w-full" onClick={onTryAgain}>
          {t('tryAgain')}
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </div>
  );
}


export type { CustomerScanResultProps, CustomerNotFoundProps };
