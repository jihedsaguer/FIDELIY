import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../../shared/i18n/i18n';
import { RoiEstimator } from './RoiEstimator';

function renderEstimator(locale: 'fr' | 'ar' = 'fr') {
  window.localStorage.setItem('fideliy-locale', locale);
  return render(
    <I18nProvider>
      <RoiEstimator />
    </I18nProvider>,
  );
}

const monthly = () => screen.getByTestId('roi-monthly');
const annual = () => screen.getByTestId('roi-annual');

afterEach(() => {
  window.localStorage.clear();
});

describe('RoiEstimator', () => {
  it('starts from the example values and shows the monthly and annual estimate', () => {
    renderEstimator();
    expect(screen.getByRole('textbox', { name: 'Clients par jour' })).toHaveValue('40');
    expect(screen.getByRole('textbox', { name: 'Panier moyen (TND)' })).toHaveValue('15');
    expect(screen.getByRole('textbox', { name: "Jours d'ouverture par mois" })).toHaveValue('26');
    expect(screen.getByRole('textbox', { name: /Hausse de fréquentation/ })).toHaveValue('5');
    // 40 x 15 x 26 x 5 % = 780 TND per month, 9 360 TND per year
    expect(monthly()).toHaveTextContent('780 DT');
    expect(annual()).toHaveTextContent('9 360 DT');
  });

  it('labels each slider and gives it a value text with its unit', () => {
    renderEstimator();
    expect(screen.getByRole('slider', { name: 'Clients par jour' })).toHaveAttribute('aria-valuetext', '40 clients par jour');
    expect(screen.getByRole('slider', { name: 'Panier moyen (TND)' })).toHaveAttribute('aria-valuetext', '15 TND');
    expect(screen.getByRole('slider', { name: "Jours d'ouverture par mois" })).toHaveAttribute('aria-valuetext', '26 jours par mois');
    expect(screen.getByRole('slider', { name: /Hausse de fréquentation/ })).toHaveAttribute('aria-valuetext', '5 %');
  });

  it('updates the output when a number is typed or a slider moves', () => {
    renderEstimator();
    fireEvent.change(screen.getByRole('textbox', { name: 'Clients par jour' }), { target: { value: '80' } });
    // 80 x 15 x 26 x 5 % = 1 560
    expect(monthly()).toHaveTextContent('1 560 DT');
    expect(screen.getByRole('slider', { name: 'Clients par jour' })).toHaveValue('80');

    fireEvent.change(screen.getByRole('slider', { name: 'Panier moyen (TND)' }), { target: { value: '7.5' } });
    // 80 x 7.5 x 26 x 5 % = 780
    expect(screen.getByRole('textbox', { name: 'Panier moyen (TND)' })).toHaveValue('7,5');
    expect(monthly()).toHaveTextContent('780 DT');
    expect(annual()).toHaveTextContent('9 360 DT');
  });

  it('accepts a comma in the basket and clamps out-of-range values on blur', () => {
    renderEstimator();
    const basket = screen.getByRole('textbox', { name: 'Panier moyen (TND)' });
    fireEvent.change(basket, { target: { value: '15,5' } });
    // 40 x 15.5 x 26 x 5 % = 806
    expect(monthly()).toHaveTextContent('806 DT');

    const days = screen.getByRole('textbox', { name: "Jours d'ouverture par mois" });
    fireEvent.change(days, { target: { value: '45' } });
    fireEvent.blur(days);
    expect(days).toHaveValue('31');
  });

  it('shows an inline error and a dash when a value is invalid', () => {
    renderEstimator();
    const basket = screen.getByRole('textbox', { name: 'Panier moyen (TND)' });
    fireEvent.change(basket, { target: { value: 'abc' } });
    expect(basket).toHaveAttribute('aria-invalid', 'true');
    expect(basket).toHaveAccessibleDescription(/Entrez un montant entre 0,5 et 500 TND/);
    expect(monthly()).toHaveTextContent('—');
    expect(annual()).toHaveTextContent('—');

    fireEvent.change(basket, { target: { value: '' } });
    expect(monthly()).toHaveTextContent('—');

    fireEvent.change(basket, { target: { value: '20' } });
    expect(basket).not.toHaveAttribute('aria-invalid', 'true');
    // 40 x 20 x 26 x 5 % = 1 040
    expect(monthly()).toHaveTextContent('1 040 DT');
  });

  it('shows the formula and the disclaimer, and no price, cost or return line', () => {
    const { container } = renderEstimator();
    expect(screen.getByText(/clients par jour × panier moyen × jours d'ouverture × hausse de fréquentation/)).toBeInTheDocument();
    expect(screen.getByText('Estimation indicative calculée uniquement à partir de vos valeurs ; ni une promesse ni une moyenne observée.')).toBeInTheDocument();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/prix|tarif|coût|cout\b|\broi\b|rentab|bénéfice|benefice|\bnet\b|gratuit|abonnement/i);
  });

  it('does not announce every change through a live region', () => {
    renderEstimator();
    expect(monthly().tagName).toBe('OUTPUT');
    expect(monthly()).toHaveAttribute('aria-live', 'off');
    expect(annual()).toHaveAttribute('aria-live', 'off');
  });

  it('renders in Tunisian Darija', () => {
    renderEstimator('ar');
    expect(screen.getByRole('textbox', { name: 'كليان في النهار' })).toHaveValue('40');
    expect(screen.getByRole('slider', { name: 'كليان في النهار' })).toHaveAttribute('aria-valuetext', '40 كليان في النهار');
    expect(monthly()).toHaveTextContent('780');
    expect(monthly()).toHaveTextContent('د.ت.');
    expect(screen.getByText(/تقدير برك/)).toBeInTheDocument();
  });
});
