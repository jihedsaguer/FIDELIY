import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../shared/i18n/i18n';
import { Listbox, type ListboxOption } from './Listbox';
import { Modal } from './Modal';

const OPTIONS: ListboxOption<string>[] = [
  { value: 'stamps', label: 'Timbres', description: 'Un timbre par achat' },
  { value: 'points', label: 'Points', description: 'Des points selon le montant' },
  { value: 'both', label: 'Combiné' },
];

function Harness({ initial = 'stamps', error }: { initial?: string; error?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Listbox id="type" label="Type" value={value} options={OPTIONS} onChange={setValue} error={error} />
      <p data-testid="value">{value}</p>
      <button type="button">Ailleurs</button>
    </>
  );
}

describe('Listbox', () => {
  it('exposes a labelled combobox showing the selected option, with the list closed', () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Type' });
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveTextContent('Timbres');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens on click, lists options with descriptions and marks the selected one', () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Type' });
    fireEvent.click(combobox);

    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(combobox).toHaveAttribute('aria-controls', listbox.id);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveTextContent('Des points selon le montant');
    expect(combobox).toHaveAttribute('aria-activedescendant', options[0].id);
  });

  it('selects an option with a click and closes', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(screen.getByRole('option', { name: /Combiné/ }));

    expect(screen.getByTestId('value')).toHaveTextContent('both');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveFocus();
  });

  it('is operable with the keyboard (arrows, Home, End, Enter, Space)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Type' });
    combobox.focus();

    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(combobox).toHaveAttribute('aria-activedescendant', options[1].id);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('points');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard(' ');
    await user.keyboard('{End}');
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[2].id);
    await user.keyboard('{Home}');
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
    await user.keyboard('{ArrowUp}');
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
    await user.keyboard(' ');
    expect(screen.getByTestId('value')).toHaveTextContent('stamps');
  });

  it('closes without selecting on Tab and on an outside click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Type' });
    combobox.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('value')).toHaveTextContent('stamps');

    fireEvent.click(combobox);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Ailleurs' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes only the list on Escape inside a modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <I18nProvider>
        <Modal isOpen onClose={onClose} title="Créer">
          <Harness />
        </Modal>
      </I18nProvider>,
    );
    const combobox = screen.getByRole('combobox', { name: 'Type' });
    combobox.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(combobox).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('links an error message to the combobox', () => {
    render(<Harness error="Choisissez un type" />);
    const combobox = screen.getByRole('combobox', { name: 'Type' });
    expect(combobox).toHaveAttribute('aria-invalid', 'true');
    expect(combobox).toHaveAccessibleDescription('Choisissez un type');
  });
});
