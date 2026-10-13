import { describe, expect, it } from 'vitest';
import { describeRules, DOCUMENT_SPECS, toAcceptMap } from '../constants/documents';
import { createEmptyApplication } from '../store/initialApplication';
import type {
  ApplicationData, EmploymentType, LoanType, UploadedDocument,
} from '../types/application';
import {
  getChecklistStatus,
  getDocumentRequirements,
  getMissingDocuments,
  isDocumentProvided,
} from './documentRequirements';

function application(
  loanType: LoanType,
  employmentType: EmploymentType,
  panVerified = false,
): ApplicationData {
  const data = createEmptyApplication();
  data.loan.loanType = loanType;
  data.employment.employmentType = employmentType;
  data.kyc.panVerified = panVerified;
  return data;
}

function file(mimeType: string, verified = true): UploadedDocument {
  return {
    id: crypto.randomUUID(),
    name: mimeType === 'application/pdf' ? 'doc.pdf' : 'photo.jpg',
    mimeType,
    originalSize: 1000,
    size: 1000,
    compressed: false,
    uploadedAt: new Date().toISOString(),
    verified,
  };
}

const ids = (data: ApplicationData) => getDocumentRequirements(data).map((item) => item.spec.id);

describe('document requirements (Step 1 / 3 / 5 → Step 7)', () => {
  it.each([
    ['personal', 'salaried', ['panCard', 'aadhaarCard', 'salarySlips', 'bankStatements', 'photograph']],
    ['personal', 'selfEmployed', ['panCard', 'aadhaarCard', 'bankStatements', 'itr', 'photograph']],
    ['home', 'salaried', ['panCard', 'aadhaarCard', 'salarySlips', 'bankStatements', 'propertyDocuments', 'photograph']],
    ['home', 'businessOwner', ['panCard', 'aadhaarCard', 'bankStatements', 'itr', 'propertyDocuments', 'photograph']],
    ['business', 'businessOwner', ['panCard', 'aadhaarCard', 'bankStatements', 'itr', 'businessRegistration', 'gstReturns', 'photograph']],
    ['business', 'selfEmployed', ['panCard', 'aadhaarCard', 'bankStatements', 'itr', 'businessRegistration', 'gstReturns', 'photograph']],
  ] as const)('%s loan + %s asks for the right documents', (loanType, employmentType, expected) => {
    expect(ids(application(loanType, employmentType))).toEqual(expected);
  });

  it('makes the PAN copy optional once the PAN is verified', () => {
    const [pan] = getDocumentRequirements(application('personal', 'salaried', true));
    expect(pan.spec.id).toBe('panCard');
    expect(pan.required).toBe(false);
    expect(pan.reason).toMatch(/verified in Step 3/);
    expect(getDocumentRequirements(application('personal', 'salaried'))[0].required).toBe(true);
  });

  it('lists only required documents that are still missing', () => {
    const data = application('personal', 'salaried', true);
    data.documents.files = {
      aadhaarCard: [file('application/pdf')],
      salarySlips: [file('application/pdf')],
    };
    expect(getMissingDocuments(data).map((item) => item.spec.id)).toEqual(['bankStatements', 'photograph']);
  });
});

describe('isDocumentProvided', () => {
  it('needs both sides of the Aadhaar card', () => {
    expect(isDocumentProvided('aadhaarCard', [file('image/jpeg')])).toBe(false);
    expect(isDocumentProvided('aadhaarCard', [file('image/jpeg'), file('image/png')])).toBe(true);
    expect(isDocumentProvided('aadhaarCard', [file('application/pdf')])).toBe(true);
  });

  it('accepts one file for other documents', () => {
    expect(isDocumentProvided('bankStatements', [])).toBe(false);
    expect(isDocumentProvided('bankStatements', [file('application/pdf')])).toBe(true);
  });
});

describe('getChecklistStatus', () => {
  const [pan, aadhaar] = getDocumentRequirements(application('personal', 'salaried'));
  const optionalPan = getDocumentRequirements(application('personal', 'salaried', true))[0];

  it('reports pending, uploaded, verified and optional', () => {
    expect(getChecklistStatus(pan, [])).toBe('pending');
    expect(getChecklistStatus(aadhaar, [file('image/jpeg')])).toBe('pending');
    expect(getChecklistStatus(pan, [file('image/jpeg', false)])).toBe('uploaded');
    expect(getChecklistStatus(pan, [file('image/jpeg')])).toBe('verified');
    expect(getChecklistStatus(optionalPan, [])).toBe('optional');
    expect(getChecklistStatus(optionalPan, [file('image/png')])).toBe('verified');
  });
});

describe('upload rule helpers', () => {
  it('describes limits in plain words', () => {
    expect(describeRules(DOCUMENT_SPECS.panCard)).toBe('PDF, JPG or PNG · up to 5 MB each · max 3 files');
    expect(describeRules(DOCUMENT_SPECS.bankStatements)).toBe('PDF only · up to 10 MB each · max 3 files');
    expect(describeRules(DOCUMENT_SPECS.photograph)).toBe('JPG or PNG · up to 2 MB · one file');
  });

  it('builds a react-dropzone accept map', () => {
    expect(toAcceptMap(['pdf', 'jpeg'])).toEqual({
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
    });
  });
});
