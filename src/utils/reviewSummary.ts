import { GENDER_LABELS, MARITAL_STATUS_LABELS, RESIDENCE_LABELS } from '../constants/labels';
import { getLoanProduct } from '../constants/loan';
import { getActiveSteps } from '../constants/steps';
import { EMPLOYMENT_LABELS } from '../components/steps/employmentBranches';
import { isPassportFieldVisible } from '../schemas/step3Schema';
import { BUSINESS_TYPES } from '../schemas/step5Schema';
import { RELATIONSHIP_LABELS } from '../schemas/step6Schema';
import type {
  ApplicationData, PostalAddress, StepId, UploadedDocument,
} from '../types/application';
import { getDocumentRequirements } from './documentRequirements';
import {
  formatDisplayDate, formatINR, formatIndianNumber, formatTenure, maskSensitive, maskWithPrefix,
} from './format';

export interface SummaryItem {
  label: string;
  value: string;
  /** Shown instead of `value` until the applicant chooses to reveal sensitive details. */
  masked?: string;
  /** Confirmed by a (simulated) check, e.g. a verified PAN or mobile number. */
  verified?: boolean;
}

export interface ReviewSectionData {
  stepId: StepId;
  title: string;
  items: SummaryItem[];
}

const NOT_PROVIDED = 'Not provided';

export function formatAddress(address: PostalAddress): string {
  return [address.line1, address.line2, address.city, `${address.state} ${address.pinCode}`.trim()]
    .filter(Boolean)
    .join(', ');
}

/** Incomes are masked like the inputs that collected them: "₹••••5,000". */
function income(label: string, amount: number | null): SummaryItem {
  if (amount === null) return { label, value: NOT_PROVIDED };
  return { label, value: formatINR(amount), masked: `₹${maskWithPrefix(formatIndianNumber(amount))}` };
}

function fileList(files: readonly UploadedDocument[] | undefined): string {
  if (!files?.length) return '';
  return files.map((file) => file.name).join(', ');
}

const optional = (label: string, value: string): SummaryItem[] => (value ? [{ label, value }] : []);

function loanItems({ loan }: ApplicationData): SummaryItem[] {
  const product = getLoanProduct(loan.loanType);
  const purpose = product?.purposes.find((option) => option.value === loan.purpose)?.label ?? '';
  return [
    { label: 'Loan type', value: product?.label ?? '' },
    { label: 'Amount', value: formatINR(loan.loanAmount ?? 0) },
    { label: 'Tenure', value: formatTenure(loan.tenureMonths ?? 0) },
    { label: 'Purpose', value: purpose },
    ...optional('Referral code', loan.referralCode),
  ];
}

function personalItems({ personal }: ApplicationData): SummaryItem[] {
  return [
    { label: 'Full name', value: personal.fullName },
    { label: 'Date of birth', value: formatDisplayDate(personal.dateOfBirth) },
    { label: 'Gender', value: personal.gender ? GENDER_LABELS[personal.gender] : '' },
    { label: 'Marital status', value: personal.maritalStatus ? MARITAL_STATUS_LABELS[personal.maritalStatus] : '' },
    { label: "Father's name", value: personal.fatherName },
    { label: "Mother's name", value: personal.motherName },
    { label: 'Email', value: personal.email, verified: personal.emailVerified },
    { label: 'Mobile', value: `+91 ${personal.mobile}`, verified: personal.mobileVerified },
    ...optional('Alternate mobile', personal.alternateMobile && `+91 ${personal.alternateMobile}`),
  ];
}

function kycItems(application: ApplicationData): SummaryItem[] {
  const { kyc } = application;
  const aadhaar = kyc.aadhaar.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
  return [
    {
      label: 'PAN', value: kyc.pan, masked: maskSensitive(kyc.pan), verified: kyc.panVerified,
    },
    {
      label: 'Aadhaar', value: aadhaar, masked: maskSensitive(aadhaar), verified: kyc.aadhaarVerified,
    },
    { label: 'Aadhaar consent', value: kyc.aadhaarConsent ? 'Given' : 'Not given' },
    ...optional('Voter ID', kyc.voterId),
    ...(isPassportFieldVisible(application.loan)
      ? optional('Passport', kyc.passportNumber)
      : []),
  ];
}

function addressItems({ address }: ApplicationData): SummaryItem[] {
  const years = address.yearsAtCurrentAddress ?? 0;
  return [
    { label: 'Current address', value: formatAddress(address.current) },
    { label: 'Residence', value: address.residenceType ? RESIDENCE_LABELS[address.residenceType] : '' },
    ...(address.residenceType === 'rented' ? [income('Monthly rent', address.monthlyRent)] : []),
    { label: 'Years at this address', value: years < 1 ? 'Less than a year' : String(years) },
    ...(years < 1 ? [{ label: 'Previous address', value: formatAddress(address.previous) }] : []),
    {
      label: 'Permanent address',
      value: address.permanentSameAsCurrent ? 'Same as current address' : formatAddress(address.permanent),
    },
    { label: 'Address proof', value: fileList(address.addressProof) || NOT_PROVIDED },
  ];
}

function yearsAt(years: number | null): string {
  if (years === null) return '';
  if (years < 1) return 'less than a year';
  return years === 1 ? '1 year' : `${years} years`;
}

function employmentItems({ employment }: ApplicationData): SummaryItem[] {
  const type = employment.employmentType;
  const items: SummaryItem[] = [
    { label: 'Employment', value: type ? EMPLOYMENT_LABELS[type] : '' },
    { label: 'Years of experience', value: String(employment.yearsOfExperience ?? '') },
  ];
  if (type === 'salaried') {
    return [
      ...items,
      { label: 'Company', value: employment.companyName },
      { label: 'Designation', value: employment.designation },
      income('Monthly net salary', employment.monthlySalary),
      ...employment.previousEmployers.map((job, index) => ({
        label: `Previous employer ${index + 1}`,
        value: `${job.companyName}, ${job.designation} (${yearsAt(job.years)})`,
      })),
    ];
  }
  const businessType = BUSINESS_TYPES.find((option) => option.value === employment.businessType);
  return [
    ...items,
    { label: 'Business name', value: employment.businessName },
    { label: 'Business type', value: businessType?.label ?? '' },
    income('Annual turnover', employment.annualTurnover),
    { label: 'Years in business', value: String(employment.yearsInBusiness ?? '') },
    income('Monthly income', employment.monthlyIncome),
    { label: 'Office address', value: formatAddress(employment.officeAddress) },
    ...(type === 'businessOwner'
      ? [{ label: 'GSTIN', value: employment.gstNumber, masked: maskSensitive(employment.gstNumber) }]
      : []),
  ];
}

function coApplicantItems({ coApplicant }: ApplicationData): SummaryItem[] {
  return [
    { label: 'Name', value: coApplicant.fullName },
    {
      label: 'Relationship',
      value: coApplicant.relationship ? RELATIONSHIP_LABELS[coApplicant.relationship] : '',
    },
    {
      label: 'PAN',
      value: coApplicant.pan,
      masked: maskSensitive(coApplicant.pan),
      verified: coApplicant.panVerified,
    },
    income('Monthly income', coApplicant.monthlyIncome),
    { label: 'Consent', value: coApplicant.consent ? 'Given, with signature' : 'Not given' },
  ];
}

function documentItems(application: ApplicationData): SummaryItem[] {
  return getDocumentRequirements(application).map(({ spec, required }) => ({
    label: spec.label,
    value: fileList(application.documents.files[spec.id])
      || (required ? 'Missing' : `${NOT_PROVIDED} (optional)`),
  }));
}

const BUILDERS: Partial<Record<StepId, (application: ApplicationData) => SummaryItem[]>> = {
  loan: loanItems,
  personal: personalItems,
  kyc: kycItems,
  address: addressItems,
  employment: employmentItems,
  coApplicant: coApplicantItems,
  documents: documentItems,
};

/** Read-only, section-by-section summary of every active step, in flow order. */
export function buildReviewSections(application: ApplicationData): ReviewSectionData[] {
  return getActiveSteps(application).flatMap((step) => {
    const build = BUILDERS[step.id];
    return build ? [{ stepId: step.id, title: step.title, items: build(application) }] : [];
  });
}
