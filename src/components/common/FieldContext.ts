import { createContext, useContext } from 'react';

/**
 * Shared wiring for a single form field: generated ids for label / help / error
 * association plus the field's validation state. Consumed by the compound `Input`
 * sub-components so that `aria-describedby`, `aria-invalid` and `htmlFor` are always
 * correct without callers having to thread ids by hand.
 */
export interface FieldContextValue {
  fieldId: string;
  labelId: string;
  helpId: string;
  errorId: string;
  error?: string;
  isValid: boolean;
  optional: boolean;
  hasHelp: boolean;
  setHasHelp: (hasHelp: boolean) => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(componentName: string): FieldContextValue {
  const context = useContext(FieldContext);
  if (!context) {
    throw new Error(`<${componentName}> must be rendered inside an <Input> field root.`);
  }
  return context;
}

/** Builds the `aria-describedby` value for a field from its context. */
export function describedBy(context: FieldContextValue, extra?: string): string | undefined {
  const ids = [
    context.hasHelp ? context.helpId : '',
    context.error ? context.errorId : '',
    extra ?? '',
  ].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

/** ARIA wiring every form control inside a field root needs. */
export function controlAriaProps(context: FieldContextValue, extraDescribedBy?: string) {
  return {
    id: context.fieldId,
    'aria-invalid': context.error ? true : undefined,
    'aria-required': context.optional ? undefined : true,
    'aria-describedby': describedBy(context, extraDescribedBy),
  } as const;
}
