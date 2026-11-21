import { Camera } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { ScannerPermissionStateProps } from '../types';

/**
 * ScannerPermissionState - Displayed when camera permission is denied
 * 
 * Responsibilities:
 * - Show permission denied message
 * - Provide retry and close actions
 */
export function ScannerPermissionState({
  onRetry,
  onClose,
}: ScannerPermissionStateProps) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--danger-light)] flex items-center justify-center mb-6">
        <Camera className="w-10 h-10 text-[var(--danger)]" />
      </div>
      <h3 className="text-xl font-bold text-[var(--text)] mb-2">Camera Access Required</h3>
      <p className="text-[var(--text-muted)] mb-6">
        Please allow camera access to scan customer QR codes
      </p>
      <div className="space-y-3">
        <Button className="w-full" onClick={onRetry}>
          Try Again
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-6 max-w-md mx-auto">
        You can also enter the QR credential manually if camera access is unavailable
      </p>
    </div>
  );
}
