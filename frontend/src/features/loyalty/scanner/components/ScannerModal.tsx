import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import {
  useResolveCustomerForTransactionMutation,
  useCalculateEarningsMutation,
  useCreateLoyaltyTransactionMutation,
  useRedeemRewardMutation,
} from '../../api';
import type { ScannerModalProps } from '../types';
import type { CustomerForTransactionResponse, CalculateEarningsResponse } from '../../api/merchantTransactionApi';
import {
  ScannerViewport,
  ManualCredentialEntry,
  ScannerPermissionState,
  ScannerErrorState,
  CustomerScanResult,
  CustomerNotFound,
  CalculateEarningsStep,
  ConfirmTransactionStep,
  TransactionCompleteStep,
  ConfirmRedemptionStep,
  RedemptionCompleteStep,
} from './';
import { useCamera } from '../hooks/useCamera';
import { useScannerState } from '../hooks/useScannerState';

/**
 * ScannerModal - Main scanner dialog component
 * 
 * Composed of focused sub-components for each responsibility:
 * - ScannerViewport: Camera preview and scanning frame
 * - ManualCredentialEntry: Manual QR credential input
 * - ScannerPermissionState: Permission denied state
 * - ScannerErrorState: Camera initialization error state
 * - CustomerScanResult: Customer found display
 * - CalculateEarningsStep: Purchase amount input
 * - ConfirmTransactionStep: Transaction confirmation
 * - TransactionCompleteStep: Transaction success
 * - ConfirmRedemptionStep: Reward redemption confirmation
 * - RedemptionCompleteStep: Reward redemption success
 */
export function ScannerModal({ isOpen, onClose, branchId: defaultBranchId }: ScannerModalProps) {
  // State management via custom hook
  const scanner = useScannerState(defaultBranchId);
  
  // Local state for form inputs
  const [manualCredential, setManualCredential] = useState('');
  const [purchaseAmountInput, setPurchaseAmountInput] = useState('');
  const [busy, setBusy] = useState(false);
  
  // Idempotency keys for duplicate prevention - generated once per transaction/redeem intent
  const transactionIdempotencyKeyRef = useRef<string | null>(null);
  const redemptionIdempotencyKeyRef = useRef<string | null>(null);
  
  // Generate a unique idempotency key
  const generateIdempotencyKey = (): string => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Camera management via custom hook
  const {
    videoRef,
    startScanning,
    stopCamera,
    resetCamera,
  } = useCamera();

  // API mutations
  const [resolveCustomer] = useResolveCustomerForTransactionMutation();
  const [calculateEarnings] = useCalculateEarningsMutation();
  const [createTransaction] = useCreateLoyaltyTransactionMutation();
  const [redeemReward] = useRedeemRewardMutation();

  // Permission tracking ref
  const permissionRequestedRef = useRef(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset();
      permissionRequestedRef.current = false;
      // Reset idempotency keys when opening fresh
      transactionIdempotencyKeyRef.current = null;
      redemptionIdempotencyKeyRef.current = null;
    } else {
      stopCamera();
      // Reset idempotency keys when closing
      transactionIdempotencyKeyRef.current = null;
      redemptionIdempotencyKeyRef.current = null;
    }
  }, [isOpen, stopCamera, reset]);

  // Handle camera permission and scanning
  useEffect(() => {
    if (scanner.step !== 'scan' || !videoRef.current) return;

    const initializeScanning = async () => {
      if (permissionRequestedRef.current) return;
      permissionRequestedRef.current = true;

      try {
        await startScanning(handleScannedQr);
      } catch (err) {
        scanner.goToPermission();
      }
    };

    initializeScanning();
  }, [scanner.step, videoRef, startScanning, scanner]);

  // Handle successful QR scan
  function handleScannedQr(qrText: string) {
    stopCamera();
    resolveQrCredential(qrText);
  }

  // Resolve customer from QR credential
  function resolveQrCredential(credential: string) {
    setBusy(true);

    resolveCustomer({ qrCredential: credential })
      .unwrap()
      .then((data) => {
        scanner.goToResolved({
          credential,
          customerData: data,
          branchId: defaultBranchId,
        });
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Customer not found. Please check the QR code.') as string;
        scanner.goToResolved({ credential, customerData: undefined as any, branchId: defaultBranchId });
        scanner.setError(message);
      })
      .finally(() => setBusy(false));
  }

  // Handle manual credential submission
  function handleScanFromManual() {
    if (!manualCredential.trim()) {
      scanner.setError('Please enter a QR credential');
      return;
    }
    stopCamera();
    resolveQrCredential(manualCredential.trim());
  }

  // Handle earnings calculation
  function handleCalculateEarnings() {
    if (!scanner.customerData || purchaseAmountInput === '') return;

    const amount = parseFloat(purchaseAmountInput);
    if (isNaN(amount) || amount <= 0) {
      scanner.setError('Please enter a valid purchase amount');
      return;
    }

    setBusy(true);
    calculateEarnings({
      membershipId: scanner.customerData.membership.id,
      purchaseAmount: amount,
      branchId: scanner.branchId || defaultBranchId,
    })
      .unwrap()
      .then((earnings) => {
        // Generate idempotency key for transaction and go to confirm
        transactionIdempotencyKeyRef.current = generateIdempotencyKey();
        scanner.goToConfirm({ purchaseAmount: amount, earnings });
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to calculate earnings.') as string;
        scanner.setError(message);
      })
      .finally(() => setBusy(false));
  }

  // Handle transaction creation
  function handleCreateTransaction() {
    if (!scanner.customerData || !scanner.earnings || !scanner.purchaseAmount) return;

    const key = transactionIdempotencyKeyRef.current;
    if (!key) {
      scanner.setError('Transaction key missing. Please try again.');
      setBusy(false);
      return;
    }

    setBusy(true);
    createTransaction({
      membershipId: scanner.customerData.membership.id,
      purchaseAmount: scanner.purchaseAmount,
      stampsEarned: scanner.earnings.stampsToEarn,
      pointsEarned: scanner.earnings.pointsToEarn,
      branchId: scanner.branchId || defaultBranchId,
      idempotencyKey: key,
    })
      .unwrap()
      .then((transaction) => {
        scanner.goToComplete(transaction);
        stopCamera();
        // Reset key after successful transaction
        transactionIdempotencyKeyRef.current = null;
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to create transaction.') as string;
        scanner.setError(message);
      })
      .finally(() => setBusy(false));
  }

  // Handle reward selection
  function handleSelectReward(rewardId: string) {
    // Generate idempotency key when starting redemption flow
    redemptionIdempotencyKeyRef.current = generateIdempotencyKey();
    scanner.goToRedeemConfirm(rewardId);
  }

  // Handle reward redemption
  function handleRedeemReward() {
    if (!scanner.customerData || !scanner.selectedRewardId) return;

    const key = redemptionIdempotencyKeyRef.current;
    if (!key) {
      scanner.setError('Redemption key missing. Please try again.');
      setBusy(false);
      return;
    }

    setBusy(true);
    redeemReward({
      membershipId: scanner.customerData.membership.id,
      rewardId: scanner.selectedRewardId,
      branchId: scanner.branchId || defaultBranchId,
      idempotencyKey: key,
    })
      .unwrap()
      .then((redemption) => {
        scanner.goToRedeemComplete(redemption);
        stopCamera();
        // Reset key after successful redemption
        redemptionIdempotencyKeyRef.current = null;
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to redeem reward.') as string;
        // Go back to resolved state with customer data
        const customerData = scanner.customerData as CustomerForTransactionResponse;
        scanner.goToResolved({ credential: '', customerData, branchId: scanner.branchId });
        scanner.setError(message);
      })
      .finally(() => setBusy(false));
  }

  // Reset all state
  function reset() {
    stopCamera();
    resetCamera();
    scanner.reset();
    setManualCredential('');
    setPurchaseAmountInput('');
    permissionRequestedRef.current = false;
  }

  // Scan another customer
  function scanAnother() {
    reset();
    // Reset both idempotency keys for new customer
    transactionIdempotencyKeyRef.current = null;
    redemptionIdempotencyKeyRef.current = null;
    // Re-open camera after brief delay
    setTimeout(() => {
      if (isOpen) {
        scanner.goToScan();
      }
    }, 100);
  }

  // Helper to safely go back to resolved state
  function goBackToResolved() {
    const customerData = scanner.customerData as CustomerForTransactionResponse | undefined;
    if (customerData) {
      scanner.goToResolved({ credential: '', customerData, branchId: scanner.branchId });
    } else {
      scanner.goToScan();
    }
    // Reset both idempotency keys when going back
    transactionIdempotencyKeyRef.current = null;
    redemptionIdempotencyKeyRef.current = null;
  }

  // Helper to safely go back to calculate state
  function goBackToCalculate() {
    const customerData = scanner.customerData as CustomerForTransactionResponse | undefined;
    const earnings = scanner.earnings as CalculateEarningsResponse | undefined;
    if (customerData && earnings) {
      scanner.goToCalculate({ purchaseAmount: scanner.purchaseAmount || 0, earnings });
    } else {
      goBackToResolved();
    }
    // Reset transaction key when going back
    transactionIdempotencyKeyRef.current = null;
  }

  // Render the appropriate content based on current step
  const renderContent = (): ReactNode => {
    switch (scanner.step) {
      case 'scan':
        return (
          <div className="space-y-6">
            <ScannerViewport 
              videoRef={videoRef} 
              onScannedQr={handleScannedQr}
            />
            <ManualCredentialEntry
              credential={manualCredential}
              onChange={setManualCredential}
              onSubmit={handleScanFromManual}
              isBusy={busy}
              errorMessage={scanner.errorMessage}
            />
          </div>
        );

      case 'permission':
        return (
          <ScannerPermissionState
            onRetry={reset}
            onClose={onClose}
          />
        );

      case 'error':
        return (
          <ScannerErrorState
            errorMessage={scanner.errorMessage}
            onRetry={reset}
            onClose={onClose}
          />
        );

      case 'resolved':
        if (!scanner.customerData) {
          return (
            <CustomerNotFound
              errorMessage={scanner.errorMessage}
              onTryAgain={scanAnother}
              onClose={onClose}
            />
          );
        }
        return (
          <CustomerScanResult
            customerData={scanner.customerData}
            onRecordPurchase={() => scanner.goToCalculate({ purchaseAmount: 0, earnings: undefined as any })}
            onRedeemReward={handleSelectReward}
            onScanAnother={scanAnother}
            errorMessage={scanner.errorMessage}
          />
        );

      case 'calculate':
        if (!scanner.customerData) return null;
        return (
          <CalculateEarningsStep
            customerData={scanner.customerData}
            purchaseAmountInput={purchaseAmountInput}
            onAmountChange={(value) => {
              setPurchaseAmountInput(value);
              scanner.clearError();
            }}
            onCalculate={handleCalculateEarnings}
            isBusy={busy}
            errorMessage={scanner.errorMessage}
            onBack={goBackToResolved}
          />
        );

      case 'confirm':
        if (!scanner.customerData || !scanner.earnings) return null;
        return (
          <ConfirmTransactionStep
            customerData={scanner.customerData}
            earnings={scanner.earnings}
            onConfirm={handleCreateTransaction}
            onBack={goBackToCalculate}
            isBusy={busy}
            errorMessage={scanner.errorMessage}
          />
        );

      case 'complete':
        if (!scanner.transaction || !scanner.customerData) return null;
        return (
          <TransactionCompleteStep
            transaction={scanner.transaction}
            customerData={scanner.customerData}
            onScanAnother={scanAnother}
            onClose={onClose}
          />
        );

      case 'redeem-confirm':
        if (!scanner.customerData) return null;
        return (
          <ConfirmRedemptionStep
            customerData={scanner.customerData}
            rewardId={scanner.selectedRewardId || ''}
            onConfirm={handleRedeemReward}
            onCancel={goBackToResolved}
            isBusy={busy}
            errorMessage={scanner.errorMessage}
          />
        );

      case 'redeem-complete':
        if (!scanner.redemption || !scanner.customerData) return null;
        return (
          <RedemptionCompleteStep
            redemption={scanner.redemption}
            customerData={scanner.customerData}
            onScanAnother={scanAnother}
            onClose={onClose}
          />
        );

      default:
        return <div>Invalid state</div>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan Customer QR"
      size="lg"
    >
      <div className="max-w-md mx-auto">
        {renderContent()}
      </div>
    </Modal>
  );
}

export default ScannerModal;
