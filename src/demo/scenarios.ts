import { createEmptyAddress, createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData, PostalAddress } from '../types/application';
import { gstinCheckCharacter, verhoeffCheckDigit } from '../utils/validators';

export type DemoScenarioId = 'personal-salaried' | 'home-joint' | 'business-owner' | 'personal-high-emi';

export interface DemoScenario {
  id: DemoScenarioId;
  title: string;
  summary: string;
  /** Conditional rules this scenario shows off — the "what to try" guide. */
  highlights: readonly string[];
  /** Synthetic answers. Verification flags are false: checks still run in the demo. */
  data: ApplicationData;
}

const aadhaar = (first11: string) => `${first11}${verhoeffCheckDigit(first11)}`;

const address = (line1: string, pinCode: string, city: string, state: string): PostalAddress => ({
  ...createEmptyAddress(), line1, pinCode, city, state,
});

function base(): ApplicationData {
  const data = createEmptyApplication();
  data.personal = {
    ...data.personal,
    gender: 'female',
    maritalStatus: 'single',
    fatherName: 'Suresh Iyer',
    motherName: 'Lakshmi Iyer',
    email: 'demo.applicant@example.com',
  };
  data.kyc = { ...data.kyc, aadhaarConsent: true };
  data.address = { ...data.address, residenceType: 'owned', yearsAtCurrentAddress: 4 };
  return data;
}

function personalSalaried(): ApplicationData {
  const data = base();
  data.loan = {
    loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36, purpose: 'medical', referralCode: '',
  };
  data.personal = {
    ...data.personal, fullName: 'Meera Iyer', dateOfBirth: '1994-06-12', mobile: '9000012345',
  };
  data.kyc = { ...data.kyc, pan: 'AMBPI4821K', aadhaar: aadhaar('39271846502') };
  data.address.current = address('12, Lakeview Apartments, Anna Nagar', '600040', 'Chennai', 'Tamil Nadu');
  data.employment = {
    ...data.employment,
    employmentType: 'salaried',
    yearsOfExperience: 7,
    companyName: 'Tata Consultancy Services',
    designation: 'Business Analyst',
    monthlySalary: 85_000,
  };
  return data;
}

function homeJoint(): ApplicationData {
  const data = base();
  data.loan = {
    loanType: 'home', loanAmount: 60_00_000, tenureMonths: 240, purpose: 'ready-property', referralCode: '',
  };
  data.personal = {
    ...data.personal, fullName: 'Rohan Kulkarni', gender: 'male', maritalStatus: 'married', dateOfBirth: '1988-02-21', fatherName: 'Anil Kulkarni', motherName: 'Sunanda Kulkarni', mobile: '9000023456',
  };
  data.kyc = {
    ...data.kyc, pan: 'BKLPK7310M', aadhaar: aadhaar('48302917654'), passportNumber: 'Z1234567',
  };
  data.address = {
    ...data.address,
    current: address('Flat 703, Sunrise Towers, Baner Road', '411045', 'Pune', 'Maharashtra'),
    residenceType: 'rented',
    monthlyRent: 25_000,
  };
  data.employment = {
    ...data.employment,
    employmentType: 'salaried',
    yearsOfExperience: 12,
    companyName: 'Infosys',
    designation: 'Engineering Manager',
    monthlySalary: 1_40_000,
  };
  data.coApplicant = {
    ...data.coApplicant, fullName: 'Priya Kulkarni', relationship: 'spouse', pan: 'CPRPK5520Q', monthlyIncome: 70_000,
  };
  return data;
}

function businessOwner(): ApplicationData {
  const data = base();
  data.loan = {
    loanType: 'business', loanAmount: 25_00_000, tenureMonths: 60, purpose: 'equipment', referralCode: '',
  };
  data.personal = {
    ...data.personal, fullName: 'Kabir Malhotra', gender: 'male', dateOfBirth: '1985-09-03', fatherName: 'Vinod Malhotra', motherName: 'Neelam Malhotra', mobile: '9000034567',
  };
  data.kyc = { ...data.kyc, pan: 'DKMPM2468R', aadhaar: aadhaar('57120384965') };
  data.address = {
    ...data.address,
    current: address('House 41, Sector 15', '160015', 'Chandigarh', 'Chandigarh'),
    yearsAtCurrentAddress: 0,
    previous: address('22, Model Town Extension', '141002', 'Ludhiana', 'Punjab'),
  };
  data.employment = {
    ...data.employment,
    employmentType: 'businessOwner',
    yearsOfExperience: 14,
    businessName: 'Malhotra Precision Components',
    businessType: 'manufacturing',
    annualTurnover: 1_20_00_000,
    yearsInBusiness: 9,
    monthlyIncome: 2_20_000,
    officeAddress: address('Plot 88, Industrial Area Phase 2', '160002', 'Chandigarh', 'Chandigarh'),
    gstNumber: `04DKMPM2468R1Z${gstinCheckCharacter('04DKMPM2468R1Z')}`,
  };
  data.coApplicant = {
    ...data.coApplicant, fullName: 'Ishaan Batra', relationship: 'businessPartner', pan: 'EIBPB9135T', monthlyIncome: 90_000,
  };
  return data;
}

function personalHighEmi(): ApplicationData {
  const data = base();
  data.loan = {
    loanType: 'personal', loanAmount: 8_00_000, tenureMonths: 36, purpose: 'home-renovation', referralCode: '',
  };
  data.personal = {
    ...data.personal, fullName: 'Anjali Deshmukh', dateOfBirth: '1990-11-30', fatherName: 'Prakash Deshmukh', motherName: 'Shobha Deshmukh', mobile: '9000045678',
  };
  data.kyc = { ...data.kyc, pan: 'FADPD3579H', aadhaar: aadhaar('62859301746') };
  data.address.current = address('B-9, Shivaji Colony, Dharampeth', '440010', 'Nagpur', 'Maharashtra');
  data.employment = {
    ...data.employment,
    employmentType: 'selfEmployed',
    yearsOfExperience: 6,
    businessName: 'Deshmukh Tutorials',
    businessType: 'services',
    annualTurnover: 6_00_000,
    yearsInBusiness: 4,
    monthlyIncome: 40_000,
    officeAddress: address('First floor, 14 Ramdaspeth Road', '440010', 'Nagpur', 'Maharashtra'),
  };
  data.coApplicant = {
    ...data.coApplicant, fullName: 'Prakash Deshmukh', relationship: 'parent', pan: 'GPDPD8642L', monthlyIncome: 8_000,
  };
  return data;
}

/** Four synthetic applications that between them exercise every conditional rule. */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'personal-salaried',
    title: 'Personal Loan, salaried',
    summary: '₹3 lakh over 3 years. The shortest path through the form.',
    highlights: [
      'No co-applicant at ₹3 lakh — raise it to ₹5,00,001 in Step 1 and Step 6 appears.',
      'Salary slips are requested because the applicant is salaried.',
      'The PAN copy becomes optional once the PAN is verified.',
    ],
    data: personalSalaried(),
  },
  {
    id: 'home-joint',
    title: 'Home Loan with a spouse',
    summary: '₹60 lakh over 20 years, renting today, married.',
    highlights: [
      'The passport field appears for Home Loans above ₹50 lakh.',
      'Home Loans always include a co-applicant; Spouse is pre-selected.',
      'Rent is counted when affordability is estimated.',
      'Property documents are added to the checklist.',
    ],
    data: homeJoint(),
  },
  {
    id: 'business-owner',
    title: 'Business Loan, business owner',
    summary: '₹25 lakh over 5 years, moved home this year.',
    highlights: [
      'Try switching to Salaried in Step 5 — Business Loans do not allow it.',
      'The GSTIN is checked with its checksum character.',
      'A previous address is needed after less than a year at the current one.',
      'Above ₹20 lakh a co-applicant is needed; GST returns and registration are requested.',
    ],
    data: businessOwner(),
  },
  {
    id: 'personal-high-emi',
    title: 'Personal Loan with a high EMI',
    summary: '₹8 lakh over 3 years on a modest self-employed income.',
    highlights: [
      'The EMI is more than half of the combined income, so the review step asks for an extra acknowledgement.',
      'Above ₹5 lakh a co-applicant is needed; their income is added to yours.',
      'Income tax returns are requested instead of salary slips.',
    ],
    data: personalHighEmi(),
  },
];

export function getDemoScenario(id: string | null): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}
