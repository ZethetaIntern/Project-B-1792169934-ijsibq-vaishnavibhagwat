import { isStepActive } from '../constants/steps';
import type { SubmissionReceipt } from '../store/applicationStore';
import { createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData, DocumentTypeId } from '../types/application';
import { getDocumentRequirements } from './documentRequirements';
import { simulateRequest } from './simulate';

/** Simulated round trip to the lender's API. */
export const SUBMIT_LATENCY_MS = 1_800;

/**
 * What would be sent to the lender: only the sections and documents that apply to
 * this application (data minimisation). A skipped co-applicant step, or files for
 * documents that are no longer required, never leave the device.
 */
export function buildSubmissionPayload(application: ApplicationData): ApplicationData {
  const applicable = new Set<DocumentTypeId>(
    getDocumentRequirements(application).map((requirement) => requirement.spec.id),
  );
  const files = Object.fromEntries(
    Object.entries(application.documents.files)
      .filter(([id]) => applicable.has(id as DocumentTypeId)),
  );
  return {
    ...application,
    coApplicant: isStepActive('coApplicant', application)
      ? application.coApplicant
      : createEmptyApplication().coApplicant,
    documents: { ...application.documents, files },
  };
}

/**
 * Submits the application. There is no back end in this project: the request is
 * simulated (it fails when offline) and the reference is a client-side UUID.
 */
export async function submitApplication(application: ApplicationData): Promise<SubmissionReceipt> {
  const payload = buildSubmissionPayload(application);
  return simulateRequest(SUBMIT_LATENCY_MS, () => {
    // A real client would POST `payload` here; it is built so the shape is tested.
    if (!payload.loan.loanType) throw new Error('The application is incomplete.');
    return { reference: crypto.randomUUID(), submittedAt: new Date().toISOString() };
  });
}
