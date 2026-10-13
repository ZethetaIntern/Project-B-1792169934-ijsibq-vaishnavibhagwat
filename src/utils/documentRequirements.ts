import { DOCUMENT_ORDER, DOCUMENT_SPECS, type DocumentSpec } from '../constants/documents';
import { LOAN_PRODUCTS } from '../constants/loan';
import type {
  ApplicationData, DocumentTypeId, UploadedDocument,
} from '../types/application';

export interface DocumentRequirement {
  spec: DocumentSpec;
  required: boolean;
  /** Why this document is requested (or optional), shown beside it. */
  reason: string;
}

type Rule = (application: ApplicationData) => { required: boolean; reason: string } | null;

const always = (reason: string): Rule => () => ({ required: true, reason });

/**
 * Which documents apply, and why. Encodes three cross-step dependencies:
 * Step 1 loan type → property / business documents, Step 5 employment type →
 * salary slips or ITR, and Step 3 PAN verified → PAN copy becomes optional.
 * A rule returning `null` means the document is not part of this application.
 */
const RULES: Record<DocumentTypeId, Rule> = {
  panCard: ({ kyc }) => (kyc.panVerified
    ? { required: false, reason: 'Optional — your PAN was verified in Step 3.' }
    : { required: true, reason: 'Needed because your PAN has not been verified yet.' }),
  aadhaarCard: always('Proof of identity and address for every applicant.'),
  salarySlips: ({ employment }) => (employment.employmentType === 'salaried'
    ? { required: true, reason: 'Because you are salaried.' }
    : null),
  bankStatements: always('Shows your income and existing commitments.'),
  itr: ({ employment }) => {
    if (employment.employmentType === 'selfEmployed') {
      return { required: true, reason: 'Because you are self-employed.' };
    }
    if (employment.employmentType === 'businessOwner') {
      return { required: true, reason: 'Because you run a business.' };
    }
    return null;
  },
  propertyDocuments: ({ loan }) => (loan.loanType === 'home'
    ? { required: true, reason: `Needed for every ${LOAN_PRODUCTS.home.label}.` }
    : null),
  businessRegistration: ({ loan }) => (loan.loanType === 'business'
    ? { required: true, reason: `Needed for every ${LOAN_PRODUCTS.business.label}.` }
    : null),
  gstReturns: ({ loan }) => (loan.loanType === 'business'
    ? { required: true, reason: `Needed for every ${LOAN_PRODUCTS.business.label}.` }
    : null),
  photograph: always('Used on your loan agreement.'),
};

/** The documents this application needs, in checklist order. */
export function getDocumentRequirements(application: ApplicationData): DocumentRequirement[] {
  return DOCUMENT_ORDER.flatMap((id) => {
    const outcome = RULES[id](application);
    return outcome ? [{ spec: DOCUMENT_SPECS[id], ...outcome }] : [];
  });
}

const isImage = (file: UploadedDocument) => file.mimeType.startsWith('image/');

/**
 * Whether the uploaded files satisfy the document. Aadhaar needs both sides: either
 * one PDF (assumed to hold both) or at least two images.
 */
export function isDocumentProvided(
  id: DocumentTypeId,
  files: readonly UploadedDocument[],
): boolean {
  if (id === 'aadhaarCard') {
    return files.some((file) => !isImage(file)) || files.filter(isImage).length >= 2;
  }
  return files.length > 0;
}

export type ChecklistStatus = 'pending' | 'uploaded' | 'verified' | 'optional';

/**
 * Checklist state: pending (missing or incomplete), uploaded (received, simulated
 * check still running), verified (every file checked), optional (not needed).
 */
export function getChecklistStatus(
  requirement: DocumentRequirement,
  files: readonly UploadedDocument[] = [],
): ChecklistStatus {
  if (!isDocumentProvided(requirement.spec.id, files)) {
    return requirement.required || files.length > 0 ? 'pending' : 'optional';
  }
  return files.every((file) => file.verified) ? 'verified' : 'uploaded';
}

/** Required documents that are still missing — used for submit gating on Step 8. */
export function getMissingDocuments(application: ApplicationData): DocumentRequirement[] {
  const { files } = application.documents;
  return getDocumentRequirements(application).filter(
    (requirement) => requirement.required
      && !isDocumentProvided(requirement.spec.id, files[requirement.spec.id] ?? []),
  );
}
