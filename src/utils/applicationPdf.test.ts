import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import { createApplicationSummaryPdf } from './applicationPdf';

describe('createApplicationSummaryPdf', () => {
  it('builds a PDF with the reference, key facts and masked identifiers', async () => {
    const data = createEmptyApplication();
    data.loan = {
      ...data.loan, loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36, purpose: 'medical',
    };
    data.personal.fullName = 'Asha Verma';
    data.kyc.pan = 'ABCPE1234F';
    data.employment.employmentType = 'salaried';
    const doc = await createApplicationSummaryPdf(data, {
      reference: '6f1c2b1e-1234-4abc-8def-000000000001',
      submittedAt: '2026-10-13T10:00:00.000Z',
    });
    const output = doc.output();
    expect(output.startsWith('%PDF-')).toBe(true);
    expect(output).toContain('6f1c2b1e-1234-4abc-8def-000000000001');
    expect(output).toContain('Rs 3,00,000');
    expect(output).toContain('Asha Verma');
    expect(output).not.toContain('ABCPE1234F');
  });
});
