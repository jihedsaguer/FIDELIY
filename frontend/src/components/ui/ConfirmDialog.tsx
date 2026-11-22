import { useId, useRef, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormFeedback } from './FormFeedback';
import { useI18n } from '../../shared/i18n/i18n';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Defaults to the localized "Cancel" label. */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** `destructive` styles the confirm action as dangerous and focuses Cancel first. */
  variant?: 'default' | 'destructive';
  /** While pending, both actions are disabled and the dialog cannot be dismissed. */
  isPending?: boolean;
  errorMessage?: string;
  /** Optional extra content (e.g. a reason field) rendered between the message and the error. */
  children?: ReactNode;
}

/**
 * Confirmation dialog: the project's pattern for destructive or irreversible actions.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'default',
  isPending = false,
  errorMessage,
  children,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dismiss = isPending ? () => undefined : onCancel;

  return (
    <Modal
      isOpen={isOpen}
      onClose={dismiss}
      title={title}
      size="sm"
      role="alertdialog"
      describedBy={messageId}
      showCloseButton={false}
      closeOnEscape={!isPending}
      closeOnOverlayClick={!isPending}
      initialFocusRef={variant === 'destructive' ? cancelRef : undefined}
    >
      <div className="space-y-4">
        <p id={messageId} className="text-sm text-[var(--text-muted)] text-start">
          {message}
        </p>
        {children}
        <FormFeedback error={errorMessage} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel ?? t('cancel')}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            className="w-full sm:w-auto"
            onClick={onConfirm}
            isLoading={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
