import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BusinessLogo } from './BusinessLogo';

describe('BusinessLogo', () => {
  it('draws the preset icon on a tile in the business primary colour', () => {
    render(<BusinessLogo logoUrl="preset:coffee" name="Café Lila" color="#0f766e" label="Logo de Café Lila" />);
    const tile = screen.getByRole('img', { name: 'Logo de Café Lila' });
    expect(tile).toHaveStyle({ backgroundColor: '#0f766e' });
    expect(tile.querySelector('svg')).not.toBeNull();
    expect(tile).not.toHaveTextContent('C');
  });

  it('draws the business initial for the initial preset', () => {
    render(<BusinessLogo logoUrl="preset:initial" name="épicerie Sami" label="Logo" />);
    const tile = screen.getByRole('img', { name: 'Logo' });
    expect(tile).toHaveTextContent('É');
    expect(tile.querySelector('svg')).toBeNull();
  });

  it('draws the initial when there is no logo or an unknown preset', () => {
    const { rerender } = render(<BusinessLogo logoUrl={null} name="Lila" label="Logo" />);
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveTextContent('L');
    rerender(<BusinessLogo logoUrl="preset:pharmacy" name="Lila" label="Logo" />);
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveTextContent('L');
    rerender(<BusinessLogo logoUrl="javascript:alert(1)" name="Lila" label="Logo" />);
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveTextContent('L');
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows an http(s) image and falls back to the initial when it fails to load', () => {
    render(<BusinessLogo logoUrl="https://example.com/logo.png" name="Lila" label="Logo de Lila" />);
    const image = screen.getByRole('img', { name: 'Logo de Lila' });
    expect(image.tagName).toBe('IMG');
    expect(image).toHaveAttribute('src', 'https://example.com/logo.png');
    fireEvent.error(image);
    const tile = screen.getByRole('img', { name: 'Logo de Lila' });
    expect(tile.tagName).not.toBe('IMG');
    expect(tile).toHaveTextContent('L');
  });

  it('is hidden from assistive technology without a label (name shown next to it)', () => {
    const { container } = render(<BusinessLogo logoUrl="preset:pizza" name="Pizza Roma" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses an empty alt for a decorative image', () => {
    const { container } = render(<BusinessLogo logoUrl="https://example.com/logo.png" name="Lila" />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('picks the glyph colour with the higher contrast on the tile colour', () => {
    const { rerender } = render(<BusinessLogo logoUrl="preset:cake" name="Lila" color="#fcd34d" label="Logo" />);
    // Light yellow tile: dark ink glyph (11.2:1) rather than white (1.5:1).
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveStyle({ color: '#17231f' });
    rerender(<BusinessLogo logoUrl="preset:cake" name="Lila" color="#1e3a8a" label="Logo" />);
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveStyle({ color: '#ffffff' });
  });

  it('falls back to the neutral brand tile when the colour is missing or invalid', () => {
    render(<BusinessLogo logoUrl="preset:shop" name="Lila" color="blue" label="Logo" />);
    const tile = screen.getByRole('img', { name: 'Logo' });
    expect(tile).toHaveStyle({ color: '#ffffff' });
    expect(tile.getAttribute('style')).toContain('var(--brand-800)');
  });

  it('keeps the translucent card style on the loyalty card', () => {
    render(<BusinessLogo logoUrl="preset:coffee" name="Lila" color="#0f766e" variant="translucent" label="Logo" />);
    const tile = screen.getByRole('img', { name: 'Logo' });
    expect(tile.className).toContain('bg-white/20');
    expect(tile.getAttribute('style') ?? '').not.toContain('background');
  });
});
