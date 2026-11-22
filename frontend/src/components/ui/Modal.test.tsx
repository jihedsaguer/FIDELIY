import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../shared/i18n/i18n';
import { Modal } from './Modal';

function withI18n(node: React.ReactNode, locale: 'fr' | 'ar' = 'fr') {
  window.localStorage.setItem('fideliy-locale', locale);
  return <I18nProvider>{node}</I18nProvider>;
}

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Ouvrir</button>
      <Modal
        isOpen={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Titre"
      >
        <button type="button">Premier</button>
        <button type="button">Dernier</button>
      </Modal>
    </>
  );
}

afterEach(() => {
  document.body.style.overflow = '';
});

describe('Modal', () => {
  it('renders nothing while closed and a labelled dialog while open', () => {
    const { rerender } = render(withI18n(<Modal isOpen={false} onClose={() => undefined} title="Titre">x</Modal>));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(withI18n(<Modal isOpen onClose={() => undefined} title="Titre">x</Modal>));
    const dialog = screen.getByRole('dialog', { name: 'Titre' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('gives each open dialog a unique title id', () => {
    render(withI18n(
      <>
        <Modal isOpen onClose={() => undefined} title="Un">x</Modal>
        <Modal isOpen onClose={() => undefined} title="Deux">y</Modal>
      </>,
    ));
    const [first, second] = screen.getAllByRole('dialog');
    expect(first.getAttribute('aria-labelledby')).toBeTruthy();
    expect(first.getAttribute('aria-labelledby')).not.toBe(second.getAttribute('aria-labelledby'));
    expect(screen.getByRole('dialog', { name: 'Un' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Deux' })).toBeInTheDocument();
  });

  it('closes on Escape, overlay click and the localized close button', () => {
    const onClose = vi.fn();
    render(withI18n(<Modal isOpen onClose={onClose} title="Titre">x</Modal>));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('uses the Arabic close label', () => {
    render(withI18n(<Modal isOpen onClose={() => undefined} title="عنوان">x</Modal>, 'ar'));
    expect(screen.getByRole('button', { name: 'إغلاق' })).toBeInTheDocument();
  });

  it('does not close on Escape or overlay click when disabled', () => {
    const onClose = vi.fn();
    render(withI18n(
      <Modal isOpen onClose={onClose} title="Titre" closeOnEscape={false} closeOnOverlayClick={false}>x</Modal>,
    ));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(withI18n(<Modal isOpen onClose={() => undefined} title="Titre">x</Modal>));
    expect(document.body.style.overflow).toBe('hidden');
    rerender(withI18n(<Modal isOpen={false} onClose={() => undefined} title="Titre">x</Modal>));
    expect(document.body.style.overflow).toBe('');
  });

  it('moves focus into the dialog, traps Tab and restores focus to the opener', () => {
    render(withI18n(<Harness />));
    const opener = screen.getByRole('button', { name: 'Ouvrir' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    const close = screen.getByRole('button', { name: 'Fermer' });
    const last = screen.getByRole('button', { name: 'Dernier' });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('only lets the top-most dialog react to Escape', () => {
    const lower = vi.fn();
    const upper = vi.fn();
    render(withI18n(
      <>
        <Modal isOpen onClose={lower} title="Bas">x</Modal>
        <Modal isOpen onClose={upper} title="Haut">y</Modal>
      </>,
    ));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
  });
});
