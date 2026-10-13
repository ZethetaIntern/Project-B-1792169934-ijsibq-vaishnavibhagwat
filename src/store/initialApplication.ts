import type { ApplicationData, PostalAddress } from '../types/application';

export function createEmptyAddress(): PostalAddress {
  return {
    line1: '',
    line2: '',
    pinCode: '',
    city: '',
    state: '',
    postOffice: '',
  };
}

/** A blank application. Every field has a defined empty value (no `undefined`). */
export function createEmptyApplication(): ApplicationData {
  return {
    loan: {
      loanType: '',
      loanAmount: null,
      tenureMonths: null,
      purpose: '',
      referralCode: '',
    },
    personal: {
      fullName: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      fatherName: '',
      motherName: '',
      email: '',
      emailVerified: false,
      mobile: '',
      mobileVerified: false,
      alternateMobile: '',
    },
    kyc: {
      pan: '',
      panVerified: false,
      aadhaar: '',
      aadhaarVerified: false,
      aadhaarConsent: false,
      voterId: '',
      passportNumber: '',
    },
    address: {
      current: createEmptyAddress(),
      residenceType: '',
      monthlyRent: null,
      yearsAtCurrentAddress: null,
      previous: createEmptyAddress(),
      permanentSameAsCurrent: true,
      permanent: createEmptyAddress(),
      addressProof: [],
    },
    employment: {
      employmentType: '',
      yearsOfExperience: null,
      companyName: '',
      designation: '',
      monthlySalary: null,
      businessName: '',
      businessType: '',
      annualTurnover: null,
      yearsInBusiness: null,
      monthlyIncome: null,
      officeAddress: createEmptyAddress(),
      gstNumber: '',
    },
    coApplicant: {
      fullName: '',
      relationship: '',
      pan: '',
      panVerified: false,
      monthlyIncome: null,
      consent: false,
      signature: '',
    },
    documents: {
      files: {},
      signature: '',
      signatureMethod: '',
    },
    review: {
      accuracy: false,
      creditCheck: false,
      terms: false,
      communication: false,
      highEmiAcknowledged: false,
    },
  };
}
