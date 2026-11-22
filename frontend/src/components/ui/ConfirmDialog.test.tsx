import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../shared/i18n/i18n';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}, locale: 'fr' | 'ar' = 'fr') {
  window.localStorage.setItem('fideliy-locale', locale);
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <I18nProvider>
      <ConfirmDialog
        isOpen
        title="Générer un nouveau code ?"
        message="L'ancien code cessera de fonctionner."
        confirmLabel="Générer"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    </I18nProvider>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('renders optional children inside the dialog', () => {
    renderDialog({ children: <label>Motif<input /></label> });
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByLabelText('Motif')).toBeInTheDocument();
  });

  it('is an alert dialog named by its title and described by its message', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog', { name: 'Générer un nouveau code ?' });
    expect(dialog).toHaveAccessibleDescription("L'ancien code cessera de fonctionner.");
  });

  it('calls onConfirm or onCancel from its buttons, with a localized default cancel label', () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Générer' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses the Arabic default cancel label', () => {
    renderDialog({ title: 'تأكيد', message: 'رسالة', confirmLabel: 'متابعة' }, 'ar');
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
  });

  it('focuses the cancel action first for destructive confirmations', () => {
    renderDialog({ variant: 'destructive' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Annuler' }));
  });

  it('blocks confirm, cancel and Escape while the action is pending', () => {
    const { onConfirm, onCancel } = renderDialog({ isPending: true });
    const confirm = screen.getByRole('button', { name: /Générer/ });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    fireEvent.click(confirm);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows an error message inside the dialog', () => {
    renderDialog({ errorMessage: 'Échec, réessayez.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Échec, réessayez.');
  });
});
