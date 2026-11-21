// Scanner feature types
// Extracted from ScannerModal to enable type sharing across scanner components

import type {
  CustomerForTransactionResponse,
  CalculateEarningsResponse,
  CreateLoyaltyTransactionResponse,
  RedeemRewardResponse,
} from '../../api/merchantTransactionApi';

/**
 * Scanner modal props
 */
export interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
}

/**
 * Scanner state - represents the current step in the scanning workflow
 */
export type ScannerStep = 
  | 'scan'              // Initial scanning state
  | 'permission'        // Camera permission requested/denied
  | 'error'             // Camera initialization error
  | 'resolved'          // Customer resolved from QR
  | 'calculate'         // Calculating earnings
  | 'confirm'           // Confirm transaction before creation
  | 'complete'          // Transaction completed
  | 'redeem-confirm'    // Confirm reward redemption
  | 'redeem-complete';  // Reward redemption completed

/**
 * Complete scanner state object
 */
export interface ScannerState {
  step: ScannerStep;
  qrCredential?: string;
  branchId?: string;
  customerData?: CustomerForTransactionResponse;
  purchaseAmount?: number;
  earnings?: CalculateEarningsResponse;
  transaction?: CreateLoyaltyTransactionResponse;
  redemption?: RedeemRewardResponse;
  selectedRewardId?: string;
  errorMessage?: string;
}

/**
 * Initial scanner state value (not type-only)
 */
export const initialScannerState: ScannerState = { step: 'scan' };

/**
 * Props for ScannerViewport component
 */
export interface ScannerViewportProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onScannedQr: (qrText: string) => void;
}

/**
 * Props for ManualCredentialEntry component
 */
export interface ManualCredentialEntryProps {
  credential: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isBusy: boolean;
  errorMessage?: string;
}

/**
 * Props for CustomerScanResult component
 */
export interface CustomerScanResultProps {
  customerData: CustomerForTransactionResponse;
  onRecordPurchase: () => void;
  onRedeemReward: (rewardId: string) => void;
  onScanAnother: () => void;
  errorMessage?: string;
}

/**
 * Props for ScannerErrorState component
 */
export interface ScannerErrorStateProps {
  errorMessage?: string;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Props for ScannerPermissionState component
 */
export interface ScannerPermissionStateProps {
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Props for CalculateEarningsStep component
 */
export interface CalculateEarningsStepProps {
  customerData: CustomerForTransactionResponse;
  purchaseAmountInput: string;
  onAmountChange: (value: string) => void;
  onCalculate: () => void;
  isBusy: boolean;
  errorMessage?: string;
  onBack: () => void;
}

/**
 * Props for ConfirmTransactionStep component
 */
export interface ConfirmTransactionStepProps {
  customerData: CustomerForTransactionResponse;
  earnings: CalculateEarningsResponse;
  onConfirm: () => void;
  onBack: () => void;
  isBusy: boolean;
  errorMessage?: string;
}

/**
 * Props for ConfirmRedemptionStep component
 */
export interface ConfirmRedemptionStepProps {
  customerData: CustomerForTransactionResponse;
  rewardId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy: boolean;
  errorMessage?: string;
}

/**
 * Props for TransactionCompleteStep component
 */
export interface TransactionCompleteStepProps {
  transaction: CreateLoyaltyTransactionResponse;
  customerData: CustomerForTransactionResponse;
  onScanAnother: () => void;
  onClose: () => void;
}

/**
 * Props for RedemptionCompleteStep component
 */
export interface RedemptionCompleteStepProps {
  redemption: RedeemRewardResponse;
  customerData: CustomerForTransactionResponse;
  onScanAnother: () => void;
  onClose: () => void;
}

/**
 * Camera hook configuration
 */
export interface CameraConfig {
  facingMode?: 'user' | 'environment';
  width?: { ideal: number };
  height?: { ideal: number };
}

/**
 * Default camera configuration for scanning QR codes
 */
export const defaultCameraConfig: CameraConfig = {
  facingMode: 'environment',
  width: { ideal: 1280 },
  height: { ideal: 720 },
};
