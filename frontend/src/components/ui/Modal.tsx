import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useI18n } from '../../shared/i18n/i18n';
import { useDialogLayer } from './useDialogLayer';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  /** Element to focus when the dialog opens; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Dialog role; `alertdialog` for confirmations. */
  role?: 'dialog' | 'alertdialog';
  /** id of the element describing the dialog. */
  describedBy?: string;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-4xl',
};

/**
 * Modal dialog. Below the `sm` breakpoint it behaves as a bottom sheet that can
 * grow to the full dynamic viewport height; the body scrolls internally.
 * Stacks above the mobile bottom navigation via `--z-modal`.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocusRef,
  role = 'dialog',
  describedBy,
}: ModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useDialogLayer({
    isOpen,
    containerRef: panelRef,
    onEscape: closeOnEscape ? onClose : undefined,
    initialFocusRef,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center sm:p-4">
      {/* Overlay */}
      <div
        data-testid="modal-overlay"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative flex w-full max-h-[100dvh] flex-col overflow-hidden ${sizeClasses[size]} bg-[var(--surface)] border border-[var(--border)] rounded-t-[var(--radius-2xl)] sm:rounded-[var(--radius-2xl)] sm:max-h-[calc(100dvh-2rem)] shadow-xl focus:outline-none`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex shrink-0 items-start justify-between gap-3 p-4 pb-0 sm:p-6 sm:pb-0">
            {title && (
              <h2
                id={titleId}
                className="text-xl font-bold text-[var(--text)] text-start"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ms-auto min-h-[44px] min-w-[44px] p-0"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
