import { Check } from 'lucide-react';
import {
  forwardRef, useId, type InputHTMLAttributes, type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';
import { ErrorMessage } from './ErrorMessage';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  /** `card` frames the checkbox — used for consents so each one stands on its own. */
  variant?: 'plain' | 'card';
  className?: string;
}

/**
 * Checkbox with a linked label. The native input stays in the accessibility tree and
 * keyboard order; its look is replaced (`appearance-none`) and the tick is drawn by a
 * sibling icon toggled with `peer-checked`. Never pre-ticked by default — consent
 * checkboxes must start unchecked (RBI Digital Lending Guidelines).
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((
  {
    id,
    label,
    description,
    error,
    variant = 'plain',
    className,
    'aria-describedby': ariaDescribedBy,
    ...inputProps
  },
  ref,
) => {
  const generatedId = useId();
  const inputId = id ?? `checkbox-${generatedId}`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const describedBy = [
    description ? descriptionId : '',
    error ? errorId : '',
    ariaDescribedBy ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className={cn(
          'group relative flex items-start gap-3',
          variant === 'card' && 'rounded-field border border-line bg-surface p-4 transition-colors has-[:checked]:border-cobalt/50 has-[:checked]:bg-cobalt-tint/40',
          variant === 'card' && error && 'border-danger-ink',
        )}
      >
        <span className="relative z-10 flex size-6 shrink-0 items-center justify-center">
          <input
            {...inputProps}
            ref={ref}
            id={inputId}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              'peer size-6 cursor-pointer appearance-none rounded-[6px] border border-line-strong bg-surface transition-colors',
              'checked:border-brand checked:bg-brand',
              'hover:border-ink-soft/70',
              'focus-visible:shadow-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt',
              'disabled:cursor-not-allowed disabled:bg-canvas-sunken',
              'aria-[invalid=true]:border-danger-ink',
            )}
          />
          <Check
            aria-hidden="true"
            strokeWidth={3}
            className="pointer-events-none absolute size-3.5 scale-90 text-white opacity-0 transition-[opacity,scale] duration-150 ease-out-quart peer-checked:scale-100 peer-checked:opacity-100"
          />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <label htmlFor={inputId} className="cursor-pointer text-[15px] leading-6 text-ink">
            {label}
            {/* Stretch the click target to the whole row (≥44px touch target). */}
            <span aria-hidden="true" className="absolute inset-0 -my-2 min-h-11" />
          </label>
          {description && (
            <span id={descriptionId} className="relative z-10 text-[13px] leading-5 text-slate">
              {description}
            </span>
          )}
        </span>
      </div>
      <ErrorMessage id={errorId} message={error} />
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
