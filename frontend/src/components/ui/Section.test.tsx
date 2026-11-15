import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Section } from './Section';

describe('Section', () => {
  it('renders title', () => {
    render(<Section title="Test Section">Content</Section>);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Section title="Test">Child content</Section>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<Section title="Test" subtitle="Subtitle text">Content</Section>);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('uses h2 by default', () => {
    render(<Section title="Test">Content</Section>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test');
  });

  it('uses h1 when level prop is 1', () => {
    render(<Section title="Test" level={1}>Content</Section>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test');
  });
});
