import type { FormEvent } from 'react';
import { digitsOnly, formatPreservingCaret, isDigit } from '../../utils/inputFormatting';

/** `onInput` handler for a whole-years field: digits only, at most two. */
export const formatYears = (event: FormEvent<HTMLInputElement>) => {
  formatPreservingCaret(event.currentTarget, digitsOnly(2), isDigit);
};

/** React Hook Form `setValueAs` for a whole-years field: an empty box is `null`, not 0. */
export const yearsValue = (value: string | number | null) => (value === '' || value === null ? null : Number(value));
