import { useState, useCallback } from 'react';
import { initialScannerState } from '../types';
import type { ScannerState } from '../types';
import type {
  CustomerForTransactionResponse,
  CalculateEarningsResponse,
  CreateLoyaltyTransactionResponse,
  RedeemRewardResponse,
} from '../../api/merchantTransactionApi';

/**
 * Custom hook for managing scanner workflow state
 * 
 * Responsibilities:
 * - Manage the current scanner step
 * - Store and update customer data
 * - Manage transaction data throughout the workflow
 * - Handle error states
 */
export interface ScannerStateActions {
  // Navigation actions
  goToScan: () => void;
  goToPermission: () => void;
  goToError: (message?: string) => void;
  goToResolved: (data: { credential: string; customerData: CustomerForTransactionResponse; branchId?: string }) => void;
  goToCalculate: (data: { purchaseAmount: number; earnings: CalculateEarningsResponse }) => void;
  goToConfirm: (data: { purchaseAmount: number; earnings: CalculateEarningsResponse }) => void;
  goToComplete: (transaction: CreateLoyaltyTransactionResponse) => void;
  goToRedeemConfirm: (rewardId: string) => void;
  goToRedeemComplete: (redemption: RedeemRewardResponse) => void;
  
  // Reset actions
  reset: () => void;
  scanAnother: () => void;
  
  // Setters
  setError: (message?: string) => void;
  clearError: () => void;
  setPurchaseAmount: (amount: number) => void;
}

export interface UseScannerStateResult extends ScannerState, ScannerStateActions {}

/**
 * Custom hook for managing the complete scanner state machine
 */
export function useScannerState(defaultBranchId?: string): UseScannerStateResult {
  const [state, setState] = useState<ScannerState>(initialScannerState);

  // Navigation actions
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
    data: { credential: string; customerData: CustomerForTransactionResponse; branchId?: string }
  ) => {
    setState(prev => ({
      ...prev,
      step: 'resolved',
      qrCredential: data.credential,
      customerData: data.customerData,
      branchId: data.branchId || defaultBranchId,
      errorMessage: undefined,
    }));
  }, [defaultBranchId]);

  const goToCalculate = useCallback((
    data: { purchaseAmount: number; earnings: CalculateEarningsResponse }
  ) => {
    setState(prev => ({
      ...prev,
      step: 'calculate',
      purchaseAmount: data.purchaseAmount,
      earnings: data.earnings,
      errorMessage: undefined,
    }));
  }, []);

  const goToConfirm = useCallback((
    data: { purchaseAmount: number; earnings: CalculateEarningsResponse }
  ) => {
    setState(prev => ({
      ...prev,
      step: 'confirm',
      purchaseAmount: data.purchaseAmount,
      earnings: data.earnings,
      errorMessage: undefined,
    }));
  }, []);

  const goToComplete = useCallback((transaction: CreateLoyaltyTransactionResponse) => {
    setState(prev => ({ ...prev, step: 'complete', transaction, errorMessage: undefined }));
  }, []);

  const goToRedeemConfirm = useCallback((rewardId: string) => {
    setState(prev => ({ ...prev, step: 'redeem-confirm', selectedRewardId: rewardId, errorMessage: undefined }));
  }, []);

  const goToRedeemComplete = useCallback((redemption: RedeemRewardResponse) => {
    setState(prev => ({ ...prev, step: 'redeem-complete', redemption, errorMessage: undefined }));
  }, []);

  // Reset and navigation actions
  const reset = useCallback(() => {
    setState(initialScannerState);
  }, []);

  const scanAnother = useCallback(() => {
    setState(initialScannerState);
  }, []);

  // State setters
  const setError = useCallback((message?: string) => {
    setState(prev => ({ ...prev, errorMessage: message }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, errorMessage: undefined }));
  }, []);

  const setPurchaseAmount = useCallback((amount: number) => {
    setState(prev => ({ ...prev, purchaseAmount: amount }));
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    goToScan,
    goToPermission,
    goToError,
    goToResolved,
    goToCalculate,
    goToConfirm,
    goToComplete,
    goToRedeemConfirm,
    goToRedeemComplete,
    reset,
    scanAnother,
    setError,
    clearError,
    setPurchaseAmount,
  };
}
