import { AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useI18n } from '../../../../shared/i18n/i18n';
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
  const { t } = useI18n();
  
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-[var(--danger-light)] flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-[var(--danger)]" />
      </div>
      <h3 className="text-xl font-bold text-[var(--danger)] mb-2">{t('cameraError')}</h3>
      <p className="text-[var(--text-muted)] mb-6">
        {errorMessage || t('unableToAccessCamera')}
      </p>
      <div className="space-y-3">
        <Button className="w-full" onClick={onRetry}>
          {t('tryAgain')}
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </div>
  );
}
