import type { FormEvent } from 'react';
import { Controller, FormProvider, useWatch } from 'react-hook-form';
import { ADDRESS_PROOF_RULES } from '../../constants/documents';
import { RESIDENCE_LABELS, toOptions } from '../../constants/labels';
import { digitsOnly, formatPreservingCaret, isDigit } from '../../utils/inputFormatting';
import { AddressFields } from '../common/AddressFields';
import { Checkbox } from '../common/Checkbox';
import { Collapse } from '../common/Collapse';
import { CurrencyInput } from '../common/CurrencyInput';
import { FileUpload } from '../common/FileUpload';
import { FormSection } from '../common/FormSection';
import { TextField } from '../common/Input';
import { Select } from '../common/Select';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';

const RESIDENCE_OPTIONS = toOptions(RESIDENCE_LABELS);

const formatYears = (event: FormEvent<HTMLInputElement>) => {
  formatPreservingCaret(event.currentTarget, digitsOnly(2), isDigit);
};

export default function Step4Address() {
  const form = useStepForm('address');
  const {
    control, register, getValues, setValue,
  } = form;
  const status = useFieldStatus(form);

  const [residenceType, years, sameAsCurrent] = useWatch({
    control,
    name: ['residenceType', 'yearsAtCurrentAddress', 'permanentSameAsCurrent'],
  });
  const isRented = residenceType === 'rented';
  const needsPreviousAddress = years !== null && years < 1;

  const sameAsCurrentField = register('permanentSameAsCurrent', {
    onChange: (event: FormEvent<HTMLInputElement>) => {
      // Unticking pre-fills the permanent address from the current one as a starting point.
      if (!event.currentTarget.checked && !getValues('permanent.line1')) {
        setValue('permanent', { ...getValues('current') });
      }
    },
  });

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-10">
        <FormSection title="Current address" description="Where you live now. Enter the PIN code first to save typing.">
          <AddressFields prefix="current" autoCompleteSection="current" />
        </FormSection>

        <FormSection title="About this home">
          <div className="grid gap-6 sm:grid-cols-2">
            <Select
              {...register('residenceType')}
              label="This home is"
              placeholder="Select"
              options={RESIDENCE_OPTIONS}
              {...status('residenceType')}
            />
            <TextField
              {...register('yearsAtCurrentAddress', {
                setValueAs: (value: string | number | null) => (value === '' || value === null ? null : Number(value)),
              })}
              onInput={formatYears}
              label="Years at this address"
              inputMode="numeric"
              maxLength={2}
              helpText="Enter 0 if less than a year."
              {...status('yearsAtCurrentAddress')}
            />
          </div>

          <Collapse open={isRented}>
            <Controller
              control={control}
              name="monthlyRent"
              render={({ field }) => (
                <CurrencyInput
                  ref={field.ref}
                  name={field.name}
                  label="Monthly rent"
                  helpText="Counted as a monthly commitment when we estimate affordability."
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  maxDigits={7}
                  {...status('monthlyRent')}
                />
              )}
            />
          </Collapse>
        </FormSection>

        <Collapse open={needsPreviousAddress}>
          <FormSection
            title="Previous address"
            description="You have lived at your current address for less than a year, so we also need your previous one."
          >
            <AddressFields prefix="previous" autoCompleteSection="previous" />
          </FormSection>
        </Collapse>

        <FormSection title="Proof of current address">
          <Controller
            control={control}
            name="addressProof"
            render={({ field }) => (
              <FileUpload
                name="addressProof"
                label="Address proof"
                optional
                hint="A utility bill, rent agreement or bank statement from the last 3 months showing your current address. Helpful if your Aadhaar shows a different address."
                rules={ADDRESS_PROOF_RULES}
                files={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  field.onBlur();
                }}
                error={status('addressProof').error}
              />
            )}
          />
        </FormSection>

        <FormSection title="Permanent address" description="As recorded on your identity documents.">
          <Checkbox
            {...sameAsCurrentField}
            label="My permanent address is the same as my current address"
          />
          <Collapse open={!sameAsCurrent}>
            <AddressFields prefix="permanent" autoCompleteSection="permanent" />
          </Collapse>
        </FormSection>
      </div>
    </FormProvider>
  );
}
