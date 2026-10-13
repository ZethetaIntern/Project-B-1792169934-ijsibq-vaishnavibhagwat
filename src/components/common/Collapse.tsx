import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CollapseProps {
  open: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
}

const TRANSITION_MS = 300;

/**
 * Animates conditional sections open and closed (CSS grid-rows 0fr → 1fr, so no
 * height measurement). Children stay mounted until the close transition ends and
 * are `inert` meanwhile, so focus can never land inside a closing section.
 * Honours prefers-reduced-motion through the global motion rules.
 */
export function Collapse({
  open, children, id, className,
}: CollapseProps) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const [previousOpen, setPreviousOpen] = useState(open);

  // Mount synchronously when opening (state adjustment during render, no effect).
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setMounted(true);
  }

  useEffect(() => {
    if (open) {
      // Expand on the next frame so the browser animates from the collapsed state.
      const frame = requestAnimationFrame(() => setExpanded(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => {
      setMounted(false);
      setExpanded(false);
    }, TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div id={id} className="collapse-grid" data-open={open && expanded} inert={!open}>
      <div>
        {/* Breathing room so focus rings of children are not clipped by overflow:hidden. */}
        <div className={cn('-m-1 p-1', className)}>{children}</div>
      </div>
    </div>
  );
}
