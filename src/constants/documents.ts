import type { DocumentTypeId } from '../types/application';

export const BYTES_PER_MB = 1024 * 1024;
/** Default per-file limit (A1.6); individual documents may allow more or less. */
export const MAX_FILE_SIZE_MB = 5;
/** No document type accepts more than three files. */
export const MAX_FILES_PER_DOCUMENT = 3;

export type FileFormat = 'pdf' | 'jpeg' | 'png';

export const FILE_FORMATS: Readonly<Record<FileFormat, {
  label: string; mimeType: string; extensions: readonly string[];
}>> = {
  pdf: { label: 'PDF', mimeType: 'application/pdf', extensions: ['.pdf'] },
  jpeg: { label: 'JPG', mimeType: 'image/jpeg', extensions: ['.jpg', '.jpeg'] },
  png: { label: 'PNG', mimeType: 'image/png', extensions: ['.png'] },
};

/** Upload constraints for one kind of document. */
export interface UploadRules {
  formats: readonly FileFormat[];
  maxSizeMb: number;
  maxFiles: number;
}

export interface DocumentSpec extends UploadRules {
  id: DocumentTypeId;
  label: string;
  /** The label as used mid-sentence ("Upload your bank statements"). */
  noun: string;
  /** What exactly to upload, in plain words. */
  hint: string;
}

const ANY_FORMAT: readonly FileFormat[] = ['pdf', 'jpeg', 'png'];
const PDF_ONLY: readonly FileFormat[] = ['pdf'];
const IMAGE_ONLY: readonly FileFormat[] = ['jpeg', 'png'];

/** Every document LendSwift may ask for (B2.1, Step 7), in checklist order. */
export const DOCUMENT_SPECS: Readonly<Record<DocumentTypeId, DocumentSpec>> = {
  panCard: {
    id: 'panCard',
    label: 'PAN card',
    noun: 'PAN card',
    hint: 'A clear copy of the front of your PAN card.',
    formats: ANY_FORMAT,
    maxSizeMb: 5,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  aadhaarCard: {
    id: 'aadhaarCard',
    label: 'Aadhaar card',
    noun: 'Aadhaar card',
    hint: 'Front and back — two images, or one PDF with both sides.',
    formats: ANY_FORMAT,
    maxSizeMb: 5,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  salarySlips: {
    id: 'salarySlips',
    label: 'Salary slips',
    noun: 'salary slips',
    hint: 'Your last 3 months — one PDF per month, or a single combined PDF.',
    formats: PDF_ONLY,
    maxSizeMb: 5,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  bankStatements: {
    id: 'bankStatements',
    label: 'Bank statements',
    noun: 'bank statements',
    hint: 'Your last 6 months from the account your income is paid into.',
    formats: PDF_ONLY,
    maxSizeMb: 10,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  itr: {
    id: 'itr',
    label: 'Income tax returns',
    noun: 'income tax returns',
    hint: 'ITR acknowledgements for the last 2 assessment years.',
    formats: PDF_ONLY,
    maxSizeMb: 5,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  propertyDocuments: {
    id: 'propertyDocuments',
    label: 'Property documents',
    noun: 'property documents',
    hint: 'Sale agreement, allotment letter or title deed for the property.',
    formats: PDF_ONLY,
    maxSizeMb: 10,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  businessRegistration: {
    id: 'businessRegistration',
    label: 'Business registration certificate',
    noun: 'business registration certificate',
    hint: 'Udyam, shop and establishment, partnership deed or incorporation certificate.',
    formats: PDF_ONLY,
    maxSizeMb: 5,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  gstReturns: {
    id: 'gstReturns',
    label: 'GST returns',
    noun: 'GST returns',
    hint: 'GSTR-3B for the last 4 quarters — combine them into up to 3 PDFs.',
    formats: PDF_ONLY,
    maxSizeMb: 5,
    maxFiles: MAX_FILES_PER_DOCUMENT,
  },
  photograph: {
    id: 'photograph',
    label: 'Passport-size photograph',
    noun: 'photograph',
    hint: 'A recent colour photo of your face on a plain background.',
    formats: IMAGE_ONLY,
    maxSizeMb: 2,
    maxFiles: 1,
  },
};

export const DOCUMENT_ORDER = Object.keys(DOCUMENT_SPECS) as DocumentTypeId[];

/** Proof of current address, collected on Step 4 (A3.3c). */
export const ADDRESS_PROOF_RULES: UploadRules = {
  formats: ANY_FORMAT,
  maxSizeMb: 5,
  maxFiles: MAX_FILES_PER_DOCUMENT,
};

/** "PDF, JPG or PNG" */
export function describeFormats(formats: readonly FileFormat[]): string {
  const labels = formats.map((format) => FILE_FORMATS[format].label);
  return labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`
    : labels[0] ?? '';
}

/** "PDF only · up to 10 MB each · max 3 files" */
export function describeRules(rules: UploadRules): string {
  const formats = rules.formats.length === 1
    ? `${describeFormats(rules.formats)} only`
    : describeFormats(rules.formats);
  const size = `up to ${rules.maxSizeMb} MB${rules.maxFiles > 1 ? ' each' : ''}`;
  const count = rules.maxFiles > 1 ? `max ${rules.maxFiles} files` : 'one file';
  return [formats, size, count].join(' · ');
}

/** Accept map in the shape react-dropzone and the file picker expect. */
export function toAcceptMap(formats: readonly FileFormat[]): Record<string, string[]> {
  return Object.fromEntries(formats.map((format) => [
    FILE_FORMATS[format].mimeType,
    [...FILE_FORMATS[format].extensions],
  ]));
}
