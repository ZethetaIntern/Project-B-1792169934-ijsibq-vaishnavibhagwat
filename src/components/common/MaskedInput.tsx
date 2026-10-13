import { Eye, EyeOff } from 'lucide-react';
import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';
import { maskSensitive } from '../../utils/format';
import {
  formatPreservingCaret,
  isAlphanumeric,
  mergeRefs,
  type InputFormatter,
  type SignificantCharTest,
} from '../../utils/inputFormatting';
import { Input, type TextFieldProps } from './Input';

export interface MaskedInputProps extends TextFieldProps {
  /** Formats raw keystrokes (uppercase, grouping, length cap). */
  format?: InputFormatter;
  /** Which characters count when restoring the caret after formatting. */
  isSignificant?: SignificantCharTest;
  /** Mask the value once the field loses focus. Defaults to true. */
  mask?: boolean;
  /** Characters left visible at the end of a masked value. */
  visibleChars?: number;
  /** Used in the reveal button's accessible name, e.g. "PAN" → "Show PAN". */
  revealLabel?: string;
  /** Extra controls (e.g. a verification badge) rendered beside the reveal toggle. */
  trailing?: ReactNode;
}

/**
 * Text input for sensitive identifiers (PAN, Aadhaar, income). While focused the
 * user sees and edits the real value; once they leave the field only the last four
 * characters are shown, drawn by an aria-hidden overlay so the input's real value —
 * and therefore React Hook Form's `register()` — is never touched. A toggle lets
 * the user check what they typed (B4.4: mask PII in the UI after entry).
 */
export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>((
  {
    label,
    error,
    helpText,
    optional,
    isValid,
    id,
    fieldClassName,
    format,
    isSignificant = isAlphanumeric,
    mask = true,
    visibleChars = 4,
    revealLabel = 'value',
    trailing,
    startAdornment,
    onChange,
    onFocus,
    onBlur,
    value,
    className,
    ...inputProps
  },
  ref,
) => {
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = useMemo(() => mergeRefs(ref, localRef), [ref]);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [uncontrolledText, setUncontrolledText] = useState('');
  const text = value === undefined || value === null ? uncontrolledText : String(value);

  // Uncontrolled usage: pick up values written straight to the DOM (register + defaultValues).
  useLayoutEffect(() => {
    if (value === undefined && localRef.current) setUncontrolledText(localRef.current.value);
  }, [value]);

  const masked = mask && !focused && !revealed && text.length > 0;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (format) formatPreservingCaret(event.target, format, isSignificant);
    setUncontrolledText(event.target.value);
    onChange?.(event);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    setUncontrolledText(event.target.value);
    onBlur?.(event);
  };

  const revealButton = mask && text.length > 0 && (
    <button
      type="button"
      aria-pressed={revealed}
      aria-label={`${revealed ? 'Hide' : 'Show'} ${revealLabel}`}
      onClick={() => setRevealed((current) => !current)}
      className="flex size-11 items-center justify-center rounded-lg text-slate hover:text-ink"
    >
      {revealed ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
    </button>
  );

  const endAdornment = trailing || revealButton ? (
    <>
      {trailing}
      {revealButton}
    </>
  ) : undefined;

  return (
    <Input id={id} error={error} optional={optional} isValid={isValid} className={fieldClassName}>
      <Input.Label>{label}</Input.Label>
      {helpText && <Input.HelpText>{helpText}</Input.HelpText>}
      <Input.Field
        {...inputProps}
        ref={inputRef}
        value={value}
        startAdornment={startAdornment}
        endAdornment={endAdornment}
        endPaddingClass={trailing ? 'pr-36' : 'pr-12'}
        autoComplete={inputProps.autoComplete ?? 'off'}
        spellCheck={false}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          'tracking-wide',
          masked && 'text-transparent caret-transparent selection:bg-transparent',
          className,
        )}
        overlay={masked ? (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 flex items-center px-3.5 text-[15px] tracking-wide text-ink tabular',
              Boolean(startAdornment) && 'pl-8',
            )}
          >
            {maskSensitive(text, visibleChars)}
          </span>
        ) : null}
      />
      <Input.Error />
    </Input>
  );
});

MaskedInput.displayName = 'MaskedInput';
