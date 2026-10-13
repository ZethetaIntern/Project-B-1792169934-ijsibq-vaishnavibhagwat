import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { KycDetails, LoanType } from '../types/application';
import { verhoeffCheckDigit } from '../utils/validators';
import { buildStep3Schema, isPassportFieldVisible } from './step3Schema';

const AADHAAR = `23456789012${verhoeffCheckDigit('23456789012')}`;

const validKyc: KycDetails = {
  pan: 'ABCPE1234F',
  panVerified: true,
  aadhaar: `${AADHAAR.slice(0, 4)} ${AADHAAR.slice(4, 8)} ${AADHAAR.slice(8)}`,
  aadhaarVerified: true,
  aadhaarConsent: true,
  voterId: '',
  passportNumber: '',
};

function parse(kyc: Partial<KycDetails>, loanType: LoanType = 'personal', loanAmount = 3_00_000) {
  const application = createEmptyApplication();
  application.loan = { ...application.loan, loanType, loanAmount };
  return buildStep3Schema(application).safeParse({ ...validKyc, ...kyc });
}

function errors(kyc: Partial<KycDetails>, loanType: LoanType = 'personal', loanAmount = 3_00_000) {
  const result = parse(kyc, loanType, loanAmount);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('step 3 schema', () => {
  it('accepts verified PAN and Aadhaar and stores Aadhaar as digits', () => {
    const result = parse({ pan: 'abcpe1234f' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ pan: 'ABCPE1234F', aadhaar: AADHAAR });
  });

  it('blocks progress until both numbers are verified and consent is given', () => {
    expect(errors({ panVerified: false, aadhaarVerified: false, aadhaarConsent: false })).toEqual({
      pan: 'Your PAN has not been verified yet. Select Retry to verify it.',
      aadhaar: 'Your Aadhaar has not been verified yet. Select Retry to verify it.',
      aadhaarConsent: 'Give your consent for Aadhaar-based verification to continue.',
    });
  });

  it('applies loan-specific PAN entity rules', () => {
    expect(errors({ pan: 'ABCCE1234F' }, 'personal').pan).toMatch(/Company PAN/);
    expect(errors({ pan: 'ABCCE1234F' }, 'business', 25_00_000)).toEqual({});
    expect(errors({ pan: 'ABCDE1234F' }).pan).toMatch(/4th character must indicate entity type/);
  });

  it('reports Aadhaar checksum failures', () => {
    expect(errors({ aadhaar: '234567890123' }).aadhaar).toMatch(/checksum|never start/);
  });

  it('validates optional IDs only when provided', () => {
    expect(errors({ voterId: 'ab12' }).voterId).toMatch(/3 letters followed by 7 digits/);
    expect(errors({ voterId: 'abc1234567' })).toEqual({});
  });

  it('only keeps a passport number for Home Loans above ₹50 lakh', () => {
    expect(isPassportFieldVisible({ ...createEmptyApplication().loan, loanType: 'home', loanAmount: 50_00_000 })).toBe(false);
    expect(isPassportFieldVisible({ ...createEmptyApplication().loan, loanType: 'home', loanAmount: 50_00_001 })).toBe(true);
    expect(parse({ passportNumber: 'K1234567' }, 'home', 40_00_000).data?.passportNumber).toBe('');
    expect(parse({ passportNumber: 'K1234567' }, 'home', 60_00_000).data?.passportNumber).toBe('K1234567');
    expect(errors({ passportNumber: 'K12' }, 'home', 60_00_000).passportNumber).toMatch(/1 letter followed by 7 digits/);
  });
});
