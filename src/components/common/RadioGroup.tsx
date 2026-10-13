import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';
import { ErrorMessage } from './ErrorMessage';
import { FIELD_HELP_CLASS, OPTIONAL_TAG_CLASS } from './fieldStyles';

const PILL_GRID = 'grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))]';
const CARD_GRID = 'grid-cols-1 sm:grid-cols-3';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue'> {
  name: string;
  legend: ReactNode;
  options: readonly RadioOption[];
  error?: string;
  helpText?: ReactNode;
  optional?: boolean;
  /** Layout of the options. */
  orientation?: 'horizontal' | 'vertical';
  /** `pill` for short choices, `card` for rich choices with icon and description. */
  variant?: 'pill' | 'card';
  /** Controlled value. Omit to use the group uncontrolled (e.g. with `register()`). */
  value?: string;
  defaultValue?: string;
  className?: string;
}

/**
 * Native radio inputs in a `<fieldset>`: arrow keys move between options and the
 * legend names the group for screen readers. The real input is visually hidden and
 * the styled surface reacts to it through Tailwind `peer-*` modifiers.
 * The forwarded ref is attached to every radio so `register()` tracks the group.
 */
export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>((
  {
    name,
    legend,
    options,
    error,
    helpText,
    optional = false,
    orientation = 'horizontal',
    variant = 'pill',
    value,
    defaultValue,
    className,
    ...inputProps
  },
  ref,
) => {
  const baseId = useId();
  const helpId = `${baseId}-help`;
  const errorId = `${baseId}-error`;
  const isControlled = value !== undefined;
  const hasDefault = defaultValue !== undefined;
  const describedBy = [helpText ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <fieldset
      aria-describedby={describedBy || undefined}
      className={cn('flex min-w-0 flex-col gap-2', className)}
    >
      <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-sm font-medium text-ink">
        <span>
          {legend}
          {!optional && <span className="sr-only"> (required)</span>}
        </span>
        {optional && <span className={OPTIONAL_TAG_CLASS}>Optional</span>}
      </legend>
      {helpText && (
        <p id={helpId} className={cn(FIELD_HELP_CLASS, '-mt-1 mb-1')}>
          {helpText}
        </p>
      )}
      <div
        className={cn(
          'grid gap-2.5',
          orientation === 'vertical' && 'grid-cols-1',
          orientation === 'horizontal' && variant === 'pill' && PILL_GRID,
          orientation === 'horizontal' && variant === 'card' && CARD_GRID,
        )}
      >
        {options.map((option) => {
          const optionId = `${baseId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'group relative flex cursor-pointer',
                option.disabled && 'cursor-not-allowed',
              )}
            >
              <input
                {...inputProps}
                ref={ref}
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                disabled={option.disabled || inputProps.disabled}
                checked={isControlled ? value === option.value : undefined}
                defaultChecked={hasDefault ? defaultValue === option.value : undefined}
                required={!optional}
                aria-describedby={describedBy || undefined}
                data-invalid={error ? true : undefined}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex w-full rounded-field border border-line-strong bg-surface text-ink transition-[border-color,background-color,box-shadow] duration-150',
                  'group-hover:border-ink-soft/60',
                  'peer-checked:border-cobalt peer-checked:bg-cobalt-tint peer-checked:shadow-[inset_0_0_0_1px_var(--color-cobalt)]',
                  'peer-focus-visible:shadow-focus peer-focus-visible:border-cobalt',
                  'peer-disabled:border-line peer-disabled:bg-canvas-sunken peer-disabled:text-muted',
                  'peer-data-invalid:border-danger-ink',
                  variant === 'pill' && 'min-h-11 items-center justify-center px-4 text-[15px] font-medium',
                  variant === 'card' && 'flex-col items-start gap-1.5 p-4 text-left',
                )}
              >
                {option.icon && (
                  <span className="mb-1 flex size-9 items-center justify-center rounded-lg bg-canvas text-brand">
                    {option.icon}
                  </span>
                )}
                <span className={cn(variant === 'card' && 'text-[15px] font-semibold')}>
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-[13px] leading-5 text-slate">{option.description}</span>
                )}
                {option.meta && (
                  <span className="mt-auto pt-1 text-xs font-medium text-muted tabular">
                    {option.meta}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <ErrorMessage id={errorId} message={error} />
    </fieldset>
  );
});

RadioGroup.displayName = 'RadioGroup';
