import { useState, useEffect } from 'react';
import { useI18n } from '../../../../shared/i18n/i18n';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { FormFeedback } from '../../../../components/ui/FormFeedback';
import { User, Phone, Calendar } from 'lucide-react';
import type { RegisterCustomerResponse } from '../../../../features/merchant/dto/register-customer.dto';

export interface RegistrationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: RegisterCustomerResponse) => void;
  isBusy: boolean;
  errorMessage?: string;
  onRegister: (name: string, phone: string, dateOfBirth?: string) => void;
}

export function RegistrationFormModal({
  isOpen,
  onClose,
  isBusy,
  errorMessage,
  onRegister,
}: RegistrationFormModalProps) {
  const { t, locale } = useI18n();
  const isRTL = locale === 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();

  // Clear form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setDateOfBirth('');
      setNameError(undefined);
      setPhoneError(undefined);
    }
  }, [isOpen]);

  // Basic Tunisian phone validation (+216 format)
  const validatePhone = (phoneNumber: string): boolean => {
    if (!phoneNumber) return false;
    // Accept +216 or 216 followed by 8 digits, or just 8 digits (0-9)
    const phoneRegex = /^(\+216|216)?[0-9]{8}$/;
    return phoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError(t('nameRequired'));
      isValid = false;
    } else {
      setNameError(undefined);
    }

    if (!phone.trim()) {
      setPhoneError(t('phoneRequired'));
      isValid = false;
    } else if (!validatePhone(phone)) {
      setPhoneError(t('invalidPhoneFormat'));
      isValid = false;
    } else {
      setPhoneError(undefined);
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Trigger registration via callback
    if (onRegister) {
      onRegister(name.trim(), phone.trim(), dateOfBirth || undefined);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim()) {
      setNameError(undefined);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (value.trim()) {
      setPhoneError(undefined);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('registerNewCustomer')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('customerName')}
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t('enterCustomerName')}
            disabled={isBusy}
            autoComplete="name"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          {nameError && <FormFeedback error={nameError} />}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {t('phoneNumber')}
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={t('enterPhoneNumber')}
            disabled={isBusy}
            autoComplete="tel"
            dir="ltr"
          />
          {phoneError && <FormFeedback error={phoneError} />}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t('dateOfBirth')}
          </label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            placeholder={t('optional')}
            disabled={isBusy}
            autoComplete="bday"
          />
          <p className="text-xs text-[var(--text-muted)]">{t('optional')}</p>
        </div>

        {errorMessage && <FormFeedback error={errorMessage} />}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isBusy}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isBusy || !name.trim() || !phone.trim()}
          >
            {isBusy ? t('registering') : t('registerCustomer')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RegistrationFormModal;
