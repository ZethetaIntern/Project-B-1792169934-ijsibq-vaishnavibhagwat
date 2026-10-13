import {
  useEffect, useRef, useState, type ReactNode,
} from 'react';
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
  // `closing` keeps content mounted while the close animation plays. Mounting is
  // derived from `open`, so a late timer can never hide an open section.
  const [closing, setClosing] = useState(false);
  const [expanded, setExpanded] = useState(open);
  const wasOpen = useRef(open);

  useEffect(() => {
    const justClosed = wasOpen.current && !open;
    wasOpen.current = open;
    if (open) {
      // Expand on the next frame so the browser animates from the collapsed state.
      const frame = requestAnimationFrame(() => {
        setClosing(false);
        setExpanded(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!justClosed) return undefined;
    const frame = requestAnimationFrame(() => {
      setClosing(true);
      setExpanded(false);
    });
    const timer = window.setTimeout(() => setClosing(false), TRANSITION_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open]);

  if (!open && !expanded && !closing) return null;

  return (
    <div id={id} className="collapse-grid" data-open={open && expanded} inert={!open}>
      <div>
        {/* Breathing room so focus rings of children are not clipped by overflow:hidden. */}
        <div className={cn('-m-1 p-1', className)}>{children}</div>
      </div>
    </div>
  );
}
