import { useState } from 'react';
import { CheckCircle, X, Award, ShoppingBag } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { useI18n } from '../../../../shared/i18n/i18n';
import type { CustomerForTransactionResponse } from '../../api/merchantTransactionApi';

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
  onRecordPurchase: () => void;
  onRedeemReward: (rewardId: string) => void;
  onScanAnother: () => void;
  errorMessage?: string;
}


export function CustomerScanResult({
  customerData,
  onRecordPurchase,
  onRedeemReward,
  onScanAnother,
  errorMessage,
}: CustomerScanResultProps) {
  const { t } = useI18n();
  const [expandedRewards, setExpandedRewards] = useState(false);
  
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

      {/* Balances */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <Award className="w-6 h-6 text-[var(--brand)] mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">{t('stamps')}</p>
          <p className="text-2xl font-bold text-[var(--text)]">
            {customerData.balance.stamps}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <Award className="w-6 h-6 text-[var(--brand)] mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm">{t('points')}</p>
          <p className="text-2xl font-bold text-[var(--text)]">
            {customerData.balance.points}
          </p>
        </Card>
      </div>

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

      {/* Available Rewards */}
      {customerData.eligibleRewards.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between"
            onClick={() => setExpandedRewards(!expandedRewards)}
          >
            <span className="font-semibold text-[var(--text)]">
              {t('availableRewards')} ({customerData.eligibleRewards.length})
            </span>
            <span className="text-[var(--text-muted)]">
              {expandedRewards ? t('hide') : t('show')}
            </span>
          </Button>
          
          {expandedRewards && (
            <div className="grid gap-2">
              {customerData.eligibleRewards.map(reward => (
                <button 
                  key={reward.id}
                  className="w-full text-left bg-[var(--subtle)] hover:bg-[var(--subtle)] border border-[var(--border)] rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onRedeemReward(reward.id)}
                  disabled={!reward.available}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--text)]">{reward.name}</span>
                    <span className="text-sm text-[var(--text-muted)]">
                      {reward.pointsCost} {t('pts')}
                      {reward.stampsCost ? ` + ${reward.stampsCost} ${t('stamps')}` : ''}
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          className="flex-1"
          onClick={onRecordPurchase}
        >
          {t('recordPurchase')}
        </Button>
        {customerData.eligibleRewards.length > 0 && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setExpandedRewards(!expandedRewards)}
          >
            {t('redeemReward')}
          </Button>
        )}
      </div>
      
      <Button variant="ghost" className="w-full" onClick={onScanAnother}>
        {t('scanDifferentCustomer')}
      </Button>

      {errorMessage && <FormFeedback error={errorMessage} />}
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
