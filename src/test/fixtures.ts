import { createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData, UploadedDocument } from '../types/application';
import { verhoeffCheckDigit } from '../utils/validators';

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
