import { z } from 'zod';
import {
  getLoanProduct,
  MAX_AGE_AT_MATURITY,
  MAX_APPLICANT_AGE,
  MIN_APPLICANT_AGE,
} from '../constants/loan';
import type { ApplicationData } from '../types/application';
import { calculateAge, monthsUntilAge, parseIsoDate } from '../utils/dates';
import { formatTenure } from '../utils/format';
import {
  isValidEmail,
  normalizeIndianMobile,
  validateIndianMobile,
  validatePersonName,
} from '../utils/validators';
import { choice, fail, text } from './common';

const GENDERS = ['male', 'female', 'other'];
const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed'];

const mobile = z.string().transform(normalizeIndianMobile);

function checkName(ctx: z.RefinementCtx, field: string, value: string, label: string) {
  if (!value) {
    fail(ctx, [field], `Enter the ${label}.`);
    return;
  }
  const problem = validatePersonName(value, label);
  if (problem) fail(ctx, [field], problem);
}

/**
 * Step 2 — personal details.
 * Cross-step: the date of birth is checked against the tenure chosen in Step 1 so
 * the loan is repaid by age 65 (the same rule Step 1 enforces once DOB is known).
 */
export function buildStep2Schema(application: ApplicationData, today = new Date()) {
  const { loanType, tenureMonths } = application.loan;

  return z.object({
    fullName: text,
    dateOfBirth: z.string(),
    gender: choice,
    maritalStatus: choice,
    fatherName: text,
    motherName: text,
    email: text.transform((value) => value.toLowerCase()),
    emailVerified: z.boolean(),
    mobile,
    mobileVerified: z.boolean(),
    alternateMobile: mobile,
  }).superRefine((person, ctx) => {
    checkName(ctx, 'fullName', person.fullName, 'full name');
    checkName(ctx, 'fatherName', person.fatherName, "father's name");
    checkName(ctx, 'motherName', person.motherName, "mother's name");

    const age = calculateAge(person.dateOfBirth, today);
    if (!person.dateOfBirth) {
      fail(ctx, ['dateOfBirth'], 'Enter your date of birth.');
    } else if (age === null) {
      fail(ctx, ['dateOfBirth'], 'Enter a real date in the format DD/MM/YYYY.');
    } else if ((parseIsoDate(person.dateOfBirth) as Date) > today) {
      fail(ctx, ['dateOfBirth'], 'Your date of birth cannot be in the future.');
    } else if (age < MIN_APPLICANT_AGE) {
      fail(ctx, ['dateOfBirth'], `You must be at least ${MIN_APPLICANT_AGE} years old to apply. You are ${age} today.`);
    } else if (age > MAX_APPLICANT_AGE) {
      fail(ctx, ['dateOfBirth'], `Applicants must be ${MAX_APPLICANT_AGE} or younger. You are ${age} today.`);
    } else if (tenureMonths) {
      const limit = monthsUntilAge(person.dateOfBirth, MAX_AGE_AT_MATURITY, today) ?? 0;
      if (tenureMonths > limit) {
        fail(
          ctx,
          ['dateOfBirth'],
          `Repaying your ${getLoanProduct(loanType)?.label ?? 'loan'} over ${formatTenure(tenureMonths)} would run past your ${MAX_AGE_AT_MATURITY}th birthday. Shorten the tenure in Step 1 to ${formatTenure(limit) || 'less'} or less.`,
        );
      }
    }

    if (!GENDERS.includes(person.gender)) fail(ctx, ['gender'], 'Select your gender.');
    if (!MARITAL_STATUSES.includes(person.maritalStatus)) {
      fail(ctx, ['maritalStatus'], 'Select your marital status.');
    }

    if (!person.email) {
      fail(ctx, ['email'], 'Enter your email address.');
    } else if (!isValidEmail(person.email)) {
      fail(ctx, ['email'], 'Enter an email address like name@example.com.');
    }

    if (!person.mobile) {
      fail(ctx, ['mobile'], 'Enter your mobile number.');
    } else {
      const problem = validateIndianMobile(person.mobile);
      if (problem) fail(ctx, ['mobile'], problem);
      else if (!person.mobileVerified) {
        fail(ctx, ['mobile'], 'Verify your mobile number with the one-time password.');
      }
    }

    if (person.alternateMobile) {
      const problem = validateIndianMobile(person.alternateMobile);
      if (problem) fail(ctx, ['alternateMobile'], problem);
      else if (person.alternateMobile === person.mobile) {
        fail(ctx, ['alternateMobile'], 'Your alternate number must be different from your primary mobile.');
      }
    }
  });
}
