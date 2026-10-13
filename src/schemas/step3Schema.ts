import { z } from 'zod';
import { PASSPORT_REQUIRED_HOME_LOAN_AMOUNT } from '../constants/loan';
import type { ApplicationData, LoanDetails } from '../types/application';
import {
  allowedPanEntities,
  validateAadhaar,
  validatePan,
  validatePassport,
  validateVoterId,
} from '../utils/validators';
import { fail } from './common';

/** The passport field is only collected for Home Loans above ₹50 lakh. */
export function isPassportFieldVisible(loan: LoanDetails): boolean {
  return loan.loanType === 'home' && (loan.loanAmount ?? 0) > PASSPORT_REQUIRED_HOME_LOAN_AMOUNT;
}

const upperCompact = z.string().transform((value) => value.toUpperCase().replace(/\s/g, ''));
const digits = z.string().transform((value) => value.replace(/\D/g, ''));

/**
 * Step 3 — KYC. PAN entity rules depend on the loan type (Step 1); both numbers must
 * pass the simulated verification before the applicant can continue.
 */
export function buildStep3Schema(application: ApplicationData) {
  const panEntities = allowedPanEntities(application.loan.loanType);
  const showPassport = isPassportFieldVisible(application.loan);

  return z.object({
    pan: upperCompact,
    panVerified: z.boolean(),
    aadhaar: digits,
    aadhaarVerified: z.boolean(),
    aadhaarConsent: z.boolean(),
    voterId: upperCompact,
    // Data minimisation: drop the passport number when the field does not apply.
    passportNumber: upperCompact.transform((value) => (showPassport ? value : '')),
  }).superRefine((kyc, ctx) => {
    if (!kyc.pan) {
      fail(ctx, ['pan'], 'Enter your PAN.');
    } else {
      const problem = validatePan(kyc.pan, panEntities);
      if (problem) fail(ctx, ['pan'], problem);
      else if (!kyc.panVerified) {
        fail(ctx, ['pan'], 'Your PAN has not been verified yet. Select Retry to verify it.');
      }
    }

    if (!kyc.aadhaar) {
      fail(ctx, ['aadhaar'], 'Enter your 12-digit Aadhaar number.');
    } else {
      const problem = validateAadhaar(kyc.aadhaar);
      if (problem) fail(ctx, ['aadhaar'], problem);
      else if (!kyc.aadhaarVerified) {
        fail(ctx, ['aadhaar'], 'Your Aadhaar has not been verified yet. Select Retry to verify it.');
      }
    }

    if (!kyc.aadhaarConsent) {
      fail(ctx, ['aadhaarConsent'], 'Give your consent for Aadhaar-based verification to continue.');
    }

    if (kyc.voterId) {
      const problem = validateVoterId(kyc.voterId);
      if (problem) fail(ctx, ['voterId'], problem);
    }

    if (kyc.passportNumber) {
      const problem = validatePassport(kyc.passportNumber);
      if (problem) fail(ctx, ['passportNumber'], problem);
    }
  });
}
