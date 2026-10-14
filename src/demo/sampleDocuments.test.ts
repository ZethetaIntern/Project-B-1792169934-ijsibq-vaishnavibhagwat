import { describe, expect, it } from 'vitest';
import { DOCUMENT_SPECS } from '../constants/documents';
import { validateIncomingFile } from '../utils/fileValidation';
import { createSamplePdf } from './sampleDocuments';

describe('createSamplePdf', () => {
  it('writes a valid PDF that passes the real upload checks', async () => {
    const file = createSamplePdf('statement.pdf', 'Bank statements (Apr) - sample');
    expect(file.type).toBe('application/pdf');
    expect(await validateIncomingFile(file, DOCUMENT_SPECS.bankStatements)).toBeNull();

    const text = await file.text();
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain(String.raw`(Bank statements \(Apr\) - sample) Tj`);
    const startXref = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(text.slice(startXref).startsWith('xref')).toBe(true);
    const firstObjectOffset = Number(text.match(/0000000000 65535 f \n(\d{10})/)?.[1]);
    expect(text.slice(firstObjectOffset).startsWith('1 0 obj')).toBe(true);
  });
});
