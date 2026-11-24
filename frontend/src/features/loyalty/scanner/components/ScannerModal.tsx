import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { useI18n } from '../../../../shared/i18n/i18n';
import {
  useResolveCustomerForTransactionMutation,
  useCreateLoyaltyTransactionMutation,
  useRedeemRewardMutation,
} from '../../api';
import { useRegisterCustomerMutation } from '../../../../features/merchant/api/merchantApi';
import type { ScannerModalProps } from '../types';
import type { RewardOption } from '../../api/merchantTransactionApi';
import type { RegisterCustomerDto, RegisterCustomerResponse } from '../../../../features/merchant/dto/register-customer.dto';
import {
  ScannerViewport,
  ManualCredentialEntry,
  ScannerPermissionState,
  ScannerErrorState,
  CustomerScanResult,
  CustomerNotFound,
  ConfirmRedemptionStep,
  RedemptionCompleteStep,
  RegistrationFormModal,
  RegistrationResultModal,
} from './';
import { CameraStartError, useCamera, type CameraErrorKind } from '../hooks/useCamera';
import { useScannerState } from '../hooks/useScannerState';
import { useScannerBranch } from '../hooks/useScannerBranch';
import { useIdempotencyKey } from '../hooks/useIdempotencyKey';
import { validatePurchaseAmount } from '../utils/amount';
import { formatDeltas } from '../utils/transactionFormat';
import { isRepeatConfirmationRequired, transactionErrorKey, readApiError } from '../utils/apiError';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';

// Messages for camera failures other than 'denied' (which shows the permission step).
const CAMERA_ERROR_KEYS = {
  insecure: 'cameraInsecureContext',
  unsupported: 'cameraUnsupported',
  'no-camera': 'cameraNotFound',
  busy: 'cameraBusy',
  unknown: 'cameraStartFailed',
} as const satisfies Record<Exclude<CameraErrorKind, 'denied'>, string>;

/**
 * ScannerModal - Main scanner dialog component
 * 
 * Composed of focused sub-components for each responsibility:
 * - ScannerViewport: Camera preview and scanning frame
 * - ManualCredentialEntry: Manual QR credential input
 * - ScannerPermissionState: Permission denied state
 * - ScannerErrorState: Camera initialization error state
 * - CustomerScanResult: Customer found display and direct purchase recording
 * - ConfirmRedemptionStep: Reward redemption confirmation
 * - RedemptionCompleteStep: Reward redemption success
 */
export function ScannerModal({ isOpen, onClose, branchId: defaultBranchId }: ScannerModalProps) {
  // Translation hook
  const { t } = useI18n();
  
  // State management via custom hook
  const scanner = useScannerState(defaultBranchId);
  
  // Local state for form inputs
  const [manualCredential, setManualCredential] = useState('');
  const [purchaseAmountInput, setPurchaseAmountInput] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>();
  // Inline success after an earn: the merchant stays on the resolved card screen.
  const [earnSuccess, setEarnSuccess] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  
  // Registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegisterCustomerResponse | null>(null);

  // Idempotency keys live only in refs (never in storage): one per logical request.
  const earnKey = useIdempotencyKey();
  const redeemKey = useIdempotencyKey();

  // Branch choice (picker shown only when the business has several branches)
  const branch = useScannerBranch(isOpen, defaultBranchId);

  // Camera management via custom hook
  const { videoRef, start: startCamera, stop: stopCamera } = useCamera();

  // API mutations
  const [resolveCustomer] = useResolveCustomerForTransactionMutation();
  const [createTransaction] = useCreateLoyaltyTransactionMutation();
  const [redeemReward] = useRedeemRewardMutation();
  const [registerCustomer] = useRegisterCustomerMutation();

  // `reset` and `handleScannedQr` are plain functions re-created on every render.
  // Effects read them through refs so that re-renders (e.g. typing in the manual
  // entry field) never re-run the open/close or camera effects.
  const resetRef = useRef<() => void>(() => undefined);
  const handleScannedQrRef = useRef<(qrText: string) => void>(() => undefined);
  const wasOpenRef = useRef(false);
  const { goToPermission, goToError } = scanner;

  // Reset state only on the closed -> open transition; stop the camera on close.
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (isOpen) {
      if (wasOpen) return;
      resetRef.current();
      earnKey.clear();
      redeemKey.clear();
    } else {
      stopCamera();
      earnKey.clear();
      redeemKey.clear();
    }
  }, [isOpen, stopCamera, earnKey.clear, redeemKey.clear]);

  // Run the camera while the modal is open on the 'scan' step; closing the modal, leaving
  // the step or unmounting releases it (also correct under StrictMode's double effects:
  // a stream that opens after its effect was cleaned up is released by the hook).
  useEffect(() => {
    const video = videoRef.current;
    if (!isOpen || scanner.step !== 'scan' || !video) return;
    let cancelled = false;

    startCamera(video, (qrText) => {
      if (!cancelled) handleScannedQrRef.current(qrText);
    }).catch((err: unknown) => {
      if (cancelled) return;
      const kind = err instanceof CameraStartError ? err.kind : 'unknown';
      if (kind === 'denied') goToPermission();
      else goToError(t(CAMERA_ERROR_KEYS[kind]));
    });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, scanner.step, videoRef, startCamera, stopCamera, goToPermission, goToError, t]);

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
        scanner.goToResolved({ credential, branchId: defaultBranchId });
        scanner.setError(t(transactionErrorKey(err, 'resolve')));
      })
      .finally(() => setBusy(false));
  }

  // Handle manual credential submission
  function handleScanFromManual() {
    if (!manualCredential.trim()) {
      scanner.setError(t('pleaseEnterQR'));
      return;
    }
    stopCamera();
    resolveQrCredential(manualCredential.trim());
  }

  // Record a purchase straight from the resolved screen. The server calculates the
  // earnings itself. `confirmRepeat` resends the SAME key after the 10-minute warning.
  function handleEarnDirect(confirmRepeat = false) {
    if (!scanner.customerData || branch.blocked) return;

    const amountRequired = scanner.customerData.program.type !== 'stamps';
    const validation = validatePurchaseAmount(purchaseAmountInput, amountRequired);
    if (!validation.ok) {
      setAmountError(t(validation.error === 'required' ? 'amountRequiredForPoints' : 'invalidAmountFormat'));
      return;
    }
    setAmountError(undefined);
    setEarnSuccess(undefined);

    const membershipId = scanner.customerData.membership.id;
    const key = earnKey.keyFor(
      `earn|${membershipId}|${validation.value ?? ''}|${branch.branchId ?? ''}`,
    );

    setBusy(true);
    createTransaction({
      membershipId,
      ...(validation.value !== undefined ? { purchaseAmount: validation.value } : {}),
      ...(branch.branchId ? { branchId: branch.branchId } : {}),
      idempotencyKey: key,
      ...(confirmRepeat ? { confirmRepeat: true } : {}),
    })
      .unwrap()
      .then((transaction) => {
        scanner.applyBalance(transaction.newBalance);
        const deltas = formatDeltas(
          { stampsDelta: transaction.stampsEarned, pointsDelta: transaction.pointsEarned },
          t('stamps'),
          t('points'),
        );
        setEarnSuccess(deltas ? `${t('transactionRecordedSuccessfully')} : ${deltas}` : t('transactionRecordedSuccessfully'));
        setPurchaseAmountInput('');
        earnKey.clear();
      })
      .catch((err) => {
        if (isRepeatConfirmationRequired(err)) {
          scanner.openRepeatWarning();
          return;
        }
        scanner.setError(t(transactionErrorKey(err, 'earn')));
      })
      .finally(() => setBusy(false));
  }

  // Handle reward selection
  function handleSelectReward(reward: RewardOption) {
    setEarnSuccess(undefined);
    scanner.goToRedeemConfirm({ configurationId: reward.configurationId, rewardIndex: reward.rewardIndex });
  }

  // Handle reward redemption
  function handleRedeemReward() {
    if (!scanner.customerData || !scanner.selectedReward || branch.blocked) return;

    const membershipId = scanner.customerData.membership.id;
    const { configurationId, rewardIndex } = scanner.selectedReward;
    const key = redeemKey.keyFor(
      `redeem|${membershipId}|${configurationId}|${rewardIndex}|${branch.branchId ?? ''}`,
    );

    setBusy(true);
    redeemReward({
      membershipId,
      configurationId,
      rewardIndex,
      ...(branch.branchId ? { branchId: branch.branchId } : {}),
      idempotencyKey: key,
    })
      .unwrap()
      .then((redemption) => {
        scanner.applyBalance(redemption.newBalance);
        scanner.goToRedeemComplete(redemption);
        stopCamera();
        redeemKey.clear();
      })
      .catch((err) => {
        // Stay on the confirm step and keep the key, so a retry is idempotent.
        scanner.setError(t(transactionErrorKey(err, 'redeem')));
      })
      .finally(() => setBusy(false));
  }

  // Reset all state
  function reset() {
    stopCamera();
    scanner.reset();
    setManualCredential('');
    setPurchaseAmountInput('');
    setAmountError(undefined);
    setEarnSuccess(undefined);
  }

  // Keep the refs used by the effects pointing at the latest closures.
  resetRef.current = reset;
  handleScannedQrRef.current = handleScannedQr;

  // Scan another customer
  function scanAnother() {
    reset();
    earnKey.clear();
    redeemKey.clear();
    // Re-open camera after brief delay
    setTimeout(() => {
      if (isOpen) {
        scanner.goToScan();
      }
    }, 100);
  }

  // Handle registration form submission
  function handleRegisterCustomer(name: string, phone: string, dateOfBirth?: string) {
    // Basic Tunisian phone validation
    const phoneRegex = /^(\+216|216)?[0-9]{8}$/;
    const cleanedPhone = phone.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      scanner.setError(t('invalidPhoneFormat'));
      return;
    }

    setBusy(true);

    const request: RegisterCustomerDto = {
      name: name.trim(),
      phone: cleanedPhone,
      dateOfBirth: dateOfBirth || undefined,
    };

    registerCustomer(request)
      .unwrap()
      .then((result: RegisterCustomerResponse) => {
        setRegistrationResult(result);
        setShowRegistrationModal(false);
      })
      .catch((err) => {
        scanner.setError(t(readApiError(err).status === 409 ? 'customerAlreadyExists' : 'registrationFailed'));
      })
      .finally(() => setBusy(false));
  }

  // Open registration modal
  function openRegistrationModal() {
    setShowRegistrationModal(true);
    setRegistrationResult(null);
    scanner.clearError();
  }

  // Close registration modal
  function closeRegistrationModal() {
    setShowRegistrationModal(false);
    setRegistrationResult(null);
    scanner.clearError();
  }

  // Auto-resolve customer after registration for new customers with QR credential
  function handleAutoResolve() {
    const result = registrationResult;
    if (!result || !result.personalQrCredential) {
      return;
    }

    // Resolve the newly registered customer using their QR credential
    setBusy(true);
    resolveCustomer({ qrCredential: result.personalQrCredential })
      .unwrap()
      .then((data) => {
        scanner.goToResolved({
          credential: result.personalQrCredential!,
          customerData: data,
          branchId: defaultBranchId,
        });
        setRegistrationResult(null);
      })
      .catch(() => {
        scanner.setError(t('failedToResolveCustomer'));
      })
      .finally(() => {
        setBusy(false);
        setShowRegistrationModal(false);
      });
  }

  // Back to the resolved customer (keeps credential and customer data)
  function goBackToResolved() {
    if (scanner.customerData) {
      scanner.goToCustomer();
    } else {
      scanner.goToScan();
    }
  }

  // Render the appropriate content based on current step. On the 'error' step the
  // message is the camera failure, already shown by ScannerErrorState.
  const manualEntry = (
    <ManualCredentialEntry
      credential={manualCredential}
      onChange={setManualCredential}
      onSubmit={handleScanFromManual}
      isBusy={busy}
      errorMessage={scanner.step === 'error' ? undefined : scanner.errorMessage}
    />
  );

  const renderContent = (): ReactNode => {
    switch (scanner.step) {
      case 'scan':
        return (
          <div className="space-y-6">
            <ScannerViewport 
              videoRef={videoRef} 
              onScannedQr={handleScannedQr}
            />
            {manualEntry}
          </div>
        );

      case 'permission':
        return (
          <div className="space-y-6">
            <ScannerPermissionState
              onRetry={reset}
              onClose={onClose}
            />
            {manualEntry}
          </div>
        );

      case 'error':
        return (
          <div className="space-y-6">
            <ScannerErrorState
              errorMessage={scanner.errorMessage}
              onRetry={reset}
              onClose={onClose}
            />
            {manualEntry}
          </div>
        );

      case 'resolved':
        if (!scanner.customerData) {
          return (
            <CustomerNotFound
              errorMessage={scanner.errorMessage}
              onTryAgain={scanAnother}
              onClose={onClose}
              onRegisterCustomer={openRegistrationModal}
            />
          );
        }
        return (
          <CustomerScanResult
            customerData={scanner.customerData}
            onEarn={() => handleEarnDirect(false)}
            amountInput={purchaseAmountInput}
            onAmountChange={(value) => {
              setPurchaseAmountInput(value);
              setAmountError(undefined);
              scanner.clearError();
            }}
            amountError={amountError}
            successMessage={earnSuccess}
            isBusy={busy}
            onRedeemReward={handleSelectReward}
            onScanAnother={scanAnother}
            onBalanceChange={scanner.applyBalance}
            branch={branch}
            errorMessage={scanner.errorMessage}
          />
        );

      case 'redeem-confirm':
        if (!scanner.customerData || !scanner.selectedReward) return null;
        return (
          <ConfirmRedemptionStep
            customerData={scanner.customerData}
            selectedReward={scanner.selectedReward}
            onConfirm={handleRedeemReward}
            onCancel={goBackToResolved}
            isBusy={busy}
            branchBlocked={branch.blocked}
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('scanCustomerQRTitle')}
        size="lg"
      >
        <div className="max-w-md mx-auto">
          {renderContent()}
        </div>
      </Modal>

      {/* Repeat-scan warning: the same idempotency key is reused on confirmation */}
      <ConfirmDialog
        isOpen={isOpen && scanner.step === 'resolved' && scanner.repeatWarningOpen}
        title={t('repeatScanTitle')}
        message={t('repeatScanMessage')}
        confirmLabel={t('repeatScanConfirm')}
        isPending={busy}
        onConfirm={() => {
          scanner.closeRepeatWarning();
          handleEarnDirect(true);
        }}
        onCancel={scanner.closeRepeatWarning}
      />

      {/* Registration Modal */}
      <RegistrationFormModal
        isOpen={showRegistrationModal}
        onClose={closeRegistrationModal}
        onSuccess={setRegistrationResult}
        isBusy={busy}
        errorMessage={scanner.errorMessage}
        onRegister={handleRegisterCustomer}
      />

      {/* Registration Result Modal */}
      <RegistrationResultModal
        result={registrationResult}
        onClose={scanAnother}
        onScanAnother={scanAnother}
        onAutoResolve={handleAutoResolve}
      />
    </>
  );
}

export default ScannerModal;
