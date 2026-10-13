import { CircleCheck } from 'lucide-react';
import {
  forwardRef,
  useLayoutEffect,
  useId,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';
import { ErrorMessage } from './ErrorMessage';
import { describedBy, FieldContext, useFieldContext } from './FieldContext';
import {
  FIELD_CONTROL_CLASS,
  FIELD_HELP_CLASS,
  FIELD_LABEL_CLASS,
  OPTIONAL_TAG_CLASS,
} from './fieldStyles';

interface InputRootProps {
  /** Base id for the control; generated when omitted. */
  id?: string;
  error?: string;
  /** Shows the inline success indicator (field touched, valid and non-empty). */
  isValid?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

function InputRoot({
  id,
  error,
  isValid = false,
  optional = false,
  className,
  children,
}: InputRootProps) {
  const generatedId = useId();
  const fieldId = id ?? `field-${generatedId}`;
  const [hasHelp, setHasHelp] = useState(false);

  const context = useMemo(
    () => ({
      fieldId,
      labelId: `${fieldId}-label`,
      helpId: `${fieldId}-help`,
      errorId: `${fieldId}-error`,
      error,
      isValid: isValid && !error,
      optional,
      hasHelp,
      setHasHelp,
    }),
    [fieldId, error, isValid, optional, hasHelp],
  );

  return (
    <FieldContext.Provider value={context}>
      <div className={cn('group/field flex min-w-0 flex-col gap-1.5', className)}>{children}</div>
    </FieldContext.Provider>
  );
}

interface LabelProps {
  children: ReactNode;
  className?: string;
}

/** Visible label. Optional fields say so in text; required ones get an SR-only cue. */
function Label({ children, className }: LabelProps) {
  const { fieldId, labelId, optional } = useFieldContext('Input.Label');
  return (
    <label id={labelId} htmlFor={fieldId} className={cn(FIELD_LABEL_CLASS, className)}>
      <span>
        {children}
        {!optional && <span className="sr-only"> (required)</span>}
      </span>
      {optional && <span className={OPTIONAL_TAG_CLASS}>Optional</span>}
    </label>
  );
}

function HelpText({ children, className }: LabelProps) {
  const { helpId, setHasHelp } = useFieldContext('Input.HelpText');
  useLayoutEffect(() => {
    setHasHelp(true);
    return () => setHasHelp(false);
  }, [setHasHelp]);
  return (
    <p id={helpId} className={cn(FIELD_HELP_CLASS, className)}>
      {children}
    </p>
  );
}

function FieldError({ className }: { className?: string }) {
  const { errorId, error } = useFieldContext('Input.Error');
  return <ErrorMessage id={errorId} message={error} className={className} />;
}

export interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Content rendered inside the control on the left, e.g. a ₹ symbol. */
  startAdornment?: ReactNode;
  /** Content rendered inside the control on the right, e.g. a badge or button. */
  endAdornment?: ReactNode;
  /** Right padding reserved for the end adornment (Tailwind class). */
  endPaddingClass?: string;
  /** Classes for the wrapping element (positioning, width). */
  wrapperClassName?: string;
}

/**
 * The input element itself. Forwards its ref so it works uncontrolled with React Hook
 * Form's `register()`, and passes `value`/`onChange` through for controlled use.
 */
const Field = forwardRef<HTMLInputElement, InputFieldProps>((
  {
    startAdornment,
    endAdornment,
    endPaddingClass = 'pr-11',
    wrapperClassName,
    className,
    'aria-describedby': ariaDescribedBy,
    ...inputProps
  },
  ref,
) => {
  const context = useFieldContext('Input.Field');
  const {
    fieldId, error, isValid, optional,
  } = context;
  const showSuccess = isValid && !endAdornment;

  return (
    <div className={cn('relative flex items-center', wrapperClassName)}>
      {startAdornment && (
        <span className="pointer-events-none absolute left-3.5 flex items-center text-[15px] text-slate">
          {startAdornment}
        </span>
      )}
      <input
        {...inputProps}
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-required={optional ? undefined : true}
        aria-describedby={describedBy(context, ariaDescribedBy)}
        className={cn(
          FIELD_CONTROL_CLASS,
          Boolean(startAdornment) && 'pl-8',
          (Boolean(endAdornment) || showSuccess) && endPaddingClass,
          className,
        )}
      />
      {showSuccess && (
        <CircleCheck
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 size-5 animate-pop text-success-ink"
          strokeWidth={2}
        />
      )}
      {endAdornment && (
        <span className="absolute right-1.5 flex items-center gap-1">{endAdornment}</span>
      )}
    </div>
  );
});

/**
 * Compound text input:
 *
 * ```tsx
 * <Input error={errors.email?.message}>
 *   <Input.Label>Email</Input.Label>
 *   <Input.HelpText>We'll send your application updates here.</Input.HelpText>
 *   <Input.Field type="email" autoComplete="email" {...register('email')} />
 *   <Input.Error />
 * </Input>
 * ```
 */
export const Input = Object.assign(InputRoot, {
  Label,
  Field,
  Error: FieldError,
  HelpText,
});

export interface TextFieldProps extends InputFieldProps {
  label: ReactNode;
  error?: string;
  helpText?: ReactNode;
  optional?: boolean;
  isValid?: boolean;
  fieldClassName?: string;
}

/** Convenience composition of the compound parts for the common case. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>((
  {
    label, error, helpText, optional, isValid, id, fieldClassName, ...fieldProps
  },
  ref,
) => (
  <Input id={id} error={error} optional={optional} isValid={isValid} className={fieldClassName}>
    <Input.Label>{label}</Input.Label>
    {helpText && <Input.HelpText>{helpText}</Input.HelpText>}
    <Input.Field ref={ref} {...fieldProps} />
    <Input.Error />
  </Input>
));
