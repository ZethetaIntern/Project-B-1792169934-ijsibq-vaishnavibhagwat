import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { EmploymentDetails, LoanType } from '../types/application';
import { gstinCheckCharacter } from '../utils/validators';
import { buildStep5Schema } from './step5Schema';

const office = {
  line1: 'Unit 12, Peenya Industrial Area',
  line2: '',
  pinCode: '560001',
  city: 'Bengaluru',
  state: 'Karnataka',
  postOffice: '',
};

const empty = createEmptyApplication().employment;
const GSTIN = `29ABCPE1234F1Z${gstinCheckCharacter('29ABCPE1234F1Z')}`;

const salaried: EmploymentDetails = {
  ...empty,
  employmentType: 'salaried',
  yearsOfExperience: 6,
  companyName: 'Infosys',
  designation: 'Senior Engineer',
  monthlySalary: 95_000,
};

const owner: EmploymentDetails = {
  ...empty,
  employmentType: 'businessOwner',
  yearsOfExperience: 12,
  businessName: 'Verma Precision Tools',
  businessType: 'manufacturing',
  annualTurnover: 80_00_000,
  yearsInBusiness: 7,
  monthlyIncome: 2_10_000,
  officeAddress: office,
  gstNumber: GSTIN,
};

function run(employment: EmploymentDetails, loanType: LoanType = 'personal') {
  const application = createEmptyApplication();
  application.loan.loanType = loanType;
  return buildStep5Schema(application).safeParse(employment);
}

function errors(employment: EmploymentDetails, loanType: LoanType = 'personal') {
  const result = run(employment, loanType);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('step 5 schema (discriminated union)', () => {
  it('requires an employment type', () => {
    expect(errors(empty)).toEqual({ employmentType: 'Choose how you earn your income.' });
  });

  it('accepts a salaried profile and strips other branches', () => {
    const result = run({ ...salaried, businessName: 'Leftover Ltd', gstNumber: GSTIN });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('businessName');
    expect(result.data).not.toHaveProperty('gstNumber');
  });

  it('applies salaried rules', () => {
    expect(errors({ ...salaried, monthlySalary: 14_999 }).monthlySalary).toBe('The minimum monthly salary for a loan is ₹15,000.');
    expect(errors({ ...salaried, companyName: '', designation: '' })).toEqual({
      companyName: 'Enter the company name.',
      designation: 'Enter your job title.',
    });
  });

  it('validates each previous employer and checks they fit within total experience', () => {
    const wipro = { companyName: 'Wipro', designation: 'Analyst', years: 2 };
    expect(errors({ ...salaried, previousEmployers: [wipro, { ...wipro, companyName: 'TCS', years: 3 }] })).toEqual({});
    expect(errors({ ...salaried, previousEmployers: [{ companyName: '', designation: '', years: null }] })).toEqual({
      'previousEmployers.0.companyName': 'Enter the company name.',
      'previousEmployers.0.designation': 'Enter the job title you held.',
      'previousEmployers.0.years': 'Enter your time at that company in whole years.',
    });
    const tooLong = [{ ...wipro, years: 4 }, { ...wipro, years: 3 }];
    expect(errors({ ...salaried, previousEmployers: tooLong }).yearsOfExperience).toBe('Your previous jobs add up to 7 years, more than the 6 years of total experience entered.');
    const four = Array(4).fill({ ...wipro, years: 1 });
    expect(errors({ ...salaried, previousEmployers: four }).previousEmployers).toBe('List up to 3 previous employers.');
  });

  it('accepts a business owner with a valid GSTIN and strips salaried fields', () => {
    const result = run({
      ...owner, companyName: 'Infosys', monthlySalary: 50_000, previousEmployers: [{ companyName: 'Wipro', designation: 'Analyst', years: 2 }],
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('companyName');
    expect(result.data).not.toHaveProperty('previousEmployers');
  });

  it('applies business rules: turnover ≥ ₹3L, ≥ 2 years, GSTIN, office address', () => {
    const problems = errors({
      ...owner, annualTurnover: 2_00_000, yearsInBusiness: 1, gstNumber: '29ABCPE1234F1Z0', officeAddress: { ...office, line1: '' },
    });
    expect(problems.annualTurnover).toBe('Annual turnover must be at least ₹3,00,000.');
    expect(problems.yearsInBusiness).toBe('Time in business must be at least 2 years (and at most 50).');
    expect(problems.gstNumber).toMatch(/checksum/);
    expect(problems['officeAddress.line1']).toMatch(/office or business address/);
  });

  it('does not ask self-employed applicants for a GSTIN', () => {
    expect(errors({ ...owner, employmentType: 'selfEmployed', gstNumber: '' })).toEqual({});
  });

  it('requires a non-salaried profile for Business Loans (Step 1 → Step 5)', () => {
    expect(errors(salaried, 'business').employmentType).toMatch(/Business Loans are for the self-employed/);
    expect(errors(owner, 'business')).toEqual({});
    expect(errors({ ...owner, employmentType: 'selfEmployed' }, 'business')).toEqual({});
  });
});
