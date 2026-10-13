import { z } from 'zod';
import type { ApplicationData, MaritalStatus, Relationship } from '../types/application';
import { validatePan, validatePersonName } from '../utils/validators';
import {
  choice, fail, optionalNumber, text,
} from './common';

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  spouse: 'Spouse',
  parent: 'Parent',
  sibling: 'Sibling',
  businessPartner: 'Business partner',
};

/**
 * Step 2 → Step 6: "Spouse" is offered (and listed first as the default) only when the
 * applicant is married.
 */
export function getRelationshipOptions(maritalStatus: MaritalStatus | ''): Relationship[] {
  const others: Relationship[] = ['parent', 'sibling', 'businessPartner'];
  return maritalStatus === 'married' ? ['spouse', ...others] : others;
}

export const MAX_CO_APPLICANT_INCOME = 1_00_00_000;

/** Step 6 — co-applicant (only part of the flow when the loan requires one). */
export function buildStep6Schema(application: ApplicationData) {
  const allowedRelationships = getRelationshipOptions(application.personal.maritalStatus);
  const applicantPan = application.kyc.pan.toUpperCase();
  const applicantName = application.personal.fullName.trim().toLowerCase();

  return z.object({
    fullName: text,
    relationship: choice,
    pan: z.string().transform((value) => value.toUpperCase().replace(/\s/g, '')),
    panVerified: z.boolean(),
    monthlyIncome: optionalNumber,
    consent: z.boolean(),
    signature: z.string(),
  }).superRefine((coApplicant, ctx) => {
    if (!coApplicant.fullName) {
      fail(ctx, ['fullName'], "Enter your co-applicant's full name.");
    } else {
      const problem = validatePersonName(coApplicant.fullName, "co-applicant's name");
      if (problem) fail(ctx, ['fullName'], problem);
      else if (applicantName && coApplicant.fullName.toLowerCase() === applicantName) {
        fail(ctx, ['fullName'], 'Your co-applicant must be a different person from you.');
      }
    }

    if (!allowedRelationships.includes(coApplicant.relationship as Relationship)) {
      fail(ctx, ['relationship'], 'Choose how your co-applicant is related to you.');
    }

    if (!coApplicant.pan) {
      fail(ctx, ['pan'], "Enter your co-applicant's PAN.");
    } else {
      const problem = validatePan(coApplicant.pan, ['P']);
      if (problem) fail(ctx, ['pan'], problem);
      else if (coApplicant.pan === applicantPan) {
        fail(ctx, ['pan'], 'Your co-applicant needs their own PAN — this one matches yours.');
      } else if (!coApplicant.panVerified) {
        fail(ctx, ['pan'], "Your co-applicant's PAN has not been verified yet. Select Retry to verify it.");
      }
    }

    const income = coApplicant.monthlyIncome;
    if (income === null) {
      fail(ctx, ['monthlyIncome'], "Enter your co-applicant's monthly income (0 if they have none).");
    } else if (income < 0 || income > MAX_CO_APPLICANT_INCOME) {
      fail(ctx, ['monthlyIncome'], 'Check the monthly income — it looks out of range.');
    }

    if (!coApplicant.consent) {
      fail(ctx, ['consent'], 'Your co-applicant must give their consent to continue.');
    }
    if (!coApplicant.signature.startsWith('data:image/png')) {
      fail(ctx, ['signature'], 'Your co-applicant needs to sign. Draw or type their signature, then select "Use this signature".');
    }
  });
}
