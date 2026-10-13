/**
 * The LendSwift application data model.
 *
 * Every step owns one slice of `ApplicationData`. Slices are stored in a flat,
 * serialisable shape (no class instances, no File objects) so the whole application
 * can be validated by Zod, encrypted and written to storage as JSON.
 *
 * Empty choices are represented by `''` and empty numbers by `null` so React Hook
 * Form can bind them directly to inputs without `undefined` ↔ controlled warnings.
 */

export type LoanType = 'personal' | 'home' | 'business';
export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type ResidenceType = 'owned' | 'rented' | 'company' | 'family';
export type EmploymentType = 'salaried' | 'selfEmployed' | 'businessOwner';
export type Relationship = 'spouse' | 'parent' | 'sibling' | 'businessPartner';
export type SignatureMethod = 'draw' | 'type';

/** Step 1 — loan selection. */
export interface LoanDetails {
  loanType: LoanType | '';
  loanAmount: number | null;
  tenureMonths: number | null;
  purpose: string;
  referralCode: string;
}

/** Step 2 — applicant's personal information. */
export interface PersonalDetails {
  fullName: string;
  /** ISO date string (YYYY-MM-DD) from the native date input. */
  dateOfBirth: string;
  gender: Gender | '';
  maritalStatus: MaritalStatus | '';
  fatherName: string;
  motherName: string;
  email: string;
  emailVerified: boolean;
  mobile: string;
  mobileVerified: boolean;
  alternateMobile: string;
}

/** Step 3 — identity verification (KYC). Verification is simulated client-side. */
export interface KycDetails {
  pan: string;
  panVerified: boolean;
  aadhaar: string;
  aadhaarVerified: boolean;
  aadhaarConsent: boolean;
  voterId: string;
  passportNumber: string;
}

export interface PostalAddress {
  line1: string;
  line2: string;
  pinCode: string;
  city: string;
  state: string;
  postOffice: string;
}

/** Metadata for an uploaded file. The binary itself lives in the document vault. */
export interface UploadedDocument {
  id: string;
  name: string;
  mimeType: string;
  originalSize: number;
  size: number;
  compressed: boolean;
  uploadedAt: string;
}

/** Step 4 — current, previous and permanent address. */
export interface AddressDetails {
  current: PostalAddress;
  residenceType: ResidenceType | '';
  monthlyRent: number | null;
  yearsAtCurrentAddress: number | null;
  previous: PostalAddress;
  permanentSameAsCurrent: boolean;
  permanent: PostalAddress;
  addressProof: UploadedDocument[];
}

/**
 * Step 5 — employment and income. Stored flat; the Zod schema is a discriminated
 * union on `employmentType`, so only the active branch survives validation.
 */
export interface EmploymentDetails {
  employmentType: EmploymentType | '';
  yearsOfExperience: number | null;
  // Salaried
  companyName: string;
  designation: string;
  monthlySalary: number | null;
  // Self-employed and business owner
  businessName: string;
  businessType: string;
  annualTurnover: number | null;
  yearsInBusiness: number | null;
  monthlyIncome: number | null;
  officeAddress: PostalAddress;
  // Business owner
  gstNumber: string;
}

/** Step 6 — co-applicant (conditional). */
export interface CoApplicantDetails {
  fullName: string;
  relationship: Relationship | '';
  pan: string;
  panVerified: boolean;
  monthlyIncome: number | null;
  consent: boolean;
  signature: string;
}

export type DocumentTypeId = | 'panCard'
  | 'aadhaarCard'
  | 'salarySlips'
  | 'bankStatements'
  | 'itr'
  | 'propertyDocuments'
  | 'businessRegistration'
  | 'gstReturns'
  | 'photograph';

/** Step 7 — documents and e-signature. */
export interface DocumentDetails {
  files: Partial<Record<DocumentTypeId, UploadedDocument[]>>;
  /** PNG data URL exported from the signature canvas. */
  signature: string;
  signatureMethod: SignatureMethod | '';
}

/** Step 8 — the four separate consents required before submission. */
export interface ReviewConsents {
  accuracy: boolean;
  creditCheck: boolean;
  terms: boolean;
  communication: boolean;
  /** Extra acknowledgement, only required when EMI exceeds 50% of income. */
  highEmiAcknowledged: boolean;
}

export interface ApplicationData {
  loan: LoanDetails;
  personal: PersonalDetails;
  kyc: KycDetails;
  address: AddressDetails;
  employment: EmploymentDetails;
  coApplicant: CoApplicantDetails;
  documents: DocumentDetails;
  review: ReviewConsents;
}

/** Each wizard step owns exactly one slice of the application. */
export type StepId = keyof ApplicationData;
