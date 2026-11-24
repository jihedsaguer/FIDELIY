import { useEffect, type RefObject } from 'react';

/**
 * Reveal-on-scroll for `[data-reveal]` elements inside `rootRef`. Content is
 * fully visible by default: elements are only "armed" (hidden by CSS) when an
 * IntersectionObserver exists and the user has not asked for reduced motion,
 * and each one is revealed the first time it enters the viewport.
 */
export function useRevealOnScroll(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    for (const target of targets) {
      target.classList.add('is-reveal-armed');
      observer.observe(target);
    }
    return () => {
      observer.disconnect();
      for (const target of targets) target.classList.remove('is-reveal-armed', 'is-revealed');
    };
  }, [rootRef]);
}
