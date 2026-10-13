import { z } from 'zod';

/** Adds a custom issue to a specific field path (keeps superRefine bodies readable). */
export function fail(ctx: z.RefinementCtx, path: (string | number)[], message: string): void {
  ctx.addIssue({ code: 'custom', path, message });
}

/** A number field that may be empty (`null`) until the user fills it in. */
export const optionalNumber = z.number().nullable();

/** A choice field stored as '' until selected; tolerates `null` from unchecked radios. */
export const choice = z.string().nullable().transform((value) => value ?? '');

/**
 * Normalises free text: Unicode NFC, strips control and zero-width characters,
 * collapses runs of whitespace and trims. Applied to every free-text field so
 * pasted content cannot smuggle invisible characters into the application.
 */
export function sanitizeText(value: string): string {
  return value
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const text = z.string().transform(sanitizeText);

/** Metadata of a file held in the document vault (the binary is stored separately). */
export const uploadedDocument = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  originalSize: z.number(),
  size: z.number(),
  compressed: z.boolean(),
  uploadedAt: z.string(),
});
