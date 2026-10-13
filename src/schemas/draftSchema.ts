import { z } from 'zod';
import { DRAFT_SCHEMA_VERSION } from '../constants/persistence';
import { STEP_ORDER } from '../constants/steps';
import { uploadedDocument } from './common';

/**
 * Structural schema for a saved draft. Business rules are NOT applied here (a draft
 * is allowed to be incomplete) — this only proves the data has the shape the app
 * expects, so a tampered or outdated draft is rejected instead of crashing the form.
 */
const str = z.string().max(10_000);
const num = z.number().finite().nullable();
const bool = z.boolean();

const address = z.object({
  line1: str, line2: str, pinCode: str, city: str, state: str, postOffice: str,
}).strict();

const signature = z.string().max(500_000).refine((value) => !value || value.startsWith('data:image/png;base64,'), 'Invalid signature image');

export const draftDataSchema = z.object({
  loan: z.object({
    loanType: z.enum(['', 'personal', 'home', 'business']),
    loanAmount: num,
    tenureMonths: num,
    purpose: str,
    referralCode: str,
  }).strict(),
  personal: z.object({
    fullName: str,
    dateOfBirth: str,
    gender: z.enum(['', 'male', 'female', 'other']),
    maritalStatus: z.enum(['', 'single', 'married', 'divorced', 'widowed']),
    fatherName: str,
    motherName: str,
    email: str,
    emailVerified: bool,
    mobile: str,
    mobileVerified: bool,
    alternateMobile: str,
  }).strict(),
  kyc: z.object({
    pan: str,
    panVerified: bool,
    aadhaar: str,
    aadhaarVerified: bool,
    aadhaarConsent: bool,
    voterId: str,
    passportNumber: str,
  }).strict(),
  address: z.object({
    current: address,
    residenceType: z.enum(['', 'owned', 'rented', 'company', 'family']),
    monthlyRent: num,
    yearsAtCurrentAddress: num,
    previous: address,
    permanentSameAsCurrent: bool,
    permanent: address,
    addressProof: z.array(uploadedDocument).max(3),
  }).strict(),
  employment: z.object({
    employmentType: z.enum(['', 'salaried', 'selfEmployed', 'businessOwner']),
    yearsOfExperience: num,
    companyName: str,
    designation: str,
    monthlySalary: num,
    businessName: str,
    businessType: str,
    annualTurnover: num,
    yearsInBusiness: num,
    monthlyIncome: num,
    officeAddress: address,
    gstNumber: str,
  }).strict(),
  coApplicant: z.object({
    fullName: str,
    relationship: z.enum(['', 'spouse', 'parent', 'sibling', 'businessPartner']),
    pan: str,
    panVerified: bool,
    monthlyIncome: num,
    consent: bool,
    signature,
  }).strict(),
  documents: z.object({
    files: z.record(z.string(), z.array(uploadedDocument).max(3)),
    signature,
    signatureMethod: z.enum(['', 'draw', 'type']),
  }).strict(),
  review: z.object({
    accuracy: bool,
    creditCheck: bool,
    terms: bool,
    communication: bool,
    highEmiAcknowledged: bool,
  }).strict(),
}).strict();

export const draftPayloadSchema = z.object({
  version: z.literal(DRAFT_SCHEMA_VERSION),
  savedAt: z.string().datetime(),
  currentStepId: z.enum(STEP_ORDER as [string, ...string[]]),
  data: draftDataSchema,
}).strict();

export const draftMetaSchema = z.object({
  version: z.string(),
  timestamp: z.string().datetime(),
  step: z.string(),
  loanType: z.string(),
  tabId: z.string(),
});
