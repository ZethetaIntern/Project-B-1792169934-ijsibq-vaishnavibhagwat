import { requiresCoApplicant } from '../constants/loan';
import { createEmptyApplication } from '../store/initialApplication';
import type {
  ApplicationData, EmploymentType, LoanType, UploadedDocument,
} from '../types/application';
import { getDocumentRequirements } from '../utils/documentRequirements';
import { gstinCheckCharacter, verhoeffCheckDigit } from '../utils/validators';

const ADDRESS = {
  line1: 'Flat 4B, Lotus Residency, MG Road',
  line2: '',
  pinCode: '560001',
  city: 'Bengaluru',
  state: 'Karnataka',
  postOffice: 'Bengaluru G.P.O',
};

export const SIGNATURE_PNG = 'data:image/png;base64,iVBORw0KGgo=';

export function uploadedFile(name: string, mimeType = 'application/pdf'): UploadedDocument {
  return {
    id: `file-${name}`,
    name,
    mimeType,
    originalSize: 1024,
    size: 1024,
    compressed: false,
    uploadedAt: '2026-10-13T10:00:00.000Z',
    verified: true,
  };
}

/** A complete, valid Personal Loan application for a salaried applicant (no co-applicant). */
export function createCompleteApplication(): ApplicationData {
  const data = createEmptyApplication();
  data.loan = {
    loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36, purpose: 'medical', referralCode: '',
  };
  data.personal = {
    fullName: 'Asha Verma',
    dateOfBirth: '1992-04-18',
    gender: 'female',
    maritalStatus: 'married',
    fatherName: 'Rakesh Verma',
    motherName: 'Sunita Verma',
    email: 'asha@example.com',
    emailVerified: true,
    mobile: '9876543210',
    mobileVerified: true,
    alternateMobile: '',
  };
  data.kyc = {
    pan: 'ABCPE1234F',
    panVerified: true,
    aadhaar: `23456789012${verhoeffCheckDigit('23456789012')}`,
    aadhaarVerified: true,
    aadhaarConsent: true,
    voterId: '',
    passportNumber: '',
  };
  data.address = {
    ...data.address,
    current: ADDRESS,
    residenceType: 'owned',
    yearsAtCurrentAddress: 6,
    permanentSameAsCurrent: true,
    permanent: { ...ADDRESS },
  };
  data.employment = {
    ...data.employment,
    employmentType: 'salaried',
    yearsOfExperience: 6,
    companyName: 'Infosys',
    designation: 'Senior Engineer',
    monthlySalary: 95_000,
  };
  data.documents = {
    files: {
      aadhaarCard: [uploadedFile('aadhaar.pdf')],
      salarySlips: [uploadedFile('slips.pdf')],
      bankStatements: [uploadedFile('statement.pdf')],
      photograph: [uploadedFile('photo.jpg', 'image/jpeg')],
    },
    signature: SIGNATURE_PNG,
    signatureMethod: 'draw',
  };
  return data;
}

const LOANS: Record<LoanType, ApplicationData['loan']> = {
  personal: {
    loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36, purpose: 'medical', referralCode: '',
  },
  home: {
    loanType: 'home', loanAmount: 40_00_000, tenureMonths: 240, purpose: 'ready-property', referralCode: '',
  },
  business: {
    loanType: 'business', loanAmount: 15_00_000, tenureMonths: 60, purpose: 'working-capital', referralCode: '',
  },
};

/**
 * A complete, valid application for any loan × employment combination (B3 test
 * matrix), including a co-applicant when the loan needs one and exactly the
 * required documents.
 */
export function createScenario(
  loanType: LoanType,
  employmentType: EmploymentType,
): ApplicationData {
  const data = createCompleteApplication();
  data.loan = { ...LOANS[loanType] };
  if (employmentType !== 'salaried') {
    data.employment = {
      ...createEmptyApplication().employment,
      employmentType,
      yearsOfExperience: 9,
      businessName: 'Verma Design Studio',
      businessType: 'services',
      annualTurnover: 36_00_000,
      yearsInBusiness: 5,
      monthlyIncome: 1_40_000,
      officeAddress: { ...ADDRESS, line1: 'Unit 12, Peenya Industrial Area' },
      gstNumber: employmentType === 'businessOwner'
        ? `29ABCPE1234F1Z${gstinCheckCharacter('29ABCPE1234F1Z')}`
        : '',
    };
  }
  if (requiresCoApplicant(loanType, data.loan.loanAmount)) {
    data.coApplicant = {
      fullName: 'Ravi Verma',
      relationship: 'spouse',
      pan: 'BCDPV2345K',
      panVerified: true,
      monthlyIncome: 60_000,
      consent: true,
      signature: SIGNATURE_PNG,
    };
  }
  data.documents.files = Object.fromEntries(
    getDocumentRequirements(data)
      .filter((requirement) => requirement.required)
      .map(({ spec }) => [spec.id, [uploadedFile(`${spec.id}.${spec.formats[0] === 'pdf' ? 'pdf' : 'jpg'}`, spec.formats[0] === 'pdf' ? 'application/pdf' : 'image/jpeg')]]),
  );
  return data;
}
