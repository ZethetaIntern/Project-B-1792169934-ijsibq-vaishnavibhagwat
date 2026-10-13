import type { LoanType } from '../types/application';

export const LOAN_TYPE_PERSONAL = 'personal' satisfies LoanType;
export const LOAN_TYPE_HOME = 'home' satisfies LoanType;
export const LOAN_TYPE_BUSINESS = 'business' satisfies LoanType;

export const LOAN_TYPES: readonly LoanType[] = [
  LOAN_TYPE_PERSONAL,
  LOAN_TYPE_HOME,
  LOAN_TYPE_BUSINESS,
];

export const MIN_LOAN_AMOUNT = 50_000;
export const MIN_APPLICANT_AGE = 21;
export const MAX_APPLICANT_AGE = 65;
/** Age at the end of the loan tenure may not exceed this (Step 2 → Step 1 dependency). */
export const MAX_AGE_AT_MATURITY = 65;

/** Processing fee: 1% of the loan amount, bounded to ₹2,000–₹25,000. */
export const PROCESSING_FEE_RATE = 0.01;
export const MIN_PROCESSING_FEE = 2_000;
export const MAX_PROCESSING_FEE = 25_000;

/** EMI may not exceed 50% of (applicant + co-applicant) monthly income without extra consent. */
export const MAX_EMI_TO_INCOME_RATIO = 0.5;

/** Passport field appears only for Home Loans above ₹50 lakh. */
export const PASSPORT_REQUIRED_HOME_LOAN_AMOUNT = 50_00_000;

export interface PurposeOption {
  value: string;
  label: string;
}

export interface LoanProduct {
  id: LoanType;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  maxAmount: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  tenureStepMonths: number;
  /** Illustrative annual interest rate (% p.a.) used for every estimate in the app. */
  annualInterestRate: number;
  /**
   * A co-applicant is required when the amount strictly exceeds this value.
   * `0` means "always required" (Home Loans).
   */
  coApplicantAboveAmount: number;
  purposes: readonly PurposeOption[];
}

export const LOAN_PRODUCTS: Readonly<Record<LoanType, LoanProduct>> = {
  personal: {
    id: 'personal',
    label: 'Personal Loan',
    shortLabel: 'Personal',
    tagline: 'For life’s planned and unplanned moments',
    description: 'Unsecured credit for medical needs, weddings, travel, education and more.',
    maxAmount: 10_00_000,
    minTenureMonths: 12,
    maxTenureMonths: 60,
    tenureStepMonths: 6,
    annualInterestRate: 10.5,
    coApplicantAboveAmount: 5_00_000,
    purposes: [
      { value: 'medical', label: 'Medical expenses' },
      { value: 'wedding', label: 'Wedding' },
      { value: 'education', label: 'Education' },
      { value: 'travel', label: 'Travel' },
      { value: 'home-renovation', label: 'Home renovation' },
      { value: 'debt-consolidation', label: 'Debt consolidation' },
      { value: 'consumer-durables', label: 'Consumer durables' },
      { value: 'other-personal', label: 'Other personal need' },
    ],
  },
  home: {
    id: 'home',
    label: 'Home Loan',
    shortLabel: 'Home',
    tagline: 'Long tenures for the home you want',
    description: 'Finance a purchase, construction, extension or balance transfer.',
    maxAmount: 1_00_00_000,
    minTenureMonths: 60,
    maxTenureMonths: 360,
    tenureStepMonths: 12,
    annualInterestRate: 8.5,
    coApplicantAboveAmount: 0,
    purposes: [
      { value: 'ready-property', label: 'Purchase of a ready property' },
      { value: 'under-construction', label: 'Purchase of an under-construction property' },
      { value: 'self-construction', label: 'Construction on an owned plot' },
      { value: 'plot-and-construction', label: 'Plot purchase and construction' },
      { value: 'home-extension', label: 'Home extension or improvement' },
      { value: 'balance-transfer', label: 'Balance transfer from another lender' },
    ],
  },
  business: {
    id: 'business',
    label: 'Business Loan',
    shortLabel: 'Business',
    tagline: 'Working capital and growth for your enterprise',
    description: 'Fund inventory, equipment, expansion or day-to-day operations.',
    maxAmount: 50_00_000,
    minTenureMonths: 12,
    maxTenureMonths: 120,
    tenureStepMonths: 12,
    annualInterestRate: 14,
    coApplicantAboveAmount: 20_00_000,
    purposes: [
      { value: 'working-capital', label: 'Working capital' },
      { value: 'equipment', label: 'Equipment or machinery' },
      { value: 'inventory', label: 'Inventory purchase' },
      { value: 'expansion', label: 'Business expansion' },
      { value: 'premises', label: 'Office, shop or factory set-up' },
      { value: 'refinance', label: 'Refinance existing business debt' },
    ],
  },
};

export function getLoanProduct(loanType: LoanType | ''): LoanProduct | undefined {
  return loanType ? LOAN_PRODUCTS[loanType] : undefined;
}

/** All tenures offered for a product, in months, ascending. */
export function getTenureOptions(loanType: LoanType | ''): number[] {
  const product = getLoanProduct(loanType);
  if (!product) return [];
  const { minTenureMonths, maxTenureMonths, tenureStepMonths } = product;
  const count = Math.floor((maxTenureMonths - minTenureMonths) / tenureStepMonths) + 1;
  return Array.from({ length: count }, (_, index) => minTenureMonths + index * tenureStepMonths);
}

/**
 * Central co-applicant rule (Step 1 → Step 6 dependency).
 * Personal > ₹5L, Home always, Business > ₹20L. Thresholds are exclusive:
 * exactly ₹5,00,000 on a Personal Loan does NOT require a co-applicant.
 */
export function requiresCoApplicant(loanType: LoanType | '', loanAmount: number | null): boolean {
  const product = getLoanProduct(loanType);
  if (!product) return false;
  if (product.coApplicantAboveAmount === 0) return true;
  return (loanAmount ?? 0) > product.coApplicantAboveAmount;
}
