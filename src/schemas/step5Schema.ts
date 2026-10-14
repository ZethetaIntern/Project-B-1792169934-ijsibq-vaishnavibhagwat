import { z } from 'zod';
import type { ApplicationData } from '../types/application';
import { formatINR } from '../utils/format';
import { validateGstin } from '../utils/validators';
import {
  MIN_ANNUAL_TURNOVER, MIN_MONTHLY_SALARY, MIN_YEARS_IN_BUSINESS,
} from '../constants/loan';
import { addressShape, checkAddress } from './addressSchema';
import { fail, optionalNumber, text } from './common';

export { MIN_ANNUAL_TURNOVER, MIN_MONTHLY_SALARY, MIN_YEARS_IN_BUSINESS } from '../constants/loan';

export const BUSINESS_TYPES = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'trading', label: 'Trading — wholesale or retail' },
  { value: 'services', label: 'Services' },
  { value: 'professional', label: 'Professional practice (doctor, CA, lawyer…)' },
  { value: 'agriculture', label: 'Agriculture and allied' },
  { value: 'construction', label: 'Construction and real estate' },
  { value: 'logistics', label: 'Transport and logistics' },
  { value: 'hospitality', label: 'Hospitality and food' },
  { value: 'technology', label: 'IT and software' },
  { value: 'other', label: 'Other' },
] as const;

const ORGANISATION_NAME = /^[\p{L}\p{N}\s.,&()'/-]+$/u;

function checkOrganisation(ctx: z.RefinementCtx, field: string, value: string, label: string) {
  if (!value) fail(ctx, [field], `Enter the ${label}.`);
  else if (value.length < 2 || value.length > 100) fail(ctx, [field], `The ${label} should be 2–100 characters.`);
  else if (!ORGANISATION_NAME.test(value)) fail(ctx, [field], `Remove unusual symbols from the ${label}.`);
}

function checkWholeYears(
  ctx: z.RefinementCtx,
  field: string,
  value: number | null,
  { min, label }: { min: number; label: string },
) {
  if (value === null) fail(ctx, [field], `Enter your ${label} in whole years.`);
  else if (!Number.isInteger(value) || value < min || value > 50) {
    fail(ctx, [field], min > 0
      ? `${label[0].toUpperCase()}${label.slice(1)} must be at least ${min} years (and at most 50).`
      : `Enter a whole number of years between 0 and 50 for your ${label}.`);
  }
}

const common = { yearsOfExperience: optionalNumber };

const salaried = z.object({
  employmentType: z.literal('salaried'),
  ...common,
  companyName: text,
  designation: text,
  monthlySalary: optionalNumber,
}).superRefine((job, ctx) => {
  checkWholeYears(ctx, 'yearsOfExperience', job.yearsOfExperience, { min: 0, label: 'work experience' });
  checkOrganisation(ctx, 'companyName', job.companyName, 'company name');
  if (!job.designation) fail(ctx, ['designation'], 'Enter your job title.');
  else if (job.designation.length > 60) fail(ctx, ['designation'], 'Keep the job title to 60 characters or fewer.');
  if (job.monthlySalary === null) fail(ctx, ['monthlySalary'], 'Enter your monthly take-home salary.');
  else if (job.monthlySalary < MIN_MONTHLY_SALARY) {
    fail(ctx, ['monthlySalary'], `The minimum monthly salary for a loan is ${formatINR(MIN_MONTHLY_SALARY)}.`);
  }
});

const businessFields = {
  ...common,
  businessName: text,
  businessType: z.string(),
  annualTurnover: optionalNumber,
  yearsInBusiness: optionalNumber,
  monthlyIncome: optionalNumber,
  officeAddress: addressShape,
};

type BusinessValues = z.infer<z.ZodObject<typeof businessFields>>;

function checkBusiness(business: BusinessValues, ctx: z.RefinementCtx) {
  checkWholeYears(ctx, 'yearsOfExperience', business.yearsOfExperience, { min: 0, label: 'work experience' });
  checkOrganisation(ctx, 'businessName', business.businessName, 'business name');
  if (!BUSINESS_TYPES.some((type) => type.value === business.businessType)) {
    fail(ctx, ['businessType'], 'Choose the type of business.');
  }
  if (business.annualTurnover === null) fail(ctx, ['annualTurnover'], 'Enter your annual turnover.');
  else if (business.annualTurnover < MIN_ANNUAL_TURNOVER) {
    fail(ctx, ['annualTurnover'], `Annual turnover must be at least ${formatINR(MIN_ANNUAL_TURNOVER)}.`);
  }
  checkWholeYears(ctx, 'yearsInBusiness', business.yearsInBusiness, {
    min: MIN_YEARS_IN_BUSINESS, label: 'time in business',
  });
  if (business.monthlyIncome === null || business.monthlyIncome <= 0) {
    fail(ctx, ['monthlyIncome'], 'Enter your average monthly income after business expenses.');
  }
  checkAddress(ctx, 'officeAddress', business.officeAddress, 'your office or business address');
}

const selfEmployed = z.object({
  employmentType: z.literal('selfEmployed'),
  ...businessFields,
}).superRefine(checkBusiness);

const businessOwner = z.object({
  employmentType: z.literal('businessOwner'),
  ...businessFields,
  gstNumber: z.string().transform((value) => value.toUpperCase().replace(/\s/g, '')),
}).superRefine((business, ctx) => {
  checkBusiness(business, ctx);
  if (!business.gstNumber) fail(ctx, ['gstNumber'], 'Enter your GSTIN (GST registration number).');
  else {
    const problem = validateGstin(business.gstNumber);
    if (problem) fail(ctx, ['gstNumber'], problem);
  }
});

/**
 * Step 5 — employment and income. A discriminated union on `employmentType`:
 * each branch has its own fields, and parsing strips the fields of the other
 * branches (so switching type never leaks stale data).
 * Cross-step: Business Loans require a self-employed or business-owner profile.
 */
export function buildStep5Schema(application: ApplicationData) {
  const isBusinessLoan = application.loan.loanType === 'business';

  return z.discriminatedUnion(
    'employmentType',
    [salaried, selfEmployed, businessOwner],
    { error: 'Choose how you earn your income.' },
  ).superRefine((employment, ctx) => {
    if (isBusinessLoan && employment.employmentType === 'salaried') {
      fail(
        ctx,
        ['employmentType'],
        'Business Loans are for the self-employed and business owners. Choose one of those, or change the loan type in Step 1.',
      );
    }
  });
}
