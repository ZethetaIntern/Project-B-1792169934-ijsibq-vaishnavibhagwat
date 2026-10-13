import { forwardRef, type ChangeEvent } from 'react';
import { formatIndianNumber, parseIndianNumber, RUPEE } from '../../utils/format';
import { formatCurrencyInput, isDigit } from '../../utils/inputFormatting';
import { MaskedInput, type MaskedInputProps } from './MaskedInput';

export interface CurrencyInputProps
  extends Omit<MaskedInputProps, 'value' | 'defaultValue' | 'format' | 'isSignificant' | 'mask'> {
  /** Controlled value in rupees (`null` = empty). */
  value?: number | null;
  defaultValue?: number | null;
  /** Controlled API: receives the parsed rupee amount. */
  onValueChange?: (value: number | null) => void;
  /** Mask the amount after entry (income is PII under B4.4). */
  sensitive?: boolean;
  /** Maximum number of digits accepted (12 digits = up to ₹9,99,99,99,99,999). */
  maxDigits?: number;
}

/**
 * Rupee amount input with live Indian digit grouping (1,00,000 not 100,000).
 * Controlled: `value` (number) + `onValueChange`. Uncontrolled: spread `register()`;
 * the DOM value is the grouped string, which the Zod schemas parse back to a number.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>((
  {
    value,
    defaultValue,
    onValueChange,
    onChange,
    sensitive = false,
    maxDigits = 12,
    revealLabel = 'amount',
    ...props
  },
  ref,
) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onValueChange?.(parseIndianNumber(event.target.value));
  };

  const toText = (amount: number | null | undefined) => (
    amount === null || amount === undefined ? '' : formatIndianNumber(amount)
  );

  return (
    <MaskedInput
      {...props}
      ref={ref}
      inputMode="numeric"
      startAdornment={RUPEE}
      mask={sensitive}
      maskStyle="prefix"
      revealLabel={revealLabel}
      format={formatCurrencyInput(maxDigits)}
      isSignificant={isDigit}
      value={value === undefined ? undefined : toText(value)}
      defaultValue={defaultValue === undefined ? undefined : toText(defaultValue)}
      onChange={handleChange}
    />
  );
});

CurrencyInput.displayName = 'CurrencyInput';
