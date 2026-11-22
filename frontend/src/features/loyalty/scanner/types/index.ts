// Scanner feature types
// Extracted from ScannerModal to enable type sharing across scanner components

import type {
  CustomerForTransactionResponse,
  RewardOption,
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
  /** Decimal string as validated by `validatePurchaseAmount` (e.g. "12.500"); absent for stamps-only without amount. */
  purchaseAmount?: string;
  redemption?: RedeemRewardResponse;
  selectedReward?: SelectedReward;
  /** The 10-minute repeat-scan confirmation dialog is open (resolved step). */
  repeatWarningOpen: boolean;
  errorMessage?: string;
}

export interface SelectedReward {
  configurationId: string;
  rewardIndex: number;
}

/**
 * Initial scanner state value (not type-only)
 */
export const initialScannerState: ScannerState = { step: 'scan', repeatWarningOpen: false };

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
  onEarn: () => void;
  onRedeemReward: (reward: RewardOption) => void;
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
 * Props for ConfirmRedemptionStep component
 */
export interface ConfirmRedemptionStepProps {
  customerData: CustomerForTransactionResponse;
  selectedReward: SelectedReward;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy: boolean;
  branchBlocked?: boolean;
  errorMessage?: string;
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
