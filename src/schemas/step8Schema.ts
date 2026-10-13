import { z } from 'zod';
import type { ApplicationData, ReviewConsents } from '../types/application';
import { getApplicationEstimate } from '../utils/applicationMetrics';
import { fail } from './common';

/** The four separate, unticked consents (RBI Digital Lending Guidelines: no bundling). */
export const CONSENT_MESSAGES: Record<keyof Omit<ReviewConsents, 'highEmiAcknowledged'>, string> = {
  accuracy: 'Confirm that the information you have given is accurate.',
  creditCheck: 'Authorise the credit bureau check to continue.',
  terms: 'Accept the terms and conditions to continue.',
  communication: 'Agree to receive messages about this application to continue.',
};

/** Step 6 / 5 / 1 → Step 8: EMI above 50% of combined income needs an acknowledgement. */
export function needsHighEmiAcknowledgement(application: ApplicationData): boolean {
  return Boolean(getApplicationEstimate(application).affordability?.exceedsLimit);
}

/** Step 8 — consents. The acknowledgement only counts when the EMI rule applies. */
export function buildStep8Schema(application: ApplicationData) {
  const highEmi = needsHighEmiAcknowledgement(application);
  return z.object({
    accuracy: z.boolean(),
    creditCheck: z.boolean(),
    terms: z.boolean(),
    communication: z.boolean(),
    highEmiAcknowledged: z.boolean(),
  }).superRefine((review, ctx) => {
    (Object.keys(CONSENT_MESSAGES) as (keyof typeof CONSENT_MESSAGES)[]).forEach((key) => {
      if (!review[key]) fail(ctx, [key], CONSENT_MESSAGES[key]);
    });
    if (highEmi && !review.highEmiAcknowledged) {
      fail(ctx, ['highEmiAcknowledged'], 'Acknowledge that your EMI is above half of your monthly income.');
    }
  }).transform((review) => ({
    ...review,
    highEmiAcknowledged: highEmi && review.highEmiAcknowledged,
  }));
}
