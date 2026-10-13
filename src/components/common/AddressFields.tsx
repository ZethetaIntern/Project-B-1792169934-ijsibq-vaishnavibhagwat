import { useEffect, useRef, type FormEvent } from 'react';
import {
  useFormContext, useWatch, type FieldValues,
} from 'react-hook-form';
import { STATES_AND_UNION_TERRITORIES } from '../../constants/states';
import { usePinCodeLookup } from '../../hooks/usePinCodeLookup';
import { digitsOnly, formatPreservingCaret, isDigit } from '../../utils/inputFormatting';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { TextField } from './Input';
import { Select } from './Select';
import { Spinner } from './Spinner';

const STATE_OPTIONS = STATES_AND_UNION_TERRITORIES.map((state) => ({ value: state, label: state }));

const formatPin = (event: FormEvent<HTMLInputElement>) => {
  formatPreservingCaret(event.currentTarget, digitsOnly(6), isDigit);
};

interface AddressFieldsProps {
  /** Path of the address object inside the form, e.g. "current" or "officeAddress". */
  prefix: string;
  /** HTML autocomplete section so browsers keep different addresses apart. */
  autoCompleteSection: string;
}

/**
 * Reusable postal address block (line 1, line 2, PIN, city, state). Entering a known
 * PIN fills city, state and post office from the sample India Post directory; the
 * fields stay editable. Reads the step form through `useFormContext`.
 */
export function AddressFields({ prefix, autoCompleteSection }: AddressFieldsProps) {
  const form = useFormContext<FieldValues>();
  const {
    register, control, getValues, setValue, getFieldState, formState,
  } = form;
  const status = useFieldStatus(form);
  const path = (field: string) => `${prefix}.${field}`;

  const pin = (useWatch({ control, name: path('pinCode') }) as string | undefined) ?? '';
  const postOffice = (useWatch({ control, name: path('postOffice') }) as string | undefined) ?? '';
  const lookup = usePinCodeLookup(pin);

  // Auto-fill once per newly looked-up PIN; restoring a saved address never overwrites edits.
  const filledForPin = useRef<string | null>(getValues(path('city')) ? pin : null);
  useEffect(() => {
    const { record } = lookup;
    if (!record || filledForPin.current === record.pin) return;
    filledForPin.current = record.pin;
    const validate = formState.isSubmitted || getFieldState(path('city')).isTouched;
    setValue(path('city'), record.city, { shouldDirty: true, shouldValidate: validate });
    setValue(path('state'), record.state, { shouldDirty: true, shouldValidate: true });
    setValue(path('postOffice'), record.postOffice, { shouldDirty: true });
    // `path` is derived from the stable prefix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup.record]);

  let pinHelp = 'Six digits. We fill in the city and state for you.';
  if (lookup.record) pinHelp = `Post office: ${lookup.record.postOffice}`;
  else if (lookup.notFound) pinHelp = 'Not in our sample PIN directory — please type the city and state.';
  else if (lookup.error) pinHelp = lookup.error;
  else if (postOffice && !lookup.isLoading) pinHelp = `Post office: ${postOffice}`;

  const section = `section-${autoCompleteSection}`;

  return (
    <div className="flex flex-col gap-6">
      <TextField
        {...register(path('line1'))}
        label="Address line 1"
        helpText="House or flat number, building and street."
        autoComplete={`${section} address-line1`}
        maxLength={200}
        {...status(path('line1'))}
      />
      <TextField
        {...register(path('line2'))}
        label="Address line 2"
        optional
        helpText="Area, locality or landmark."
        autoComplete={`${section} address-line2`}
        maxLength={200}
        {...status(path('line2'))}
      />
      <div className="grid gap-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <TextField
          {...register(path('pinCode'))}
          onInput={formatPin}
          label="PIN code"
          inputMode="numeric"
          maxLength={6}
          autoComplete={`${section} postal-code`}
          helpText={pinHelp}
          helpPosition="below"
          endAdornment={lookup.isLoading ? <Spinner className="mr-3 size-4 text-cobalt" label="Looking up PIN code" /> : undefined}
          {...status(path('pinCode'))}
        />
        <TextField
          {...register(path('city'))}
          label="City or town"
          autoComplete={`${section} address-level2`}
          maxLength={60}
          {...status(path('city'))}
        />
        <Select
          {...register(path('state'))}
          label="State or union territory"
          placeholder="Select"
          options={STATE_OPTIONS}
          autoComplete={`${section} address-level1`}
          {...status(path('state'))}
        />
      </div>
      <p role="status" className="sr-only">
        {lookup.record ? `City and state filled in from PIN code ${lookup.record.pin}.` : ''}
      </p>
    </div>
  );
}
