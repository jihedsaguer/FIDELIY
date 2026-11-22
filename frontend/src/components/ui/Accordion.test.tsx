import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Accordion, AccordionItem } from './Accordion';

describe('Accordion', () => {
  it('is closed by default and toggles its region from the header button', () => {
    render(
      <Accordion>
        <AccordionItem title="Programme actuel">Contenu actuel</AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByRole('button', { name: 'Programme actuel' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const regionId = trigger.getAttribute('aria-controls');
    expect(regionId).toBeTruthy();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByRole('region', { name: 'Programme actuel' });
    expect(region).toHaveAttribute('id', regionId);
    expect(region).toHaveTextContent('Contenu actuel');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('can start open', () => {
    render(<AccordionItem title="Historique" defaultOpen>Anciennes versions</AccordionItem>);
    expect(screen.getByRole('button', { name: 'Historique' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Historique' })).toHaveTextContent('Anciennes versions');
  });

  it('is keyboard operable with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<AccordionItem title="Détails">Texte</AccordionItem>);
    const trigger = screen.getByRole('button', { name: 'Détails' });

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps items independent inside a group', () => {
    render(
      <Accordion>
        <AccordionItem title="Un">A</AccordionItem>
        <AccordionItem title="Deux">B</AccordionItem>
      </Accordion>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Un' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deux' }));
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });
});
