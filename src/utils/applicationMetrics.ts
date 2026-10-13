import { isStepActive } from '../constants/steps';
import type { ApplicationData, EmploymentDetails } from '../types/application';
import {
  assessAffordability,
  estimateForLoan,
  type Affordability,
  type LoanEstimate,
} from './emiCalculator';

/** Applicant's monthly income: net salary if salaried, declared income otherwise. */
export function getApplicantMonthlyIncome(employment: EmploymentDetails): number {
  if (employment.employmentType === 'salaried') return employment.monthlySalary ?? 0;
  if (employment.employmentType) return employment.monthlyIncome ?? 0;
  return 0;
}

/** Applicant + co-applicant income (Step 6 → Step 8 combined EMI ratio). */
export function getCombinedMonthlyIncome(application: ApplicationData): number {
  const applicant = getApplicantMonthlyIncome(application.employment);
  const coApplicant = isStepActive('coApplicant', application)
    ? application.coApplicant.monthlyIncome ?? 0
    : 0;
  return applicant + coApplicant;
}

/** Rent counts as a monthly obligation only when the applicant rents (Step 4). */
export function getMonthlyRent(application: ApplicationData): number {
  return application.address.residenceType === 'rented' ? application.address.monthlyRent ?? 0 : 0;
}

export interface ApplicationEstimate {
  estimate: LoanEstimate | null;
  affordability: Affordability | null;
}

export function getApplicationEstimate(application: ApplicationData): ApplicationEstimate {
  const { loanType, loanAmount, tenureMonths } = application.loan;
  const estimate = estimateForLoan(loanType, loanAmount, tenureMonths);
  const affordability = estimate
    ? assessAffordability(
      estimate.emi,
      getCombinedMonthlyIncome(application),
      getMonthlyRent(application),
    )
    : null;
  return { estimate, affordability };
}
