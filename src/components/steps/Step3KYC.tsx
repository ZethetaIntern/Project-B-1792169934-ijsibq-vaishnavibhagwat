import type { FormEvent } from 'react';
import { Controller, FormProvider, useWatch } from 'react-hook-form';
import { useVerification } from '../../hooks/useVerification';
import { isPassportFieldVisible } from '../../schemas/step3Schema';
import { useApplicationStore } from '../../store/applicationStore';
import {
  formatAadhaarInput,
  formatPreservingCaret,
  isAlphanumeric,
  isDigit,
  upperAlphanumeric,
} from '../../utils/inputFormatting';
import { allowedPanEntities, validateAadhaar } from '../../utils/validators';
import { Callout } from '../common/Callout';
import { Checkbox } from '../common/Checkbox';
import { Collapse } from '../common/Collapse';
import { FormSection } from '../common/FormSection';
import { TextField } from '../common/Input';
import { MaskedInput } from '../common/MaskedInput';
import { VerificationIndicator, verificationAnnouncement } from '../common/VerificationIndicator';
import { VerifiedPanField } from '../common/VerifiedPanField';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';

const formatUpper = (maxLength: number) => (event: FormEvent<HTMLInputElement>) => {
  formatPreservingCaret(event.currentTarget, upperAlphanumeric(maxLength), isAlphanumeric);
};

export default function Step3KYC() {
  const form = useStepForm('kyc');
  const {
    control, register, getValues, setValue, trigger,
  } = form;
  const status = useFieldStatus(form);
  const loan = useApplicationStore((state) => state.data.loan);
  const showPassport = isPassportFieldVisible(loan);

  const aadhaarCheck = useVerification('aadhaar', {
    validate: validateAadhaar,
    initiallyVerified: getValues('aadhaarVerified'),
  });
  const aadhaar = useWatch({ control, name: 'aadhaar' });

  const verifyAadhaar = async () => {
    if (getValues('aadhaarVerified')) return;
    if (await aadhaarCheck.verify(getValues('aadhaar'))) {
      setValue('aadhaarVerified', true);
      trigger('aadhaar');
    }
  };

  /** While verifying, hide "not verified yet"; after a failure show the service's reason. */
  const aadhaarError = () => {
    if (aadhaarCheck.isVerifying) return undefined;
    if (aadhaarCheck.status === 'failed') return aadhaarCheck.error ?? undefined;
    return status('aadhaar').error;
  };

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-10">
        <Callout tone="privacy" title="Simulated verification">
          This demo checks the format of your PAN and Aadhaar and simulates a 1.5-second
          verification. Nothing is sent to NSDL, UIDAI or any other service, and a valid
          format does not prove identity. Please use sample numbers, not your own.
        </Callout>

        <FormSection title="PAN" description="Your Permanent Account Number from the Income Tax Department.">
          <VerifiedPanField
            name="pan"
            verifiedFlag="panVerified"
            label="PAN"
            allowedEntities={allowedPanEntities(loan.loanType)}
            helpText={loan.loanType === 'business'
              ? 'Format ABCPE1234F. The 4th letter must be P (individual), C (company) or F (firm).'
              : 'Format ABCPE1234F. The 4th letter must be P for an individual.'}
          />
        </FormSection>

        <FormSection title="Aadhaar" description="Only the last four digits stay visible once you leave the field.">
          <Controller
            control={control}
            name="aadhaar"
            render={({ field }) => (
              <MaskedInput
                ref={field.ref}
                name={field.name}
                value={formatAadhaarInput(field.value)}
                onChange={(event) => {
                  field.onChange(event.target.value.replace(/\D/g, ''));
                  if (getValues('aadhaarVerified')) setValue('aadhaarVerified', false);
                  aadhaarCheck.reset();
                }}
                onBlur={() => {
                  field.onBlur();
                  verifyAadhaar();
                }}
                label="Aadhaar number"
                revealLabel="Aadhaar number"
                format={formatAadhaarInput}
                isSignificant={isDigit}
                inputMode="numeric"
                maxLength={14}
                helpText="12 digits. The last digit is a checksum, so typing mistakes are caught."
                trailing={(
                  <VerificationIndicator status={aadhaarCheck.status} onVerify={verifyAadhaar} hasValue={aadhaar.length > 0} label="Aadhaar" />
              )}
                error={aadhaarError()}
              />
            )}
          />
          <p role="status" className="sr-only">{verificationAnnouncement(aadhaarCheck.status, 'Aadhaar')}</p>
          <Checkbox
            {...register('aadhaarConsent')}
            variant="card"
            label="I consent to LendSwift using my Aadhaar number to verify my identity for this loan application."
            description="Consent is voluntary and used only for e-KYC under the Aadhaar Act, 2016. Your Aadhaar is not shared for any other purpose, and you may offer another officially valid document instead."
            error={status('aadhaarConsent').error}
          />
        </FormSection>

        <FormSection title="Other identity documents" description="Optional, but they can help if PAN or Aadhaar details need a manual check.">
          <TextField
            {...register('voterId')}
            onInput={formatUpper(10)}
            label="Voter ID (EPIC) number"
            optional
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={10}
            helpText="3 letters followed by 7 digits, e.g. ABC1234567."
            {...status('voterId')}
          />
          <Collapse open={showPassport}>
            <TextField
              {...register('passportNumber')}
              onInput={formatUpper(8)}
              label="Passport number"
              optional
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={8}
              helpText="Asked for Home Loans above ₹50 lakh. 1 letter followed by 7 digits, e.g. K1234567."
              {...status('passportNumber')}
            />
          </Collapse>
        </FormSection>
      </div>
    </FormProvider>
  );
}
