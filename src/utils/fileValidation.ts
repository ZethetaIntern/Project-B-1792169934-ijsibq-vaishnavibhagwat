import {
  BYTES_PER_MB, describeFormats, FILE_FORMATS, type FileFormat, type UploadRules,
} from '../constants/documents';
import { formatBytes } from './format';

/**
 * Images are compressed before their size is checked, so a 4.5 MB phone photo can
 * still meet a 2 MB limit. Anything bigger than this is refused before decoding, to
 * protect memory on low-end phones.
 */
export const MAX_RAW_IMAGE_MB = 25;

/** Leading "magic" bytes of each accepted format. */
const SIGNATURES: Record<FileFormat, readonly number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

function readHeader(file: Blob, length: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, length));
  });
}

/** Identifies a file by its contents rather than its name or reported type. */
export async function sniffFormat(file: Blob): Promise<FileFormat | null> {
  const header = await readHeader(file, 8);
  const match = (Object.entries(SIGNATURES) as [FileFormat, readonly number[]][])
    .find(([, signature]) => signature.every((byte, index) => header[index] === byte));
  return match?.[0] ?? null;
}

/** The accepted format a file claims to be, by MIME type or, failing that, extension. */
export function declaredFormat(file: File, formats: readonly FileFormat[]): FileFormat | null {
  const name = file.name.toLowerCase();
  return formats.find((format) => {
    const { mimeType, extensions } = FILE_FORMATS[format];
    return file.type === mimeType || (!file.type && extensions.some((ext) => name.endsWith(ext)));
  }) ?? null;
}

const quoted = (file: File) => `“${file.name}”`;

/** Size check, applied to images after compression and to PDFs as they are. */
export function checkSize(file: File, size: number, rules: UploadRules): string | null {
  if (size <= rules.maxSizeMb * BYTES_PER_MB) return null;
  return file.type.startsWith('image/')
    ? `${quoted(file)} is still ${formatBytes(size)} after compression — the limit is ${rules.maxSizeMb} MB. Try a smaller photo.`
    : `${quoted(file)} is ${formatBytes(size)} — the limit is ${rules.maxSizeMb} MB. Try compressing the PDF or uploading fewer pages.`;
}

/**
 * Checks that can run before any processing: format (by type and by content),
 * emptiness and, for PDFs, the size limit. Returns a specific, actionable message
 * or `null` when the file may proceed.
 */
export async function validateIncomingFile(
  file: File,
  rules: UploadRules,
): Promise<string | null> {
  const accepted = describeFormats(rules.formats);
  const format = declaredFormat(file, rules.formats);
  if (!format) return `${quoted(file)} is not a ${accepted} file. Choose a ${accepted} instead.`;
  if (file.size === 0) return `${quoted(file)} is empty. Choose the file again or try a different copy.`;

  // A JPG saved with a .png name is harmless (it is re-encoded anyway); a renamed
  // .exe or a truncated download is not.
  const actual = await sniffFormat(file);
  const imageMixUp = actual !== null && actual !== 'pdf' && format !== 'pdf'
    && rules.formats.includes(actual);
  if (actual !== format && !imageMixUp) {
    return `${quoted(file)} does not look like a real ${FILE_FORMATS[format].label} — it may be damaged or renamed.`;
  }

  if (format === 'pdf') return checkSize(file, file.size, rules);
  if (file.size > MAX_RAW_IMAGE_MB * BYTES_PER_MB) {
    return `${quoted(file)} is ${formatBytes(file.size)}. Images larger than ${MAX_RAW_IMAGE_MB} MB cannot be processed — try a lower-resolution photo.`;
  }
  return null;
}

/** Message when a drop would exceed the per-document file count. */
export function tooManyFilesMessage(label: string, maxFiles: number): string {
  return maxFiles === 1
    ? `${label} takes one file. Remove the current file to replace it.`
    : `${label} takes up to ${maxFiles} files. Remove one to add another.`;
}
