import { Camera } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useI18n } from '../../../../shared/i18n/i18n';
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
  const { t } = useI18n();
  
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--danger-light)] flex items-center justify-center mb-6">
        <Camera className="w-10 h-10 text-[var(--danger)]" />
      </div>
      <h3 className="text-xl font-bold text-[var(--text)] mb-2">{t('cameraAccessRequired')}</h3>
      <p className="text-[var(--text-muted)] mb-6">
        {t('allowCameraAccess')}
      </p>
      <div className="space-y-3">
        <Button className="w-full" onClick={onRetry}>
          {t('tryAgain')}
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-6 max-w-md mx-auto">
        {t('manualEntryOption')}
      </p>
    </div>
  );
}
