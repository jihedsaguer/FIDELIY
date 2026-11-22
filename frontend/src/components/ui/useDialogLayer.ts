import { useEffect, useRef, type RefObject } from 'react';

/**
 * Shared behaviour for modal layers (Modal, ConfirmDialog):
 * - body scroll lock (reference counted, so stacked dialogs restore correctly)
 * - initial focus inside the dialog and focus restore to the opener on close
 * - Tab / Shift+Tab focus trap
 * - Escape handling
 * Only the top-most open layer reacts to Tab and Escape.
 */

const layerStack: symbol[] = [];
let scrollLockCount = 0;
let previousBodyOverflow = '';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

interface DialogLayerOptions {
  isOpen: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function useDialogLayer({ isOpen, containerRef, onEscape, initialFocusRef }: DialogLayerOptions) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!isOpen) return;

    const layer = Symbol('dialog-layer');
    layerStack.push(layer);
    const isTopLayer = () => layerStack[layerStack.length - 1] === layer;

    if (scrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLockCount += 1;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    if (container) {
      const target = initialFocusRef?.current ?? getFocusable(container)[0] ?? container;
      target.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopLayer()) return;
      if (event.key === 'Escape') {
        if (onEscapeRef.current) {
          event.preventDefault();
          onEscapeRef.current();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const current = containerRef.current;
      if (!current) return;
      const focusable = getFocusable(current);
      if (focusable.length === 0) {
        event.preventDefault();
        current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = layerStack.indexOf(layer);
      if (index !== -1) layerStack.splice(index, 1);
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
      if (opener && opener.isConnected) {
        opener.focus();
      }
    };
    // containerRef / initialFocusRef are refs; re-run only when the open state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
