import { Briefcase, Building2, UserRound } from 'lucide-react';
import {
  useEffect, useState, type FormEvent,
} from 'react';
import { Controller, FormProvider, useWatch } from 'react-hook-form';
import { COMPANY_SUGGESTIONS } from '../../constants/companies';
import { BUSINESS_TYPES } from '../../schemas/step5Schema';
import { useApplicationStore } from '../../store/applicationStore';
import type { EmploymentType } from '../../types/application';
import {
  digitsOnly, formatPreservingCaret, isAlphanumeric, isDigit, upperAlphanumeric,
} from '../../utils/inputFormatting';
import { AddressFields } from '../common/AddressFields';
import { Button } from '../common/Button';
import { Collapse } from '../common/Collapse';
import { Combobox } from '../common/Combobox';
import { CurrencyInput } from '../common/CurrencyInput';
import { FormSection } from '../common/FormSection';
import { TextField } from '../common/Input';
import { Modal } from '../common/Modal';
import { RadioGroup } from '../common/RadioGroup';
import { SelectMenu } from '../common/SelectMenu';
import { AffordabilityHint } from '../summary/AffordabilityHint';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';
import {
  EMPLOYMENT_LABELS, emptyValues, fieldsLostOnSwitch, hasDataToLose,
} from './employmentBranches';

const formatYears = (event: FormEvent<HTMLInputElement>) => {
  formatPreservingCaret(event.currentTarget, digitsOnly(2), isDigit);
};
const formatGstin = (event: FormEvent<HTMLInputElement>) => {
  formatPreservingCaret(event.currentTarget, upperAlphanumeric(15), isAlphanumeric);
};
const yearsValue = (value: string | number | null) => (value === '' || value === null ? null : Number(value));

export default function Step5Employment() {
  const form = useStepForm('employment');
  const {
    control, register, getValues, setValue, clearErrors, watch, formState,
  } = form;
  const status = useFieldStatus(form);
  const loanType = useApplicationStore((state) => state.data.loan.loanType);
  const updateSection = useApplicationStore((state) => state.updateSection);
  const [pendingType, setPendingType] = useState<EmploymentType | null>(null);

  const [employmentType, monthlySalary, monthlyIncome] = useWatch({
    control,
    name: ['employmentType', 'monthlySalary', 'monthlyIncome'],
  });
  const isBusinessLoan = loanType === 'business';
  const isBusiness = employmentType === 'selfEmployed' || employmentType === 'businessOwner';

  // Keep the summary panel's affordability meter in sync while income is typed.
  useEffect(() => {
    const subscription = watch(() => updateSection('employment', getValues()));
    return () => subscription.unsubscribe();
  }, [watch, getValues, updateSection]);

  const switchTo = (next: EmploymentType) => {
    const lost = fieldsLostOnSwitch(getValues('employmentType'), next);
    Object.entries(emptyValues(lost)).forEach(([field, value]) => {
      setValue(field as never, value as never, { shouldDirty: true });
    });
    clearErrors(lost);
    setValue('employmentType', next, { shouldDirty: true, shouldTouch: true, shouldValidate: formState.isSubmitted });
  };

  const requestSwitch = (next: EmploymentType) => {
    const current = getValues('employmentType');
    if (next === current) return;
    if (current && hasDataToLose(getValues(), current, next)) setPendingType(next);
    else switchTo(next);
  };

  const typeOptions = [
    {
      value: 'salaried',
      label: 'Salaried',
      description: isBusinessLoan ? 'Not available for Business Loans.' : 'You receive a monthly salary from an employer.',
      icon: <Briefcase aria-hidden="true" className="size-5" />,
      disabled: isBusinessLoan,
    },
    {
      value: 'selfEmployed',
      label: 'Self-employed',
      description: 'Professionals, consultants and freelancers.',
      icon: <UserRound aria-hidden="true" className="size-5" />,
    },
    {
      value: 'businessOwner',
      label: 'Business owner',
      description: 'You run a GST-registered business.',
      icon: <Building2 aria-hidden="true" className="size-5" />,
    },
  ];

  const typedIncome = employmentType === 'salaried' ? monthlySalary : monthlyIncome;
  const currentLabel = employmentType ? EMPLOYMENT_LABELS[employmentType] : '';

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-10">
        <Controller
          control={control}
          name="employmentType"
          render={({ field }) => (
            <RadioGroup
              ref={field.ref}
              name={field.name}
              legend="How do you earn your income?"
              variant="card"
              options={typeOptions}
              value={field.value}
              onChange={(event) => requestSwitch(event.target.value as EmploymentType)}
              onBlur={field.onBlur}
              error={status('employmentType').error}
            />
          )}
        />

        <Collapse open={Boolean(employmentType)}>
          <div className="flex flex-col gap-10">
            <Collapse open={employmentType === 'salaried'}>
              <FormSection title="Your job">
                <Combobox
                  {...register('companyName')}
                  options={COMPANY_SUGGESTIONS}
                  label="Company name"
                  helpText="Start typing to see suggestions, or enter any employer."
                  autoComplete="organization"
                  maxLength={100}
                  {...status('companyName')}
                />
                <TextField {...register('designation')} label="Designation" autoComplete="organization-title" maxLength={60} {...status('designation')} />
                <Controller
                  control={control}
                  name="monthlySalary"
                  render={({ field }) => (
                    <CurrencyInput
                      ref={field.ref}
                      name={field.name}
                      label="Monthly take-home salary"
                      helpText="Net pay credited to your bank account each month (minimum ₹15,000)."
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      sensitive
                      revealLabel="salary"
                      maxDigits={9}
                      {...status('monthlySalary')}
                    />
                  )}
                />
              </FormSection>
            </Collapse>

            <Collapse open={isBusiness}>
              <div className="flex flex-col gap-10">
                <FormSection title="Your business">
                  <TextField {...register('businessName')} label="Business name" autoComplete="organization" maxLength={100} {...status('businessName')} />
                  <Controller
                    control={control}
                    name="businessType"
                    render={({ field }) => (
                      <SelectMenu
                        ref={field.ref}
                        name={field.name}
                        label="Type of business"
                        options={BUSINESS_TYPES}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                        {...status('businessType')}
                      />
                    )}
                  />
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Controller
                      control={control}
                      name="annualTurnover"
                      render={({ field }) => (
                        <CurrencyInput
                          ref={field.ref}
                          name={field.name}
                          label="Annual turnover"
                          helpText="Minimum ₹3,00,000."
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          sensitive
                          revealLabel="turnover"
                          {...status('annualTurnover')}
                        />
                      )}
                    />
                    <TextField
                      {...register('yearsInBusiness', { setValueAs: yearsValue })}
                      onInput={formatYears}
                      label="Years in business"
                      inputMode="numeric"
                      maxLength={2}
                      helpText="At least 2 years."
                      {...status('yearsInBusiness')}
                    />
                  </div>
                  <Controller
                    control={control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <CurrencyInput
                        ref={field.ref}
                        name={field.name}
                        label="Average monthly income"
                        helpText="What you earn each month after business expenses. Used to estimate affordability."
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        sensitive
                        revealLabel="monthly income"
                        maxDigits={9}
                        {...status('monthlyIncome')}
                      />
                    )}
                  />
                  <Collapse open={employmentType === 'businessOwner'}>
                    <TextField
                      {...register('gstNumber')}
                      onInput={formatGstin}
                      label="GSTIN"
                      autoComplete="off"
                      autoCapitalize="characters"
                      maxLength={15}
                      helpText="15 characters, e.g. 29ABCPE1234F1Z5 — state code, business PAN, registration number, Z and a check character."
                      {...status('gstNumber')}
                    />
                  </Collapse>
                </FormSection>
                <FormSection title="Office or business address">
                  <AddressFields prefix="officeAddress" autoCompleteSection="office" />
                </FormSection>
              </div>
            </Collapse>

            <TextField
              {...register('yearsOfExperience', { setValueAs: yearsValue })}
              onInput={formatYears}
              label="Total years of work experience"
              inputMode="numeric"
              maxLength={2}
              helpText="Across all jobs or businesses. Enter 0 if you are just starting out."
              {...status('yearsOfExperience')}
            />

            <AffordabilityHint monthlyIncome={typedIncome} />
          </div>
        </Collapse>

        <Modal
          open={pendingType !== null}
          onClose={() => setPendingType(null)}
          role="alertdialog"
          size="sm"
          title={`Switch to ${pendingType ? EMPLOYMENT_LABELS[pendingType] : ''}?`}
          description={`The ${currentLabel.toLowerCase()} details you entered will be cleared. This cannot be undone.`}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setPendingType(null)}>
                {`Keep ${currentLabel.toLowerCase()}`}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (pendingType) switchTo(pendingType);
                  setPendingType(null);
                }}
              >
                Switch and clear
              </Button>
            </>
          )}
        />
      </div>
    </FormProvider>
  );
}
