import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, type Locale } from '../../../shared/i18n/i18n';
import { LogoPresetPicker } from './LogoPresetPicker';
import { ThemeSwatchPicker } from './ThemeSwatchPicker';

function renderPicker(value: string, onChange = vi.fn(), locale: Locale = 'fr') {
  window.localStorage.setItem('fideliy-locale', locale);
  render(
    <I18nProvider>
      <LogoPresetPicker value={value} onChange={onChange} businessName="Café Lila" color="#0f766e" />
    </I18nProvider>,
  );
  return onChange;
}

function ControlledPicker({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <LogoPresetPicker value={value} onChange={setValue} businessName="Café Lila" />
      <output data-testid="value">{value}</output>
    </>
  );
}

afterEach(() => window.localStorage.clear());

describe('LogoPresetPicker', () => {
  it('is a radio group named by its legend with 13 named options', () => {
    renderPicker('preset:initial');
    const group = screen.getByRole('group', { name: 'Logo de votre commerce' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(13);
    expect(within(group).getByRole('radio', { name: 'Café' })).not.toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Initiale' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Logo actuel' })).toBeNull();
  });

  it('reports the preset value when an option is chosen', async () => {
    const onChange = renderPicker('preset:initial');
    await userEvent.click(screen.getByRole('radio', { name: 'Boulangerie' }));
    expect(onChange).toHaveBeenCalledWith('preset:bakery');
  });

  it('keeps an existing image logo as an extra "Logo actuel" option', async () => {
    window.localStorage.setItem('fideliy-locale', 'fr');
    render(
      <I18nProvider>
        <ControlledPicker initial="https://example.com/logo.png" />
      </I18nProvider>,
    );
    const current = screen.getByRole('radio', { name: 'Logo actuel' });
    expect(current).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Pizzeria' }));
    expect(screen.getByTestId('value')).toHaveTextContent('preset:pizza');
    // The previous image stays available to switch back.
    await userEvent.click(screen.getByRole('radio', { name: 'Logo actuel' }));
    expect(screen.getByTestId('value')).toHaveTextContent('https://example.com/logo.png');
  });

  it('moves the selection with the arrow keys', async () => {
    window.localStorage.setItem('fideliy-locale', 'fr');
    render(
      <I18nProvider>
        <ControlledPicker initial="preset:coffee" />
      </I18nProvider>,
    );
    const coffee = screen.getByRole('radio', { name: 'Café' });
    coffee.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Boulangerie' })).toBeChecked();
    expect(screen.getByTestId('value')).toHaveTextContent('preset:bakery');
  });

  it('renders the Darija labels in Arabic', () => {
    renderPicker('preset:barber', vi.fn(), 'ar');
    expect(screen.getByRole('group', { name: 'لوغو المحل متاعك' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'حجّام' })).toBeChecked();
  });
});

describe('ThemeSwatchPicker', () => {
  it('fills both brand colours from a theme', async () => {
    window.localStorage.setItem('fideliy-locale', 'fr');
    const onSelect = vi.fn();
    render(
      <I18nProvider>
        <ThemeSwatchPicker primaryColor="#2F7450" accentColor="#F0B35A" onSelect={onSelect} />
      </I18nProvider>,
    );
    const group = screen.getByRole('group', { name: 'Thèmes de couleurs' });
    const swatches = within(group).getAllByRole('radio');
    expect(swatches).toHaveLength(6);
    // The current colours match the "Vert" theme (case-insensitive).
    expect(within(group).getByRole('radio', { name: 'Vert' })).toBeChecked();
    await userEvent.click(within(group).getByRole('radio', { name: 'Bleu nuit' }));
    expect(onSelect).toHaveBeenCalledWith({ primaryColor: '#1e3a8a', accentColor: '#f59e0b' });
  });

  it('selects no theme for custom colours', () => {
    window.localStorage.setItem('fideliy-locale', 'ar');
    render(
      <I18nProvider>
        <ThemeSwatchPicker primaryColor="#123456" accentColor="#abcdef" onSelect={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByRole('group', { name: 'ألوان جاهزة' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
  });
});
