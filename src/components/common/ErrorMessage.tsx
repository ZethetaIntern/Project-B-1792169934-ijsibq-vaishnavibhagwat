import { CircleAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ErrorMessageProps {
  id?: string;
  message?: string;
  className?: string;
}

/**
 * Inline validation message.
 *
 * The live region is always mounted (even when empty) so assistive technology
 * reliably announces the message the moment it appears. Errors are conveyed with
 * text and an icon, never colour alone (WCAG 1.4.1, 3.3.1).
 */
export function ErrorMessage({ id, message, className }: ErrorMessageProps) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'flex items-start gap-1.5 text-sm leading-5 text-danger-ink',
        !message && 'sr-only',
        className,
      )}
    >
      {message ? (
        <>
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
          <span>{message}</span>
        </>
      ) : null}
    </p>
  );
}
