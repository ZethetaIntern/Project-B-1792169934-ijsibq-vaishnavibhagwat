import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData, ReviewConsents } from '../types/application';
import { buildStep8Schema, needsHighEmiAcknowledgement } from './step8Schema';

const ALL: ReviewConsents = {
  accuracy: true, creditCheck: true, terms: true, communication: true, highEmiAcknowledged: false,
};

function application(monthlySalary: number): ApplicationData {
  const data = createEmptyApplication();
  data.loan = {
    ...data.loan, loanType: 'personal', loanAmount: 5_00_000, tenureMonths: 36,
  };
  data.employment = { ...data.employment, employmentType: 'salaried', monthlySalary };
  return data;
}

function errors(data: ApplicationData, review: Partial<ReviewConsents>) {
  const result = buildStep8Schema(data).safeParse({ ...ALL, ...review });
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('step 8 schema', () => {
  it('requires each of the four consents separately', () => {
    expect(errors(application(95_000), {})).toEqual({});
    expect(errors(application(95_000), { creditCheck: false, communication: false })).toEqual({
      creditCheck: 'Authorise the credit bureau check to continue.',
      communication: 'Agree to receive messages about this application to continue.',
    });
  });

  it('asks for an extra acknowledgement only when EMI exceeds half the income', () => {
    // ₹16,251 EMI against ₹30,000 income = 54%.
    expect(needsHighEmiAcknowledgement(application(30_000))).toBe(true);
    expect(errors(application(30_000), {})).toEqual({
      highEmiAcknowledged: 'Acknowledge that your EMI is above half of your monthly income.',
    });
    expect(errors(application(30_000), { highEmiAcknowledged: true })).toEqual({});
    expect(needsHighEmiAcknowledgement(application(95_000))).toBe(false);
  });

  it('counts the co-applicant income and clears a stale acknowledgement', () => {
    const data = application(30_000);
    data.loan.loanAmount = 6_00_000; // co-applicant required above ₹5 lakh
    data.coApplicant.monthlyIncome = 40_000;
    expect(needsHighEmiAcknowledgement(data)).toBe(false);
    const parsed = buildStep8Schema(data).parse({ ...ALL, highEmiAcknowledged: true });
    expect(parsed.highEmiAcknowledged).toBe(false);
  });
});
