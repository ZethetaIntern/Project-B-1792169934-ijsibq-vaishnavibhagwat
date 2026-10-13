import { describe, expect, it } from 'vitest';
import { getActiveSteps } from '../constants/steps';
import { createScenario } from '../test/fixtures';
import type { ApplicationData, EmploymentType, LoanType } from '../types/application';
import { getApplicationEstimate, getCombinedMonthlyIncome } from '../utils/applicationMetrics';
import { toIsoDate } from '../utils/dates';
import { getDocumentRequirements } from '../utils/documentRequirements';
import { getNextStepId, getReturnToReviewTarget } from '../utils/wizardNavigation';
import { CROSS_STEP_DEPENDENCIES } from './dependencies';
import { getStepSchema, isStepComplete } from './schemaFactory';
import { getRelationshipOptions } from './step6Schema';
import { needsHighEmiAcknowledgement } from './step8Schema';

const stepIds = (data: ApplicationData) => getActiveSteps(data).map((step) => step.id);
const documentIds = (data: ApplicationData) => getDocumentRequirements(data)
  .map((requirement) => requirement.spec.id);
const firstError = (stepId: Parameters<typeof getStepSchema>[0], data: ApplicationData) => {
  const result = getStepSchema(stepId, data).safeParse(data[stepId]);
  return result.success ? null : result.error.issues[0];
};

describe('the dependency registry', () => {
  it('lists all 14 dependencies from the brief, numbered 1–14', () => {
    expect(CROSS_STEP_DEPENDENCIES.map((dependency) => dependency.id))
      .toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
  });
});

describe('the six loan × employment combinations', () => {
  const COMBINATIONS: [LoanType, EmploymentType, string[]][] = [
    ['personal', 'salaried', ['salarySlips']],
    ['personal', 'selfEmployed', ['itr']],
    ['home', 'salaried', ['salarySlips', 'propertyDocuments']],
    ['home', 'businessOwner', ['itr', 'propertyDocuments']],
    ['business', 'businessOwner', ['itr', 'businessRegistration', 'gstReturns']],
    ['business', 'selfEmployed', ['itr', 'businessRegistration', 'gstReturns']],
  ];

  it.each(COMBINATIONS)('%s + %s is valid end to end with the right documents', (loanType, employmentType, specific) => {
    const data = createScenario(loanType, employmentType);
    const steps = stepIds(data).filter((id) => id !== 'review');
    steps.forEach((id) => expect({ id, issue: firstError(id, data) }).toEqual({ id, issue: null }));
    expect(steps.includes('coApplicant')).toBe(loanType === 'home');
    expect(documentIds(data)).toEqual(expect.arrayContaining(['aadhaarCard', 'bankStatements', 'photograph', ...specific]));
  });
});

describe('each dependency', () => {
  it('1 · Business Loans reject a salaried profile', () => {
    const data = createScenario('business', 'selfEmployed');
    expect(isStepComplete('employment', data)).toBe(true);
    data.employment = createScenario('personal', 'salaried').employment;
    expect(firstError('employment', data)?.message).toMatch(/Business Loans are for the self-employed/);
  });

  it('2 · Home Loans always include the co-applicant step', () => {
    const data = createScenario('home', 'salaried');
    data.loan.loanAmount = 5_00_000;
    expect(stepIds(data)).toContain('coApplicant');
  });

  it('3 · loan type changes the document list', () => {
    expect(documentIds(createScenario('personal', 'salaried'))).not.toContain('propertyDocuments');
    expect(documentIds(createScenario('home', 'salaried'))).toContain('propertyDocuments');
    expect(documentIds(createScenario('business', 'selfEmployed'))).toEqual(expect.arrayContaining(['businessRegistration', 'gstReturns']));
  });

  it('4 · amount thresholds are exclusive: ₹5,00,000 hides Step 6, ₹5,00,001 shows it', () => {
    const data = createScenario('personal', 'salaried');
    data.loan.loanAmount = 5_00_000;
    expect(stepIds(data)).not.toContain('coApplicant');
    data.loan.loanAmount = 5_00_001;
    expect(stepIds(data)).toContain('coApplicant');
    data.loan = { ...createScenario('business', 'selfEmployed').loan, loanAmount: 20_00_000 };
    expect(stepIds(data)).not.toContain('coApplicant');
    data.loan.loanAmount = 20_00_001;
    expect(stepIds(data)).toContain('coApplicant');
  });

  it('5 and 6 · amount and tenure drive the EMI in the key facts', () => {
    const data = createScenario('personal', 'salaried');
    const base = getApplicationEstimate(data).estimate?.emi ?? 0;
    data.loan.loanAmount = 6_00_000;
    expect(getApplicationEstimate(data).estimate?.emi).toBeGreaterThan(base);
    data.loan.loanAmount = 3_00_000;
    data.loan.tenureMonths = 60;
    expect(getApplicationEstimate(data).estimate?.emi).toBeLessThan(base);
  });

  it('7 · date of birth caps the tenure so the loan ends by 65', () => {
    const data = createScenario('home', 'salaried');
    const today = new Date();
    const birthday = new Date(today.getFullYear() - 55, today.getMonth(), today.getDate());
    data.personal.dateOfBirth = toIsoDate(birthday);
    data.loan.tenureMonths = 240; // would end at 75
    expect(firstError('loan', data)?.message).toMatch(/repaid before you turn 65/);
    data.loan.tenureMonths = 120;
    expect(firstError('loan', data)).toBeNull();
  });

  it('8 · marital status decides whether Spouse is offered', () => {
    const data = createScenario('home', 'salaried');
    expect(getRelationshipOptions(data.personal.maritalStatus)[0]).toBe('spouse');
    data.personal.maritalStatus = 'single';
    expect(firstError('coApplicant', data)?.path).toEqual(['relationship']);
  });

  it('9 · a verified PAN makes the PAN copy optional', () => {
    const data = createScenario('personal', 'salaried');
    expect(getDocumentRequirements(data)[0]).toMatchObject({ required: false });
    data.kyc.panVerified = false;
    expect(getDocumentRequirements(data)[0]).toMatchObject({ required: true });
  });

  it('10 · renting requires the rent, which counts in affordability', () => {
    const data = createScenario('personal', 'salaried');
    data.address.residenceType = 'rented';
    expect(firstError('address', data)?.path).toEqual(['monthlyRent']);
    const before = getApplicationEstimate(data).affordability?.obligationRatio ?? 0;
    data.address.monthlyRent = 20_000;
    expect(firstError('address', data)).toBeNull();
    expect(getApplicationEstimate(data).affordability?.obligationRatio).toBeGreaterThan(before);
  });

  it('11 · switching employment type clears the abandoned branch', () => {
    const data = createScenario('personal', 'selfEmployed');
    data.employment = {
      ...data.employment, employmentType: 'salaried', companyName: 'Infosys', designation: 'Engineer', monthlySalary: 80_000,
    };
    const parsed = getStepSchema('employment', data).parse(data.employment) as Record<string, unknown>;
    expect(parsed.businessName).toBeUndefined();
    expect(parsed.companyName).toBe('Infosys');
  });

  it('12 · salaried applicants upload salary slips, others ITR', () => {
    expect(documentIds(createScenario('personal', 'salaried'))).toContain('salarySlips');
    expect(documentIds(createScenario('personal', 'selfEmployed'))).toEqual(expect.not.arrayContaining(['salarySlips']));
    expect(documentIds(createScenario('personal', 'selfEmployed'))).toContain('itr');
  });

  it('13 · an EMI above half the income needs an acknowledgement', () => {
    const data = createScenario('personal', 'salaried');
    expect(needsHighEmiAcknowledgement(data)).toBe(false);
    data.employment.monthlySalary = 18_000;
    expect(needsHighEmiAcknowledgement(data)).toBe(true);
  });

  it('14 · the co-applicant income is added to the applicant income', () => {
    const data = createScenario('home', 'salaried');
    expect(getCombinedMonthlyIncome(data)).toBe(95_000 + 60_000);
    data.loan = createScenario('personal', 'salaried').loan; // co-applicant no longer needed
    expect(getCombinedMonthlyIncome(data)).toBe(95_000);
  });
});

describe('changing an earlier answer after reaching later steps', () => {
  it('inserts Step 6 when a Personal Loan is raised from ₹3 lakh to ₹8 lakh at Step 5', () => {
    const data = createScenario('personal', 'salaried');
    expect(getNextStepId('employment', data)).toBe('documents');
    data.loan.loanAmount = 8_00_000;
    expect(getNextStepId('employment', data)).toBe('coApplicant');
    expect(getReturnToReviewTarget(data)).toBe('coApplicant');
  });

  it('sends a Personal → Business switch back to the steps that now fail', () => {
    const data = createScenario('personal', 'salaried');
    data.loan = createScenario('business', 'salaried').loan;
    expect(isStepComplete('loan', data)).toBe(true);
    expect(getReturnToReviewTarget(data)).toBe('employment');
  });
});
