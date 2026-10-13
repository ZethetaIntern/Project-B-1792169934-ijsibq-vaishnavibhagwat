import { describe, expect, it } from 'vitest';
import { BYTES_PER_MB, DOCUMENT_SPECS } from '../constants/documents';
import {
  checkSize, sniffFormat, tooManyFilesMessage, validateIncomingFile,
} from './fileValidation';

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46];

function makeFile(name: string, type: string, header: number[], size = 1024): File {
  const bytes = new Uint8Array(size);
  bytes.set(header.slice(0, size));
  return new File([bytes], name, { type });
}

const pdfRules = DOCUMENT_SPECS.bankStatements; // PDF only, 10 MB
const anyRules = DOCUMENT_SPECS.panCard; // PDF/JPG/PNG, 5 MB
const photoRules = DOCUMENT_SPECS.photograph; // JPG/PNG, 2 MB

describe('sniffFormat', () => {
  it('recognises files by their leading bytes', async () => {
    expect(await sniffFormat(makeFile('a', '', PDF_HEADER))).toBe('pdf');
    expect(await sniffFormat(makeFile('a', '', PNG_HEADER))).toBe('png');
    expect(await sniffFormat(makeFile('a', '', JPEG_HEADER))).toBe('jpeg');
    expect(await sniffFormat(makeFile('a', '', [0x4d, 0x5a, 0x90]))).toBeNull();
  });
});

describe('validateIncomingFile', () => {
  it('accepts genuine files of an allowed type', async () => {
    expect(await validateIncomingFile(makeFile('s.pdf', 'application/pdf', PDF_HEADER), pdfRules)).toBeNull();
    expect(await validateIncomingFile(makeFile('p.png', 'image/png', PNG_HEADER), anyRules)).toBeNull();
  });

  it('rejects a type the document does not accept', async () => {
    const message = await validateIncomingFile(makeFile('photo.jpg', 'image/jpeg', JPEG_HEADER), pdfRules);
    expect(message).toBe('“photo.jpg” is not a PDF file. Choose a PDF instead.');
    expect(await validateIncomingFile(makeFile('cv.docx', 'application/msword', [0x50, 0x4b]), anyRules))
      .toMatch(/is not a PDF, JPG or PNG file/);
  });

  it('rejects renamed or damaged files by content', async () => {
    const fake = makeFile('statement.pdf', 'application/pdf', [0x4d, 0x5a, 0x90, 0]);
    expect(await validateIncomingFile(fake, pdfRules)).toMatch(/does not look like a real PDF/);
  });

  it('tolerates a JPG that was saved with a .png name', async () => {
    expect(await validateIncomingFile(makeFile('me.png', 'image/png', JPEG_HEADER), photoRules)).toBeNull();
  });

  it('uses the extension when the browser reports no type', async () => {
    expect(await validateIncomingFile(makeFile('s.PDF', '', PDF_HEADER), pdfRules)).toBeNull();
  });

  it('rejects empty files and PDFs over the limit', async () => {
    expect(await validateIncomingFile(new File([], 'blank.pdf', { type: 'application/pdf' }), pdfRules))
      .toMatch(/is empty/);
    const big = makeFile('big.pdf', 'application/pdf', PDF_HEADER, 11 * BYTES_PER_MB);
    expect(await validateIncomingFile(big, pdfRules)).toBe('“big.pdf” is 11 MB — the limit is 10 MB. Try compressing the PDF or uploading fewer pages.');
  });

  it('lets large images through to compression but refuses huge ones', async () => {
    const photo = makeFile('photo.jpg', 'image/jpeg', JPEG_HEADER, 4.5 * BYTES_PER_MB);
    expect(await validateIncomingFile(photo, photoRules)).toBeNull();
    const huge = makeFile('raw.png', 'image/png', PNG_HEADER, 26 * BYTES_PER_MB);
    expect(await validateIncomingFile(huge, photoRules)).toMatch(/larger than 25 MB/);
  });
});

describe('checkSize and count messages', () => {
  it('explains an image that is still too large after compression', () => {
    const photo = new File(['x'], 'me.jpg', { type: 'image/jpeg' });
    expect(checkSize(photo, 1.5 * BYTES_PER_MB, photoRules)).toBeNull();
    expect(checkSize(photo, 2.5 * BYTES_PER_MB, photoRules)).toMatch(/still 2.5 MB after compression — the limit is 2 MB/);
  });

  it('words the file-count limit for single and multi-file documents', () => {
    expect(tooManyFilesMessage('Photograph', 1)).toBe('Photograph takes one file. Remove the current file to replace it.');
    expect(tooManyFilesMessage('Bank statements', 3)).toBe('Bank statements takes up to 3 files. Remove one to add another.');
  });
});
