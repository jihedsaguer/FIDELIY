import { useI18n } from '../../../../shared/i18n/i18n';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { QrCode, User, CheckCircle, Info, Phone } from 'lucide-react';
import type { RegisterCustomerResponse } from '../../../../features/merchant/dto/register-customer.dto';

export interface RegistrationResultModalProps {
  result: RegisterCustomerResponse | null;
  onClose: () => void;
  onScanAnother: () => void;
  onAutoResolve?: () => void;
}

export function RegistrationResultModal({
  result,
  onClose,
  onScanAnother,
  onAutoResolve,
}: RegistrationResultModalProps) {
  const { t } = useI18n();

  if (!result) return null;

  const { isNewCustomer, name, phone, personalQrCredential } = result;

  return (
    <Modal
      isOpen={!!result}
      onClose={onClose}
      title={isNewCustomer ? t('registrationSuccessful') : t('customerAlreadyExists')}
      size="md"
    >
      <div className="text-center space-y-6">
        {isNewCustomer && personalQrCredential ? (
          <>
            {/* Success state for new customer */}
            <div className="mx-auto w-20 h-20 rounded-full bg-[var(--success-light)] flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-[var(--success)]" />
            </div>
            
            <h3 className="text-xl font-bold text-[var(--text)]">{t('newCustomerRegistered')}</h3>
            
            <Card className="p-4 bg-[var(--subtle)]">
              <div className="space-y-2">
                <p className="text-[var(--text)]">
                  <User className="inline w-4 h-4 mr-2" />
                  {name}
                </p>
                <p className="text-[var(--text-muted)]">
                  <Phone className="inline w-4 h-4 mr-2" />
                  {phone}
                </p>
              </div>
            </Card>

            {/* QR Code Display */}
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-[var(--text)] mb-2 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                {t('customerQRCode')}
              </p>
              <div className="bg-white p-2 rounded border">
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                      <rect width="200" height="200" fill="white"/>
                      <text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="12" fill="black">QR Code</text>
                      <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="10" fill="black">${encodeURIComponent(personalQrCredential)}</text>
                    </svg>
                  `)}`}
                  alt={t('customerQRCode')}
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {t('customerShowQRToMerchant')}
              </p>
            </div>

            <p className="text-sm text-[var(--text-muted)]">
              {t('customerCanNowScan')}
            </p>
            
            {onAutoResolve && (
              <Button className="w-full" onClick={onAutoResolve}>
                {t('continueWithThisCustomer')}
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Existing customer state */}
            <div className="mx-auto w-20 h-20 rounded-full bg-[var(--info-light)] flex items-center justify-center mb-4">
              <Info className="w-10 h-10 text-[var(--info)]" />
            </div>
            
            <h3 className="text-xl font-bold text-[var(--text)]">{t('customerAlreadyExists')}</h3>
            
            <Card className="p-4 bg-[var(--subtle)]">
              <div className="space-y-2">
                <p className="text-[var(--text)]">
                  <User className="inline w-4 h-4 mr-2" />
                  {name}
                </p>
                <p className="text-[var(--text-muted)]">
                  <Phone className="inline w-4 h-4 mr-2" />
                  {phone}
                </p>
              </div>
            </Card>

            <p className="text-sm text-[var(--text-muted)]">
              {t('customerAlreadyHasQR')}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {t('askCustomerToShowQR')}
            </p>
          </>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('close')}
          </Button>
          <Button className="flex-1" onClick={onScanAnother}>
            {t('scanAnotherCustomer')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RegistrationResultModal;
