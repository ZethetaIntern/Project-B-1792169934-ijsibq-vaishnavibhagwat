import { getActiveSteps } from '../constants/steps';
import { CONSENT_MESSAGES, needsHighEmiAcknowledgement } from '../schemas/step8Schema';
import { isStepComplete } from '../schemas/schemaFactory';
import type { ApplicationData, ReviewConsents, StepId } from '../types/application';
import { getMissingDocuments } from './documentRequirements';

export interface SubmissionBlocker {
  id: string;
  message: string;
  /** Step where the applicant can fix it (absent for items on the review page). */
  stepId?: StepId;
}

/**
 * Everything that still prevents submission, in the order the applicant should fix
 * it. Submit stays disabled while this list is non-empty and the list is shown
 * beside the button, so a disabled control is never left unexplained.
 */
export function getSubmissionBlockers(
  application: ApplicationData,
  review: ReviewConsents,
  online: boolean,
): SubmissionBlocker[] {
  const blockers: SubmissionBlocker[] = [];

  getActiveSteps(application)
    .filter((step) => step.id !== 'review' && step.id !== 'documents')
    .forEach((step) => {
      if (!isStepComplete(step.id, application)) {
        blockers.push({ id: `step-${step.id}`, message: `Finish “${step.title}”.`, stepId: step.id });
      }
    });

  getMissingDocuments(application).forEach(({ spec }) => {
    blockers.push({ id: `document-${spec.id}`, message: `Upload your ${spec.noun}.`, stepId: 'documents' });
  });
  if (!application.documents.signature) {
    blockers.push({ id: 'signature', message: 'Add your e-signature.', stepId: 'documents' });
  } else if (!isStepComplete('documents', application) && !blockers.some((item) => item.stepId === 'documents')) {
    blockers.push({ id: 'step-documents', message: 'Check your documents.', stepId: 'documents' });
  }

  const missingConsents = (Object.keys(CONSENT_MESSAGES) as (keyof typeof CONSENT_MESSAGES)[])
    .filter((key) => !review[key]).length;
  if (missingConsents > 0) {
    blockers.push({
      id: 'consents',
      message: missingConsents === 1 ? 'Tick the remaining consent.' : `Tick the ${missingConsents} remaining consents.`,
    });
  }
  if (needsHighEmiAcknowledgement(application) && !review.highEmiAcknowledged) {
    blockers.push({ id: 'high-emi', message: 'Acknowledge the high EMI warning.' });
  }
  if (!online) {
    blockers.push({ id: 'offline', message: 'Reconnect to the internet — submitting needs a connection.' });
  }
  return blockers;
}
