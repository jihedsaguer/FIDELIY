import { AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { ScannerErrorStateProps } from '../types';

/**
 * ScannerErrorState - Displayed when camera initialization fails
 * 
 * Responsibilities:
 * - Show error message
 * - Provide retry and close actions
 */
export function ScannerErrorState({
  errorMessage,
  onRetry,
  onClose,
}: ScannerErrorStateProps) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--danger-light)] flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-[var(--danger)]" />
      </div>
      <h3 className="text-xl font-bold text-[var(--danger)] mb-2">Camera Error</h3>
      <p className="text-[var(--text-muted)] mb-6">
        {errorMessage || 'Unable to access the camera'}
      </p>
      <div className="space-y-3">
        <Button className="w-full" onClick={onRetry}>
          Try Again
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
