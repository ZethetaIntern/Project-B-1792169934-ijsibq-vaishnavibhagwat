import { useEffect, useRef, type ReactNode } from 'react';

/** Elements whose first visibility report has arrived. */
const reported = new WeakSet<Element>();
let observer: IntersectionObserver | null = null;

/**
 * One observer for every section. A section entirely off-screen at its first
 * report is hidden (no visible change); when it scrolls in, it is revealed and
 * no longer watched. The state is a plain `data-reveal` attribute, so React
 * never re-renders for it.
 */
function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      const element = target as HTMLElement;
      const first = !reported.has(element);
      reported.add(element);
      if (isIntersecting) {
        observer?.unobserve(element);
        if (!first) element.dataset.reveal = 'shown';
      } else if (first) {
        element.dataset.reveal = 'hidden';
      }
    });
  });
  return observer;
}

/**
 * Lets a landing-page section rise into view the first time it is scrolled to.
 * Everything renders visible and nothing is measured before paint, so the hero
 * is never held back; with reduced motion or without IntersectionObserver the
 * page simply stays as it is. Styles: `[data-reveal]` in index.css.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const sections = getObserver();
    sections.observe(element);
    return () => {
      sections.unobserve(element);
      reported.delete(element);
    };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}
