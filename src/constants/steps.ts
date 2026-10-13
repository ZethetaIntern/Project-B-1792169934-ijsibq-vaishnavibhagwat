import type { ApplicationData, StepId } from '../types/application';
import { requiresCoApplicant } from './loan';

export interface StepMeta {
  id: StepId;
  title: string;
  shortTitle: string;
  description: string;
  /** Contextual tips shown in the side panel while the step is open. */
  guidance: readonly string[];
}

/** Canonical order of all eight logical steps. Step 6 is conditional. */
export const STEPS: readonly StepMeta[] = [
  {
    id: 'loan',
    title: 'Choose your loan',
    shortTitle: 'Loan',
    description: 'Pick a product, amount and tenure. You can change these until you submit.',
    guidance: [
      'Your estimated EMI updates as you change the amount and tenure.',
      'Interest rates shown are illustrative and used only for estimates.',
    ],
  },
  {
    id: 'personal',
    title: 'About you',
    shortTitle: 'Personal',
    description: 'Tell us who is applying. Use your name exactly as it appears on your PAN card.',
    guidance: [
      'You must be between 21 and 65 years old to apply.',
      'Your loan must end before you turn 65, so your date of birth can limit the tenure.',
      'One-time passwords are simulated and shown on screen in this demo.',
    ],
  },
  {
    id: 'kyc',
    title: 'Verify your identity',
    shortTitle: 'Identity',
    description: 'Add your PAN and Aadhaar. Verification here is simulated — nothing is sent to NSDL or UIDAI.',
    guidance: [
      'PAN numbers follow the pattern ABCDE1234F.',
      'Aadhaar numbers are checked with the Verhoeff checksum before verification.',
      'Both numbers are masked once you leave the field.',
    ],
  },
  {
    id: 'address',
    title: 'Where you live',
    shortTitle: 'Address',
    description: 'Enter a PIN code and we will fill in the city and state for you.',
    guidance: [
      'If you have lived at this address for less than a year, we also need your previous address.',
      'Renting? Your rent is counted when we estimate affordability.',
    ],
  },
  {
    id: 'employment',
    title: 'Work and income',
    shortTitle: 'Income',
    description: 'Your income helps us estimate how comfortably you can repay.',
    guidance: [
      'Lenders generally keep your EMI under 50% of monthly income.',
      'Business Loans need a self-employed or business-owner profile.',
    ],
  },
  {
    id: 'coApplicant',
    title: 'Add a co-applicant',
    shortTitle: 'Co-applicant',
    description: 'This loan needs a co-applicant. Their income is combined with yours for affordability.',
    guidance: [
      'Required for Home Loans, Personal Loans above ₹5 lakh and Business Loans above ₹20 lakh.',
      'Your co-applicant must give their own consent and signature.',
    ],
  },
  {
    id: 'documents',
    title: 'Documents and signature',
    shortTitle: 'Documents',
    description: 'Upload the documents for your loan and sign electronically.',
    guidance: [
      'Images are compressed on your device before upload.',
      'Accepted formats are listed on each document. Files never leave this browser in this demo.',
    ],
  },
  {
    id: 'review',
    title: 'Review and submit',
    shortTitle: 'Review',
    description: 'Check everything, read the key facts and give your consent.',
    guidance: [
      'Use Edit on any section to make changes — your progress is kept.',
      'All figures are illustrative estimates, not a credit decision.',
    ],
  },
];

export const STEP_ORDER: readonly StepId[] = STEPS.map((step) => step.id);

export function getStepMeta(stepId: StepId): StepMeta {
  const meta = STEPS.find((step) => step.id === stepId);
  if (!meta) throw new Error(`Unknown step: ${stepId}`);
  return meta;
}

/** Whether a step is part of the flow for this application (Step 6 visibility rule). */
export function isStepActive(stepId: StepId, data: ApplicationData): boolean {
  if (stepId === 'coApplicant') {
    return requiresCoApplicant(data.loan.loanType, data.loan.loanAmount);
  }
  return true;
}

export function getActiveSteps(data: ApplicationData): StepMeta[] {
  return STEPS.filter((step) => isStepActive(step.id, data));
}
