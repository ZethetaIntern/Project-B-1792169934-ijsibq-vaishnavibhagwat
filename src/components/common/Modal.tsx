import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `alertdialog` for confirmations that interrupt the user. */
  role?: 'dialog' | 'alertdialog';
  /** When false, Escape and the backdrop do not close the dialog. */
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

const SIZE_CLASSES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' } as const;

/**
 * Accessible modal dialog: rendered in a portal, marks the app root `inert`,
 * traps Tab focus, closes on Escape (when dismissible) and returns focus to the
 * element that opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  role = 'dialog',
  dismissible = true,
  initialFocusRef,
  size = 'md',
  icon,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef({ onClose, dismissible });

  useEffect(() => {
    closeRef.current = { onClose, dismissible };
  });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const appRoot = document.getElementById('root');
    const { overflow } = document.body.style;

    appRoot?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';

    const focusTarget = initialFocusRef?.current
      ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      ?? panelRef.current;
    focusTarget?.focus();

    // Escape closes; Tab and Shift+Tab cycle within the panel (focus trap).
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && closeRef.current.dismissible) {
        event.stopPropagation();
        closeRef.current.onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outside = !panelRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      appRoot?.removeAttribute('inert');
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100dvh-1.5rem)] w-full animate-toast-in flex-col overflow-hidden rounded-panel bg-surface shadow-raised outline-none',
          SIZE_CLASSES[size],
        )}
      >
        <div className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1.5 text-[15px] leading-6 text-slate">
                {description}
              </div>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-slate hover:bg-ink/5 hover:text-ink"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
        {children && <div className="overflow-y-auto px-5 pt-4 sm:px-6">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 px-5 pt-5 pb-5 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
