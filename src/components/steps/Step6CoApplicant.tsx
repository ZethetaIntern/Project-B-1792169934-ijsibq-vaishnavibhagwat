import { useEffect } from 'react';
import { Controller, FormProvider, useWatch } from 'react-hook-form';
import { getLoanProduct } from '../../constants/loan';
import { getRelationshipOptions, RELATIONSHIP_LABELS } from '../../schemas/step6Schema';
import { useApplicationStore } from '../../store/applicationStore';
import { formatINR } from '../../utils/format';
import { Callout } from '../common/Callout';
import { Checkbox } from '../common/Checkbox';
import { CurrencyInput } from '../common/CurrencyInput';
import { FormSection } from '../common/FormSection';
import { TextField } from '../common/Input';
import { Select } from '../common/Select';
import { SignatureCanvas } from '../common/SignatureCanvas';
import { VerifiedPanField } from '../common/VerifiedPanField';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';

/** Why this step appeared — the conditional rule, in plain words. */
function requirementReason(loanType: string, amount: number | null): string {
  const product = getLoanProduct(loanType as never);
  if (!product) return '';
  if (product.coApplicantAboveAmount === 0) return `${product.label}s always need a co-applicant.`;
  return `${product.label}s above ${formatINR(product.coApplicantAboveAmount)} need a co-applicant — you asked for ${formatINR(amount ?? 0)}.`;
}

export default function Step6CoApplicant() {
  const form = useStepForm('coApplicant');
  const {
    control, register, getValues, setValue, watch,
  } = form;
  const status = useFieldStatus(form);
  const application = useApplicationStore((state) => state.data);
  const updateSection = useApplicationStore((state) => state.updateSection);
  const { maritalStatus } = application.personal;
  const relationships = getRelationshipOptions(maritalStatus);
  const coApplicantName = useWatch({ control, name: 'fullName' });

  // Step 2 → Step 6: married applicants get Spouse pre-selected as the default.
  useEffect(() => {
    if (!getValues('relationship') && maritalStatus === 'married') setValue('relationship', 'spouse');
  }, [getValues, setValue, maritalStatus]);

  // Combined income drives the summary panel's affordability meter.
  useEffect(() => {
    const subscription = watch(() => updateSection('coApplicant', getValues()));
    return () => subscription.unsubscribe();
  }, [watch, getValues, updateSection]);

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-10">
        <Callout title="Why we need a co-applicant">
          {`${requirementReason(application.loan.loanType, application.loan.loanAmount)} Their income is added to yours when we estimate affordability, and they share responsibility for repayment.`}
        </Callout>

        <FormSection title="About your co-applicant">
          <TextField {...register('fullName')} label="Full name (as per PAN)" autoComplete="off" maxLength={100} {...status('fullName')} />
          <Select
            {...register('relationship')}
            label="Relationship to you"
            placeholder="Select"
            options={relationships.map((value) => ({ value, label: RELATIONSHIP_LABELS[value] }))}
            helpText={maritalStatus === 'married' ? undefined : 'Spouse is available when you are married (Step 2).'}
            {...status('relationship')}
          />
          <VerifiedPanField
            name="pan"
            verifiedFlag="panVerified"
            label="Co-applicant's PAN"
            allowedEntities={['P']}
            helpText="An individual PAN (4th letter P), different from yours."
          />
          <Controller
            control={control}
            name="monthlyIncome"
            render={({ field }) => (
              <CurrencyInput
                ref={field.ref}
                name={field.name}
                label="Co-applicant's monthly income"
                helpText="Added to your income for the affordability estimate. Enter 0 if they have none."
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                sensitive
                revealLabel="co-applicant's income"
                maxDigits={9}
                {...status('monthlyIncome')}
              />
            )}
          />
        </FormSection>

        <FormSection title="Co-applicant's consent" description="Your co-applicant should complete this part themselves.">
          <Checkbox
            {...register('consent')}
            variant="card"
            label="I agree to be a co-applicant on this loan and consent to LendSwift verifying my identity and checking my credit information."
            description="I understand I will be jointly responsible for repaying the loan if it is approved."
            error={status('consent').error}
          />
          <Controller
            control={control}
            name="signature"
            render={({ field }) => (
              <SignatureCanvas
                label="Co-applicant's signature"
                description="Draw with a mouse, finger or stylus — or switch to Type."
                value={field.value}
                onChange={(dataUrl) => {
                  field.onChange(dataUrl);
                  field.onBlur();
                }}
                defaultTypedName={coApplicantName}
                error={status('signature').error}
              />
            )}
          />
        </FormSection>
      </div>
    </FormProvider>
  );
}
