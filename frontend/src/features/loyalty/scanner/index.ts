// Scanner feature exports

// Types - re-export from types with explicit exports
export type {
  ScannerModalProps,
  ScannerState,
  ScannerStep,
  ScannerViewportProps,
  ManualCredentialEntryProps,
  ScannerPermissionStateProps,
  ScannerErrorStateProps,
  ConfirmRedemptionStepProps,
  RedemptionCompleteStepProps,
  CameraConfig,
} from './types';

export { initialScannerState, defaultCameraConfig } from './types';

// Hooks
export * from './hooks';

// Components
export * from './components';

// Re-export ScannerModal for backwards compatibility
// (will be refactored to use the new architecture)
export { ScannerModal } from './components/ScannerModal';
export { ScannerModal as default } from './components/ScannerModal';
