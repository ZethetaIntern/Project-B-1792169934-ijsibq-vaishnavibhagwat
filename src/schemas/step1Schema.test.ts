import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData, LoanDetails } from '../types/application';
import { isStepComplete } from './schemaFactory';
import { buildStep1Schema, getAgeTenureLimit, getAllowedTenures } from './step1Schema';

const today = new Date(2026, 9, 13);

function withLoan(loan: Partial<LoanDetails>, dateOfBirth = ''): ApplicationData {
  const application = createEmptyApplication();
  application.loan = { ...application.loan, ...loan };
  application.personal.dateOfBirth = dateOfBirth;
  return application;
}

function errorsFor(application: ApplicationData): Record<string, string> {
  const result = buildStep1Schema(application, today).safeParse(application.loan);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

const validPersonal: Partial<LoanDetails> = {
  loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36, purpose: 'medical',
};

describe('step 1 schema', () => {
  it('accepts a complete personal loan', () => {
    expect(errorsFor(withLoan(validPersonal))).toEqual({});
    expect(isStepComplete('loan', withLoan(validPersonal))).toBe(true);
  });

  it('reports every missing field with a specific message', () => {
    expect(errorsFor(createEmptyApplication())).toEqual({
      loanType: 'Choose the type of loan you need.',
      loanAmount: 'Enter the amount you would like to borrow.',
      tenureMonths: 'Choose how long you would like to repay over.',
      purpose: 'Tell us what the loan is for.',
    });
  });

  it('applies the minimum and the per-product maximum amount', () => {
    expect(errorsFor(withLoan({ ...validPersonal, loanAmount: 49_999 })).loanAmount)
      .toBe('The minimum loan amount is ₹50,000.');
    expect(errorsFor(withLoan({ ...validPersonal, loanAmount: 10_00_001 })).loanAmount)
      .toBe('Personal Loans go up to ₹10,00,000. Enter a smaller amount.');
    expect(errorsFor(withLoan({
      loanType: 'home', loanAmount: 1_00_00_000, tenureMonths: 240, purpose: 'ready-property',
    }))).toEqual({});
    expect(errorsFor(withLoan({
      loanType: 'business', loanAmount: 50_00_001, tenureMonths: 60, purpose: 'equipment',
    })).loanAmount).toMatch(/up to ₹50,00,000/);
  });

  it('restricts tenure and purpose to the selected product', () => {
    const errors = errorsFor(withLoan({ ...validPersonal, tenureMonths: 120, purpose: 'ready-property' }));
    expect(errors.tenureMonths).toBe('Choose a tenure between 12 and 60 months for a Personal Loan.');
    expect(errors.purpose).toBe('Choose a purpose that applies to a Personal Loan.');
  });

  it('validates the optional referral code only when provided', () => {
    expect(errorsFor(withLoan({ ...validPersonal, referralCode: 'AB12' })).referralCode).toMatch(/6–10 letters/);
    expect(errorsFor(withLoan({ ...validPersonal, referralCode: 'FRIEND2026' }))).toEqual({});
    expect(errorsFor(withLoan({ ...validPersonal, referralCode: '   ' }))).toEqual({});
  });
});

describe('date of birth → maximum tenure (Step 2 → Step 1)', () => {
  it('caps tenure so the loan ends by age 65', () => {
    // Turns 65 on 13 Oct 2046 → at most 240 months from 13 Oct 2026.
    const application = withLoan({
      loanType: 'home', loanAmount: 40_00_000, tenureMonths: 300, purpose: 'ready-property',
    }, '1981-10-13');
    expect(getAgeTenureLimit(application, today)).toBe(240);
    expect(errorsFor(application).tenureMonths)
      .toBe('Your loan must be repaid before you turn 65. Choose 20 years or less.');
    application.loan.tenureMonths = 240;
    expect(errorsFor(application)).toEqual({});
  });

  it('explains when no tenure of the product fits', () => {
    const application = withLoan({
      loanType: 'home', loanAmount: 40_00_000, tenureMonths: 60, purpose: 'ready-property',
    }, '1962-06-01');
    expect(errorsFor(application).tenureMonths).toMatch(/no Home Loan tenure fits/);
  });

  it('filters tenure options by the age limit', () => {
    expect(getAllowedTenures('personal', 30)).toEqual([12, 18, 24, 30]);
    expect(getAllowedTenures('personal', null)).toHaveLength(9);
  });
});
