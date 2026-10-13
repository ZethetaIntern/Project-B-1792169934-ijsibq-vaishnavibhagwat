import {
  getLoanProduct,
  MAX_EMI_TO_INCOME_RATIO,
  MAX_PROCESSING_FEE,
  MIN_PROCESSING_FEE,
  PROCESSING_FEE_RATE,
} from '../constants/loan';
import type { LoanType } from '../types/application';

/**
 * Reducing-balance EMI: P × r × (1 + r)^n / ((1 + r)^n − 1),
 * where r is the monthly rate (annual % / 12 / 100) and n the tenure in months.
 * A 0% rate degenerates to P / n (the formula would divide by zero).
 */
export function calculateEmi(principal: number, annualRatePercent: number, months: number): number {
  if (!(principal > 0) || !(months > 0) || annualRatePercent < 0) return 0;
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return (principal * monthlyRate * growth) / (growth - 1);
}

/** 1% of the loan amount, bounded to ₹2,000 – ₹25,000. */
export function calculateProcessingFee(loanAmount: number): number {
  if (!(loanAmount > 0)) return 0;
  const fee = loanAmount * PROCESSING_FEE_RATE;
  return Math.min(Math.max(fee, MIN_PROCESSING_FEE), MAX_PROCESSING_FEE);
}

export interface LoanEstimate {
  principal: number;
  tenureMonths: number;
  /** Illustrative annual interest rate, % p.a. */
  annualRate: number;
  /** Monthly instalment, rounded to the nearest rupee as lenders quote it. */
  emi: number;
  /** Total cost of borrowing = (EMI × n) − P. */
  totalInterest: number;
  processingFee: number;
  /** Sum of all instalments (EMI × n). */
  totalRepayment: number;
  /** Everything the borrower pays: instalments + processing fee. */
  totalPayable: number;
}

/** All figures for the pre-approval summary / Key Fact Statement. */
export function estimateLoan(
  principal: number,
  annualRate: number,
  tenureMonths: number,
): LoanEstimate {
  const emi = Math.round(calculateEmi(principal, annualRate, tenureMonths));
  const totalRepayment = emi * tenureMonths;
  const processingFee = Math.round(calculateProcessingFee(principal));
  return {
    principal,
    tenureMonths,
    annualRate,
    emi,
    totalInterest: Math.max(totalRepayment - principal, 0),
    processingFee,
    totalRepayment,
    totalPayable: totalRepayment + processingFee,
  };
}

/** Estimate for a product, or `null` until type, amount and tenure are all known. */
export function estimateForLoan(
  loanType: LoanType | '',
  loanAmount: number | null,
  tenureMonths: number | null,
): LoanEstimate | null {
  const product = getLoanProduct(loanType);
  if (!product || !loanAmount || !tenureMonths) return null;
  return estimateLoan(loanAmount, product.annualInterestRate, tenureMonths);
}

export interface Affordability {
  monthlyIncome: number;
  /** EMI ÷ combined monthly income. */
  emiToIncomeRatio: number;
  /** (EMI + rent) ÷ combined monthly income. */
  obligationRatio: number;
  /** True when EMI exceeds 50% of income — needs an extra acknowledgement. */
  exceedsLimit: boolean;
  /** Income left after EMI and rent. */
  disposableIncome: number;
}

/**
 * EMI affordability (Steps 4, 5 and 6 → Step 8): income is the applicant's plus any
 * co-applicant's; rent is shown as an additional monthly obligation.
 */
export function assessAffordability(
  emi: number,
  monthlyIncome: number,
  monthlyRent = 0,
): Affordability | null {
  if (!(monthlyIncome > 0) || !(emi > 0)) return null;
  const emiToIncomeRatio = emi / monthlyIncome;
  return {
    monthlyIncome,
    emiToIncomeRatio,
    obligationRatio: (emi + monthlyRent) / monthlyIncome,
    exceedsLimit: emiToIncomeRatio > MAX_EMI_TO_INCOME_RATIO,
    disposableIncome: monthlyIncome - emi - monthlyRent,
  };
}

/** Largest principal whose EMI stays within the given monthly budget. */
export function maxPrincipalForEmi(
  monthlyBudget: number,
  annualRate: number,
  months: number,
): number {
  if (!(monthlyBudget > 0) || !(months > 0)) return 0;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return monthlyBudget * months;
  const growth = (1 + monthlyRate) ** months;
  return (monthlyBudget * (growth - 1)) / (monthlyRate * growth);
}
