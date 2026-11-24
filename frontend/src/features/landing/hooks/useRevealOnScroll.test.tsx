import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRevealOnScroll } from './useRevealOnScroll';

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  useRevealOnScroll(ref);
  return (
    <div ref={ref}>
      <p data-reveal>Section</p>
    </div>
  );
}

type Callback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRevealOnScroll', () => {
  it('leaves content untouched (visible) without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Probe />);
    expect(screen.getByText('Section')).not.toHaveClass('is-reveal-armed');
  });

  it('arms elements and reveals each one when it enters the viewport', () => {
    let callback: Callback = () => undefined;
    const unobserve = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: Callback) {
          callback = cb;
        }
        observe() {}
        unobserve = unobserve;
        disconnect() {}
      },
    );
    render(<Probe />);
    const section = screen.getByText('Section');
    expect(section).toHaveClass('is-reveal-armed');
    expect(section).not.toHaveClass('is-revealed');
    act(() => callback([{ isIntersecting: true, target: section }]));
    expect(section).toHaveClass('is-revealed');
    expect(unobserve).toHaveBeenCalledWith(section);
  });

  it('does not arm anything when reduced motion is requested', () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }));
    render(<Probe />);
    expect(screen.getByText('Section')).not.toHaveClass('is-reveal-armed');
  });
});
