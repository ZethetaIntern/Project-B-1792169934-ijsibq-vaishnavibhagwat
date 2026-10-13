import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type {
  ApplicationData, DocumentDetails, EmploymentType, LoanType, UploadedDocument,
} from '../types/application';
import { buildStep7Schema, getReferencedFileIds } from './step7Schema';

const SIGNATURE = 'data:image/png;base64,iVBORw0KGgo=';

let counter = 0;
function file(mimeType = 'application/pdf'): UploadedDocument {
  counter += 1;
  return {
    id: `file-${counter}`,
    name: `file-${counter}`,
    mimeType,
    originalSize: 100,
    size: 100,
    compressed: false,
    uploadedAt: '2026-10-13T10:00:00.000Z',
    verified: true,
  };
}

function application(loanType: LoanType, employmentType: EmploymentType, panVerified = true) {
  const data = createEmptyApplication();
  data.loan.loanType = loanType;
  data.employment.employmentType = employmentType;
  data.kyc.panVerified = panVerified;
  return data;
}

const completePersonalSalaried = (): DocumentDetails => ({
  files: {
    aadhaarCard: [file()],
    salarySlips: [file()],
    bankStatements: [file()],
    photograph: [file('image/jpeg')],
  },
  signature: SIGNATURE,
  signatureMethod: 'draw',
});

function parse(data: ApplicationData, documents: DocumentDetails) {
  return buildStep7Schema(data).safeParse(documents);
}

function errors(data: ApplicationData, documents: DocumentDetails) {
  const result = parse(data, documents);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('step 7 schema', () => {
  it('accepts a complete Personal + Salaried set without the optional PAN copy', () => {
    expect(errors(application('personal', 'salaried'), completePersonalSalaried())).toEqual({});
  });

  it('requires the PAN copy when the PAN was not verified', () => {
    expect(errors(application('personal', 'salaried', false), completePersonalSalaried())).toEqual({
      'files.panCard': 'Upload your PAN card.',
    });
  });

  it('asks for the documents of a Business Loan by a business owner', () => {
    const documents = { ...completePersonalSalaried(), files: {} };
    expect(Object.keys(errors(application('business', 'businessOwner'), documents))).toEqual([
      'files.aadhaarCard',
      'files.bankStatements',
      'files.itr',
      'files.businessRegistration',
      'files.gstReturns',
      'files.photograph',
    ]);
  });

  it('explains a missing Aadhaar side', () => {
    const documents = completePersonalSalaried();
    documents.files.aadhaarCard = [file('image/jpeg')];
    expect(errors(application('personal', 'salaried'), documents)).toEqual({
      'files.aadhaarCard': 'Add the other side of your Aadhaar card, or upload one PDF with both sides.',
    });
  });

  it('requires a confirmed PNG signature', () => {
    const documents = { ...completePersonalSalaried(), signature: '' };
    expect(errors(application('personal', 'salaried'), documents).signature).toMatch(/Sign the application/);
  });

  it('drops files for documents that no longer apply', () => {
    const data = application('personal', 'selfEmployed');
    const documents = completePersonalSalaried();
    documents.files.itr = [file()];
    const result = parse(data, documents);
    expect(result.success).toBe(true);
    expect(Object.keys(result.data?.files ?? {})).toEqual(['aadhaarCard', 'bankStatements', 'photograph', 'itr']);
  });

  it('collects every referenced file id, including the address proof', () => {
    const data = application('personal', 'salaried');
    data.documents = completePersonalSalaried();
    const proof = file();
    data.address.addressProof = [proof];
    const ids = getReferencedFileIds(data);
    expect(ids.size).toBe(5);
    expect(ids.has(proof.id)).toBe(true);
  });
});
