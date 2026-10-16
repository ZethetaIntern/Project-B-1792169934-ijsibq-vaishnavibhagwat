import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData } from '../types/application';
import { buildReviewSections, formatAddress } from './reviewSummary';

const ADDRESS = {
  line1: 'Flat 4B, Lotus Residency', line2: 'MG Road', pinCode: '560001', city: 'Bengaluru', state: 'Karnataka', postOffice: '',
};

function application(): ApplicationData {
  const data = createEmptyApplication();
  data.loan = {
    loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36, purpose: 'medical', referralCode: '',
  };
  data.personal = {
    ...data.personal,
    fullName: 'Asha Verma',
    dateOfBirth: '1992-04-18',
    gender: 'female',
    maritalStatus: 'married',
    mobile: '9876543210',
    mobileVerified: true,
  };
  data.kyc = {
    ...data.kyc, pan: 'ABCPE1234F', panVerified: true, aadhaar: '234567890124', aadhaarConsent: true,
  };
  data.address = {
    ...data.address, current: ADDRESS, residenceType: 'rented', monthlyRent: 18_000, yearsAtCurrentAddress: 0, previous: ADDRESS,
  };
  data.employment = {
    ...data.employment, employmentType: 'salaried', companyName: 'Infosys', monthlySalary: 95_000, yearsOfExperience: 6,
  };
  return data;
}

const section = (data: ApplicationData, stepId: string) => buildReviewSections(data)
  .find((item) => item.stepId === stepId);
const item = (data: ApplicationData, stepId: string, label: string) => section(data, stepId)
  ?.items.find((entry) => entry.label === label);

describe('buildReviewSections', () => {
  it('lists every active step except review, in flow order', () => {
    expect(buildReviewSections(application()).map((entry) => entry.stepId))
      .toEqual(['loan', 'personal', 'kyc', 'address', 'employment', 'documents']);
    const withCoApplicant = application();
    withCoApplicant.loan.loanAmount = 8_00_000;
    expect(buildReviewSections(withCoApplicant).map((entry) => entry.stepId)).toContain('coApplicant');
  });

  it('formats loan values for people, not machines', () => {
    const data = application();
    expect(item(data, 'loan', 'Amount')?.value).toBe('₹3,00,000');
    expect(item(data, 'loan', 'Tenure')?.value).toBe('3 years');
    expect(item(data, 'loan', 'Purpose')?.value).toBe('Medical expenses');
    expect(item(data, 'loan', 'Referral code')).toBeUndefined();
  });

  it('masks identity numbers and incomes but keeps the real value for reveal', () => {
    const data = application();
    expect(item(data, 'kyc', 'PAN')).toMatchObject({ value: 'ABCPE1234F', masked: '••••••234F', verified: true });
    expect(item(data, 'kyc', 'Aadhaar')).toMatchObject({ value: '2345 6789 0124', masked: '•••• •••• 0124' });
    expect(item(data, 'employment', 'Monthly net salary')).toMatchObject({ value: '₹95,000', masked: '₹••••5,000' });
  });

  it('includes conditional rows only when they apply', () => {
    const data = application();
    expect(item(data, 'address', 'Monthly rent')?.value).toBe('₹18,000');
    expect(item(data, 'address', 'Previous address')?.value).toBe(formatAddress(ADDRESS));
    expect(item(data, 'address', 'Years at this address')?.value).toBe('Less than a year');

    expect(item(data, 'employment', 'Previous employer 1')).toBeUndefined();
    data.employment.previousEmployers = [
      { companyName: 'Wipro', designation: 'Analyst', years: 2 },
      { companyName: 'TCS', designation: 'Trainee', years: 0 },
    ];
    expect(item(data, 'employment', 'Previous employer 1')?.value).toBe('Wipro, Analyst (2 years)');
    expect(item(data, 'employment', 'Previous employer 2')?.value).toBe('TCS, Trainee (less than a year)');

    data.address.residenceType = 'owned';
    data.address.yearsAtCurrentAddress = 5;
    expect(item(data, 'address', 'Monthly rent')).toBeUndefined();
    expect(item(data, 'address', 'Previous address')).toBeUndefined();
  });

  it('shows document status per requirement', () => {
    const data = application();
    data.documents.files.bankStatements = [{
      id: '1', name: 'hdfc.pdf', mimeType: 'application/pdf', originalSize: 1, size: 1, compressed: false, uploadedAt: '', verified: true,
    }];
    expect(item(data, 'documents', 'Bank statements')?.value).toBe('hdfc.pdf');
    expect(item(data, 'documents', 'Salary slips')?.value).toBe('Missing');
    expect(item(data, 'documents', 'PAN card')?.value).toBe('Not provided (optional)');
  });

  it('joins address parts and skips empty ones', () => {
    expect(formatAddress({ ...ADDRESS, line2: '' })).toBe('Flat 4B, Lotus Residency, Bengaluru, Karnataka 560001');
  });
});
