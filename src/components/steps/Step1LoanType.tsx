import { Building2, House, UserRound } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import {
  getLoanProduct,
  LOAN_PRODUCTS,
  LOAN_TYPES,
  MIN_LOAN_AMOUNT,
} from '../../constants/loan';
import { getAgeTenureLimit, getAllowedTenures } from '../../schemas/step1Schema';
import { useApplicationStore } from '../../store/applicationStore';
import type { LoanType } from '../../types/application';
import { estimateForLoan } from '../../utils/emiCalculator';
import { formatCompactINR, formatINR, formatTenure } from '../../utils/format';
import { Collapse } from '../common/Collapse';
import { CurrencyInput } from '../common/CurrencyInput';
import { TextField } from '../common/Input';
import { RadioGroup } from '../common/RadioGroup';
import { Select } from '../common/Select';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';

const ICONS: Record<LoanType, ReactNode> = {
  personal: <UserRound aria-hidden="true" className="size-5" />,
  home: <House aria-hidden="true" className="size-5" />,
  business: <Building2 aria-hidden="true" className="size-5" />,
};

/** Sensible starting tenure when switching products (still editable). */
const DEFAULT_TENURE: Record<LoanType, number> = { personal: 36, home: 240, business: 60 };

const SLIDER_STEP: Record<LoanType, number> = {
  personal: 10_000,
  home: 1_00_000,
  business: 50_000,
};

const LOAN_OPTIONS = LOAN_TYPES.map((id) => {
  const product = LOAN_PRODUCTS[id];
  return {
    value: id,
    label: product.label,
    description: product.tagline,
    icon: ICONS[id],
    meta: `Up to ${formatCompactINR(product.maxAmount)} · ${product.annualInterestRate}% p.a.*`,
  };
});

export default function Step1LoanType() {
  const form = useStepForm('loan');
  const {
    control, register, setValue, getValues, trigger, watch,
  } = form;
  const status = useFieldStatus(form);
  const application = useApplicationStore((state) => state.data);
  const updateSection = useApplicationStore((state) => state.updateSection);

  const [loanType, loanAmount, tenureMonths] = useWatch({
    control,
    name: ['loanType', 'loanAmount', 'tenureMonths'],
  });
  const product = getLoanProduct(loanType);
  const ageLimit = getAgeTenureLimit(application);
  const tenures = useMemo(() => getAllowedTenures(loanType, ageLimit), [loanType, ageLimit]);
  const estimate = estimateForLoan(loanType, loanAmount, tenureMonths);

  // Mirror edits into the store so the summary panel and step list update live
  // (e.g. the co-applicant step appears as soon as the amount crosses its threshold).
  useEffect(() => {
    const subscription = watch((values) => updateSection('loan', values));
    return () => subscription.unsubscribe();
  }, [watch, updateSection]);

  const loanTypeField = register('loanType', {
    onChange: () => {
      const next = getLoanProduct(getValues('loanType'));
      if (!next) return;
      if (!next.purposes.some((option) => option.value === getValues('purpose'))) {
        setValue('purpose', '', { shouldValidate: form.formState.isSubmitted });
      }
      const allowed = getAllowedTenures(next.id, ageLimit);
      if (!allowed.includes(getValues('tenureMonths') ?? -1)) {
        const preferred = DEFAULT_TENURE[next.id];
        const shorter = allowed.filter((months) => months <= preferred);
        setValue('tenureMonths', shorter.pop() ?? allowed[0] ?? null, { shouldValidate: true });
      }
      // Re-check the amount against the new product's maximum straight away.
      if (getValues('loanAmount') !== null) trigger('loanAmount');
    },
  });

  const sliderMax = product?.maxAmount ?? MIN_LOAN_AMOUNT;
  const sliderValue = Math.min(Math.max(loanAmount ?? MIN_LOAN_AMOUNT, MIN_LOAN_AMOUNT), sliderMax);
  const ageTrimmed = Boolean(product) && tenures.length < getAllowedTenures(loanType, null).length;

  return (
    <div className="flex flex-col gap-8">
      <RadioGroup
        {...loanTypeField}
        legend="What would you like to borrow for?"
        variant="card"
        options={LOAN_OPTIONS}
        error={status('loanType').error}
      />

      <Collapse open={Boolean(product)}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Controller
              control={control}
              name="loanAmount"
              render={({ field }) => (
                <CurrencyInput
                  ref={field.ref}
                  name={field.name}
                  label="Loan amount"
                  helpText={product && `Between ${formatINR(MIN_LOAN_AMOUNT)} and ${formatINR(product.maxAmount)}.`}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  {...status('loanAmount')}
                />
              )}
            />
            {product && (
              <div className="flex flex-col gap-1">
                <input
                  type="range"
                  min={MIN_LOAN_AMOUNT}
                  max={product.maxAmount}
                  step={SLIDER_STEP[product.id]}
                  value={sliderValue}
                  aria-label="Adjust loan amount"
                  aria-valuetext={formatINR(sliderValue)}
                  onChange={(event) => setValue('loanAmount', Number(event.target.value), {
                    shouldDirty: true, shouldTouch: true, shouldValidate: true,
                  })}
                  className="h-11 w-full cursor-pointer accent-[var(--color-cobalt)]"
                />
                <div aria-hidden="true" className="flex justify-between text-xs text-muted tabular">
                  <span>{formatCompactINR(MIN_LOAN_AMOUNT)}</span>
                  <span>{formatCompactINR(product.maxAmount)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Select
              {...register('tenureMonths', {
                setValueAs: (value: string | number | null) => (value === '' || value === null ? null : Number(value)),
              })}
              label="Repayment tenure"
              placeholder="Choose a tenure"
              options={tenures.map((months) => ({ value: months, label: `${formatTenure(months)} · ${months} months` }))}
              helpText={ageTrimmed ? 'Shorter tenures only — your loan must be repaid before you turn 65.' : undefined}
              {...status('tenureMonths')}
            />
            <Select
              {...register('purpose')}
              label="Purpose of the loan"
              placeholder="Choose a purpose"
              options={product?.purposes ?? []}
              {...status('purpose')}
            />
          </div>

          <TextField
            {...register('referralCode', { setValueAs: (value: string) => value.toUpperCase() })}
            label="Referral code"
            optional
            maxLength={10}
            autoCapitalize="characters"
            autoComplete="off"
            className="uppercase"
            helpText="If someone referred you, enter their 6–10 character code."
            {...status('referralCode')}
          />

          {estimate && product && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-card bg-brand-tint px-5 py-4" aria-live="polite">
              <p className="text-sm text-ink-soft">
                Estimated EMI at
                {' '}
                {product.annualInterestRate}
                % p.a.*
              </p>
              <p className="text-2xl font-semibold tracking-tight text-brand tabular">
                {formatINR(estimate.emi)}
                <span className="text-sm font-medium text-slate"> / month</span>
              </p>
              <p className="basis-full text-xs text-slate">
                *Illustrative rate for estimates only — not a loan offer.
              </p>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}
