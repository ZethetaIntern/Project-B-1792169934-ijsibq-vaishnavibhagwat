import type { ForwardedRef, MutableRefObject, RefCallback } from 'react';
import { formatIndianDigits } from './format';

export type InputFormatter = (raw: string) => string;
export type SignificantCharTest = (char: string) => boolean;

export const isDigit: SignificantCharTest = (char) => /\d/.test(char);
export const isAlphanumeric: SignificantCharTest = (char) => /[A-Za-z0-9]/.test(char);

/** PAN: uppercase A–Z/0–9 only, max 10 characters. */
export const formatPanInput: InputFormatter = (raw) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

/** Aadhaar: digits only, grouped 4-4-4 ("2345 6789 0123"). */
export const formatAadhaarInput: InputFormatter = (raw) => raw
  .replace(/\D/g, '')
  .slice(0, 12)
  .replace(/(\d{4})(?=\d)/g, '$1 ');

/** Digits only, capped at `maxLength`. */
export const digitsOnly = (maxLength: number): InputFormatter => (raw) => raw.replace(/\D/g, '').slice(0, maxLength);

/** Indian grouped currency digits ("1050000" → "10,50,000"). */
export const formatCurrencyInput = (maxDigits: number): InputFormatter => (raw) => formatIndianDigits(raw.replace(/\D/g, '').slice(0, maxDigits));

/** Uppercase alphanumerics, capped (Voter ID, passport, GSTIN, referral codes). */
export const upperAlphanumeric = (maxLength: number): InputFormatter => (raw) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, maxLength);

/**
 * Re-formats an input's value in place and keeps the caret next to the same
 * significant character, so typing "1050000" never throws the cursor to the end
 * while separators are being inserted.
 */
export function formatPreservingCaret(
  input: HTMLInputElement,
  format: InputFormatter,
  isSignificant: SignificantCharTest,
): string {
  const raw = input.value;
  const caret = input.selectionStart ?? raw.length;
  const significantBeforeCaret = raw.slice(0, caret).split('').filter(isSignificant).length;
  const formatted = format(raw);

  if (formatted === raw) return formatted;

  // eslint-disable-next-line no-param-reassign -- intentional DOM write before React sees the event
  input.value = formatted;

  let seen = 0;
  let nextCaret = formatted.length;
  if (significantBeforeCaret === 0) {
    nextCaret = 0;
  } else {
    for (let index = 0; index < formatted.length; index += 1) {
      if (isSignificant(formatted[index])) seen += 1;
      if (seen === significantBeforeCaret) {
        nextCaret = index + 1;
        break;
      }
    }
  }

  if (document.activeElement === input) {
    input.setSelectionRange(nextCaret, nextCaret);
  }
  return formatted;
}

/** Combines a forwarded ref with a local one. */
export function mergeRefs<T>(
  ...refs: (ForwardedRef<T> | MutableRefObject<T | null> | undefined)[]
): RefCallback<T> {
  return (instance) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(instance);
      // eslint-disable-next-line no-param-reassign -- assigning to a ref object is the point
      else if (ref) ref.current = instance;
    });
  };
}
