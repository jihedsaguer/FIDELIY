import { useState, useCallback } from 'react';
import { initialScannerState } from '../types';
import type { ScannerState, SelectedReward } from '../types';
import type {
  Balance,
  CustomerForTransactionResponse,
  RedeemRewardResponse,
} from '../../api/merchantTransactionApi';

/**
 * Scanner workflow state machine.
 *
 * Steps are unchanged; customer history and reversal are panels/dialogs inside
 * the 'resolved' step and do not add steps.
 */
export interface ScannerStateActions {
  // Navigation actions
  goToScan: () => void;
  goToPermission: () => void;
  goToError: (message?: string) => void;
  /** Customer resolved (or, without `customerData`, "customer not found"). */
  goToResolved: (data: { credential: string; customerData?: CustomerForTransactionResponse; branchId?: string }) => void;
  /** Back to the resolved customer, keeping credential and customer data. */
  goToCustomer: () => void;
  goToRedeemConfirm: (reward: SelectedReward) => void;
  goToRedeemComplete: (redemption: RedeemRewardResponse) => void;

  // Reset actions
  reset: () => void;
  scanAnother: () => void;

  // Setters
  setError: (message?: string) => void;
  clearError: () => void;
  setPurchaseAmount: (amount?: string) => void;
  /** Replace the customer's balance and recompute which rewards are affordable. */
  applyBalance: (balance: Balance) => void;
  openRepeatWarning: () => void;
  closeRepeatWarning: () => void;
}

export interface UseScannerStateResult extends ScannerState, ScannerStateActions {}

export function useScannerState(defaultBranchId?: string): UseScannerStateResult {
  const [state, setState] = useState<ScannerState>(initialScannerState);

  const goToScan = useCallback(() => {
    setState(prev => ({ ...prev, step: 'scan', errorMessage: undefined }));
  }, []);

  const goToPermission = useCallback(() => {
    setState(prev => ({ ...prev, step: 'permission', errorMessage: undefined }));
  }, []);

  const goToError = useCallback((message?: string) => {
    setState(prev => ({ ...prev, step: 'error', errorMessage: message || 'Camera error' }));
  }, []);

  const goToResolved = useCallback((
    data: { credential: string; customerData?: CustomerForTransactionResponse; branchId?: string }
  ) => {
    setState(prev => ({
      ...prev,
      step: 'resolved',
      qrCredential: data.credential,
      customerData: data.customerData,
      branchId: data.branchId || defaultBranchId,
      repeatWarningOpen: false,
      errorMessage: undefined,
    }));
  }, [defaultBranchId]);

  const goToCustomer = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'resolved',
      selectedReward: undefined,
      repeatWarningOpen: false,
      errorMessage: undefined,
    }));
  }, []);

  const goToRedeemConfirm = useCallback((reward: SelectedReward) => {
    setState(prev => ({ ...prev, step: 'redeem-confirm', selectedReward: reward, errorMessage: undefined }));
  }, []);

  const goToRedeemComplete = useCallback((redemption: RedeemRewardResponse) => {
    setState(prev => ({ ...prev, step: 'redeem-complete', redemption, errorMessage: undefined }));
  }, []);

  const reset = useCallback(() => {
    setState(initialScannerState);
  }, []);

  const scanAnother = useCallback(() => {
    setState(initialScannerState);
  }, []);

  const setError = useCallback((message?: string) => {
    setState(prev => ({ ...prev, errorMessage: message }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, errorMessage: undefined }));
  }, []);

  const setPurchaseAmount = useCallback((amount?: string) => {
    setState(prev => ({ ...prev, purchaseAmount: amount }));
  }, []);

  const applyBalance = useCallback((balance: Balance) => {
    setState(prev => {
      if (!prev.customerData) return prev;
      return {
        ...prev,
        customerData: {
          ...prev.customerData,
          balance,
          rewards: prev.customerData.rewards.map(reward => ({
            ...reward,
            available: balance[reward.activityType] >= reward.cost,
          })),
        },
      };
    });
  }, []);

  const openRepeatWarning = useCallback(() => {
    setState(prev => ({ ...prev, repeatWarningOpen: true }));
  }, []);

  const closeRepeatWarning = useCallback(() => {
    setState(prev => ({ ...prev, repeatWarningOpen: false }));
  }, []);

  return {
    ...state,
    goToScan,
    goToPermission,
    goToError,
    goToResolved,
    goToCustomer,
    goToRedeemConfirm,
    goToRedeemComplete,
    reset,
    scanAnother,
    setError,
    clearError,
    setPurchaseAmount,
    applyBalance,
    openRepeatWarning,
    closeRepeatWarning,
  };
}
