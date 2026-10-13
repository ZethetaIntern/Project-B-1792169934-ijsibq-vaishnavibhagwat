import { z } from 'zod';
import type { ApplicationData, DocumentTypeId } from '../types/application';
import { getDocumentRequirements, isDocumentProvided } from '../utils/documentRequirements';
import { fail, uploadedDocument } from './common';

/**
 * Step 7 — documents and e-signature.
 * Required documents come from the requirements engine (loan type, employment type,
 * PAN verification). Files for documents that no longer apply — e.g. salary slips
 * after switching to self-employed — are dropped on save (data minimisation).
 */
export function buildStep7Schema(application: ApplicationData) {
  const requirements = getDocumentRequirements(application);
  const applicable = new Set<DocumentTypeId>(requirements.map((item) => item.spec.id));

  return z.object({
    files: z.record(z.string(), z.array(uploadedDocument)),
    signature: z.string(),
    signatureMethod: z.enum(['', 'draw', 'type']),
  }).superRefine((documents, ctx) => {
    requirements.forEach(({ spec, required }) => {
      const files = documents.files[spec.id] ?? [];
      if (files.length > spec.maxFiles) {
        fail(ctx, ['files', spec.id], `${spec.label} takes at most ${spec.maxFiles} ${spec.maxFiles === 1 ? 'file' : 'files'}. Remove the extra ones.`);
      } else if (spec.id === 'aadhaarCard' && files.length > 0 && !isDocumentProvided(spec.id, files)) {
        fail(ctx, ['files', spec.id], 'Add the other side of your Aadhaar card, or upload one PDF with both sides.');
      } else if (required && !isDocumentProvided(spec.id, files)) {
        fail(ctx, ['files', spec.id], `Upload your ${spec.noun}.`);
      }
    });

    if (!documents.signature.startsWith('data:image/png')) {
      fail(ctx, ['signature'], 'Sign the application. Draw or type your signature, then select "Use this signature".');
    }
  }).transform((documents) => ({
    ...documents,
    files: Object.fromEntries(
      Object.entries(documents.files).filter(
        ([id, files]) => applicable.has(id as DocumentTypeId) && files.length > 0,
      ),
    ),
  }));
}

/** Ids of every file the application still references (vault pruning). */
export function getReferencedFileIds(application: ApplicationData): Set<string> {
  const documentFiles = Object.values(application.documents.files).flat();
  return new Set([...documentFiles, ...application.address.addressProof].map((file) => file.id));
}
