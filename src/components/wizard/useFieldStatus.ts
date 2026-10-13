import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

export interface FieldStatus {
  error?: string;
  /** Touched (or submitted), non-empty and error-free → show the success tick. */
  isValid: boolean;
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Per-field error message and success state for the compound inputs.
 * Errors only exist after blur or submit (`mode: 'onTouched'`), so nothing turns
 * red while the user is still typing for the first time.
 *
 * Merely tabbing through (or being auto-focused into) an empty field is not a
 * mistake: until the user changes a field or presses Continue, its error stays hidden.
 */
export function useFieldStatus<T extends FieldValues>(form: UseFormReturn<T>) {
  const { formState, getFieldState, getValues } = form;
  // Reading these subscribes the component to error / touched updates (RHF proxy).
  const { isSubmitted } = formState;

  return (name: FieldPath<T>): FieldStatus => {
    const state = getFieldState(name, formState);
    const message = isSubmitted || state.isDirty ? state.error?.message : undefined;
    return {
      error: message,
      isValid: (state.isTouched || isSubmitted) && !state.error && isFilled(getValues(name)),
    };
  };
}
