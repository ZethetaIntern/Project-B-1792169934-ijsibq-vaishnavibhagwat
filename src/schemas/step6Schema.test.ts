import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { CoApplicantDetails, MaritalStatus } from '../types/application';
import { buildStep6Schema, getRelationshipOptions } from './step6Schema';

const SIGNATURE = 'data:image/png;base64,iVBORw0KGgo=';

const valid: CoApplicantDetails = {
  fullName: 'Ravi Verma',
  relationship: 'spouse',
  pan: 'BCDPV2345K',
  panVerified: true,
  monthlyIncome: 60_000,
  consent: true,
  signature: SIGNATURE,
};

function errors(coApplicant: Partial<CoApplicantDetails>, maritalStatus: MaritalStatus = 'married') {
  const application = createEmptyApplication();
  application.personal.fullName = 'Asha Verma';
  application.personal.maritalStatus = maritalStatus;
  application.kyc.pan = 'ABCPE1234F';
  const result = buildStep6Schema(application).safeParse({ ...valid, ...coApplicant });
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('relationship options (Step 2 → Step 6)', () => {
  it('offers Spouse first only for married applicants', () => {
    expect(getRelationshipOptions('married')).toEqual(['spouse', 'parent', 'sibling', 'businessPartner']);
    expect(getRelationshipOptions('single')).toEqual(['parent', 'sibling', 'businessPartner']);
  });

  it('rejects Spouse for an unmarried applicant', () => {
    expect(errors({}, 'single').relationship).toBe('Choose how your co-applicant is related to you.');
    expect(errors({ relationship: 'parent' }, 'single')).toEqual({});
  });
});

describe('step 6 schema', () => {
  it('accepts a complete, verified, consenting and signed co-applicant', () => {
    expect(errors({})).toEqual({});
  });

  it('requires a different person with their own verified individual PAN', () => {
    expect(errors({ fullName: 'asha verma' }).fullName).toMatch(/different person/);
    expect(errors({ pan: 'ABCPE1234F' }).pan).toMatch(/needs their own PAN/);
    expect(errors({ pan: 'BCDCV2345K' }).pan).toMatch(/Company PAN/);
    expect(errors({ panVerified: false }).pan).toMatch(/has not been verified yet/);
  });

  it('requires income, consent and a PNG signature', () => {
    expect(errors({ monthlyIncome: null, consent: false, signature: '' })).toEqual({
      monthlyIncome: "Enter your co-applicant's monthly income (0 if they have none).",
      consent: 'Your co-applicant must give their consent to continue.',
      signature: 'Your co-applicant needs to sign. Draw or type their signature, then select "Use this signature".',
    });
    expect(errors({ monthlyIncome: 0 })).toEqual({});
  });
});
