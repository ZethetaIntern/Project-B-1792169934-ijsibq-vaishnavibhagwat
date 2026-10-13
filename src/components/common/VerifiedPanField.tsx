import { useCallback } from 'react';
import {
  Controller, useFormContext, useWatch, type FieldValues,
} from 'react-hook-form';
import { useVerification } from '../../hooks/useVerification';
import { formatPanInput, isAlphanumeric } from '../../utils/inputFormatting';
import { validatePan } from '../../utils/validators';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { MaskedInput } from './MaskedInput';
import { VerificationIndicator, verificationAnnouncement } from './VerificationIndicator';

interface VerifiedPanFieldProps {
  /** Form field holding the PAN, and the boolean flag recording its verification. */
  name: string;
  verifiedFlag: string;
  label: string;
  helpText: string;
  allowedEntities: readonly string[];
}

/**
 * Masked PAN input with simulated verification on blur (Verify → Verifying… →
 * Verified / Retry). Editing a verified PAN clears its verification. Used for the
 * applicant (Step 3) and the co-applicant (Step 6).
 */
export function VerifiedPanField({
  name, verifiedFlag, label, helpText, allowedEntities,
}: VerifiedPanFieldProps) {
  const form = useFormContext<FieldValues>();
  const {
    control, getValues, setValue, trigger,
  } = form;
  const status = useFieldStatus(form);
  const entityKey = allowedEntities.join('');
  const validate = useCallback((value: string) => validatePan(value, entityKey.split('')), [entityKey]);
  const check = useVerification('pan', { validate, initiallyVerified: Boolean(getValues(verifiedFlag)) });
  const pan = (useWatch({ control, name }) as string | undefined) ?? '';

  const verify = async () => {
    if (getValues(verifiedFlag)) return;
    if (await check.verify(getValues(name))) {
      setValue(verifiedFlag, true);
      trigger(name);
    }
  };

  let { error } = status(name);
  if (check.isVerifying) error = undefined;
  else if (check.status === 'failed') error = check.error ?? undefined;

  return (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <MaskedInput
            ref={field.ref}
            name={field.name}
            value={field.value}
            onChange={(event) => {
              field.onChange(event.target.value);
              if (getValues(verifiedFlag)) setValue(verifiedFlag, false);
              check.reset();
            }}
            onBlur={() => {
              field.onBlur();
              verify();
            }}
            label={label}
            revealLabel={label}
            format={formatPanInput}
            isSignificant={isAlphanumeric}
            autoCapitalize="characters"
            maxLength={10}
            helpText={helpText}
            trailing={(
              <VerificationIndicator
                status={check.status}
                onVerify={verify}
                hasValue={pan.length > 0}
                label={label}
              />
            )}
            error={error}
          />
        )}
      />
      <p role="status" className="sr-only">{verificationAnnouncement(check.status, label)}</p>
    </>
  );
}
