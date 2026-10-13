import { z } from 'zod';
import {
  getLoanProduct,
  getTenureOptions,
  MAX_AGE_AT_MATURITY,
  MIN_LOAN_AMOUNT,
} from '../constants/loan';
import type { ApplicationData, LoanType } from '../types/application';
import { monthsUntilAge } from '../utils/dates';
import { formatINR, formatTenure } from '../utils/format';
import {
  choice, fail, optionalNumber, text,
} from './common';

const REFERRAL_CODE = /^[A-Z0-9]{6,10}$/i;

/** Longest tenure allowed by the applicant's age (Step 2 → Step 1), if DOB is known. */
export function getAgeTenureLimit(application: ApplicationData, today = new Date()): number | null {
  const { dateOfBirth } = application.personal;
  return dateOfBirth ? monthsUntilAge(dateOfBirth, MAX_AGE_AT_MATURITY, today) : null;
}

/** Tenure options for a product, trimmed to what the applicant's age allows. */
export function getAllowedTenures(loanType: LoanType | '', ageLimit: number | null): number[] {
  const options = getTenureOptions(loanType);
  return ageLimit === null ? options : options.filter((months) => months <= ageLimit);
}

/**
 * Step 1 — loan type, amount, tenure, purpose, referral code.
 * Amount and tenure ranges come from the chosen product; the date of birth from
 * Step 2 (when already given) caps the tenure so the loan ends by age 65.
 */
export function buildStep1Schema(application: ApplicationData, today = new Date()) {
  const ageLimit = getAgeTenureLimit(application, today);

  return z.object({
    loanType: choice,
    loanAmount: optionalNumber,
    tenureMonths: optionalNumber,
    purpose: choice,
    referralCode: text,
  }).superRefine((loan, ctx) => {
    const product = getLoanProduct(loan.loanType as LoanType | '');
    if (!product) {
      fail(ctx, ['loanType'], 'Choose the type of loan you need.');
    }

    if (loan.loanAmount === null) {
      fail(ctx, ['loanAmount'], 'Enter the amount you would like to borrow.');
    } else if (loan.loanAmount < MIN_LOAN_AMOUNT) {
      fail(ctx, ['loanAmount'], `The minimum loan amount is ${formatINR(MIN_LOAN_AMOUNT)}.`);
    } else if (product && loan.loanAmount > product.maxAmount) {
      fail(
        ctx,
        ['loanAmount'],
        `${product.label}s go up to ${formatINR(product.maxAmount)}. Enter a smaller amount.`,
      );
    }

    if (loan.tenureMonths === null) {
      fail(ctx, ['tenureMonths'], 'Choose how long you would like to repay over.');
    } else if (product && !getTenureOptions(product.id).includes(loan.tenureMonths)) {
      fail(
        ctx,
        ['tenureMonths'],
        `Choose a tenure between ${product.minTenureMonths} and ${product.maxTenureMonths} months for a ${product.label}.`,
      );
    } else if (ageLimit !== null && loan.tenureMonths > ageLimit) {
      const allowed = getAllowedTenures(product?.id ?? '', ageLimit);
      fail(
        ctx,
        ['tenureMonths'],
        allowed.length
          ? `Your loan must be repaid before you turn ${MAX_AGE_AT_MATURITY}. Choose ${formatTenure(allowed[allowed.length - 1])} or less.`
          : `Your loan must be repaid before you turn ${MAX_AGE_AT_MATURITY}, and no ${product?.label ?? 'loan'} tenure fits. Try a different loan type.`,
      );
    }

    if (!loan.purpose) {
      fail(ctx, ['purpose'], 'Tell us what the loan is for.');
    } else if (product && !product.purposes.some((option) => option.value === loan.purpose)) {
      fail(ctx, ['purpose'], `Choose a purpose that applies to a ${product.label}.`);
    }

    if (loan.referralCode && !REFERRAL_CODE.test(loan.referralCode)) {
      fail(
        ctx,
        ['referralCode'],
        'Referral codes are 6–10 letters or numbers, with no spaces or symbols.',
      );
    }
  });
}
