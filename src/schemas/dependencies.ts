import type { StepId } from '../types/application';

export interface CrossStepDependency {
  /** Number in the brief's dependency table (B3). */
  id: number;
  from: StepId;
  to: StepId;
  /** The answer that drives the rule. */
  trigger: string;
  /** What changes downstream. */
  effect: string;
  /** Where the rule lives in the code. */
  enforcedBy: string;
}

/**
 * Every cross-step dependency in the application, as data. Each rule is applied in
 * exactly one place (listed in `enforcedBy`); the schema factory passes the whole
 * application to every step's schema builder so the rules always see the latest
 * answers. `crossStepDependencies.test.ts` checks each entry.
 */
export const CROSS_STEP_DEPENDENCIES: readonly CrossStepDependency[] = [
  {
    id: 1,
    from: 'loan',
    to: 'employment',
    trigger: 'Loan type',
    effect: 'A Business Loan needs a self-employed or business-owner profile.',
    enforcedBy: 'buildStep5Schema (superRefine)',
  },
  {
    id: 2,
    from: 'loan',
    to: 'coApplicant',
    trigger: 'Loan type',
    effect: 'Home Loans always include the co-applicant step.',
    enforcedBy: 'requiresCoApplicant → isStepActive / getActiveSteps',
  },
  {
    id: 3,
    from: 'loan',
    to: 'documents',
    trigger: 'Loan type',
    effect: 'Home adds property documents; Business adds registration and GST returns.',
    enforcedBy: 'getDocumentRequirements',
  },
  {
    id: 4,
    from: 'loan',
    to: 'coApplicant',
    trigger: 'Loan amount',
    effect: 'Personal above ₹5 lakh or Business above ₹20 lakh adds the co-applicant step.',
    enforcedBy: 'requiresCoApplicant (strictly greater than)',
  },
  {
    id: 5,
    from: 'loan',
    to: 'review',
    trigger: 'Loan amount',
    effect: 'EMI, interest, fee and APR in the key fact statement.',
    enforcedBy: 'estimateForLoan / getApplicationEstimate',
  },
  {
    id: 6,
    from: 'loan',
    to: 'review',
    trigger: 'Tenure',
    effect: 'EMI and total cost in the key fact statement.',
    enforcedBy: 'estimateForLoan / getApplicationEstimate',
  },
  {
    id: 7,
    from: 'personal',
    to: 'loan',
    trigger: 'Date of birth',
    effect: 'Age at the end of the tenure may not exceed 65, which caps the tenure.',
    enforcedBy: 'getAgeTenureLimit → buildStep1Schema, and buildStep2Schema',
  },
  {
    id: 8,
    from: 'personal',
    to: 'coApplicant',
    trigger: 'Marital status',
    effect: 'Married applicants get Spouse as the default relationship; others cannot pick it.',
    enforcedBy: 'getRelationshipOptions / Step6CoApplicant',
  },
  {
    id: 9,
    from: 'kyc',
    to: 'documents',
    trigger: 'PAN verified',
    effect: 'The PAN card copy becomes optional.',
    enforcedBy: 'getDocumentRequirements',
  },
  {
    id: 10,
    from: 'address',
    to: 'address',
    trigger: 'Residence type',
    effect: 'Rented shows a monthly rent field, counted as an obligation in affordability.',
    enforcedBy: 'buildStep4Schema / getMonthlyRent',
  },
  {
    id: 11,
    from: 'employment',
    to: 'employment',
    trigger: 'Employment type',
    effect: 'Shows that type’s sub-form; switching clears the abandoned branch.',
    enforcedBy: 'buildStep5Schema (discriminated union) / employmentBranches',
  },
  {
    id: 12,
    from: 'employment',
    to: 'documents',
    trigger: 'Employment type',
    effect: 'Salaried applicants upload salary slips; everyone else uploads ITRs.',
    enforcedBy: 'getDocumentRequirements',
  },
  {
    id: 13,
    from: 'employment',
    to: 'review',
    trigger: 'Monthly income',
    effect: 'An EMI above 50% of income needs an extra acknowledgement before submitting.',
    enforcedBy: 'assessAffordability / buildStep8Schema',
  },
  {
    id: 14,
    from: 'coApplicant',
    to: 'review',
    trigger: 'Co-applicant income',
    effect: 'Added to the applicant’s income for the EMI-to-income ratio.',
    enforcedBy: 'getCombinedMonthlyIncome',
  },
];
