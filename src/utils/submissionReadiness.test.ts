import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { ReviewConsents } from '../types/application';
import { getSubmissionBlockers } from './submissionReadiness';

const NONE: ReviewConsents = {
  accuracy: false,
  creditCheck: false,
  terms: false,
  communication: false,
  highEmiAcknowledged: false,
};

describe('getSubmissionBlockers', () => {
  it('lists unfinished steps, missing documents, signature, consents and connectivity', () => {
    const data = createEmptyApplication();
    data.loan = {
      ...data.loan, loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36,
    };
    data.employment.employmentType = 'salaried';
    const ids = getSubmissionBlockers(data, NONE, false).map((blocker) => blocker.id);
    expect(ids).toEqual([
      'step-loan', 'step-personal', 'step-kyc', 'step-address', 'step-employment',
      'document-panCard', 'document-aadhaarCard', 'document-salarySlips', 'document-bankStatements', 'document-photograph',
      'signature', 'consents', 'offline',
    ]);
  });

  it('words the consent reminder by how many remain and links fixes to their step', () => {
    const data = createEmptyApplication();
    const blockers = getSubmissionBlockers(data, {
      ...NONE, accuracy: true, creditCheck: true, terms: true,
    }, true);
    expect(blockers.find((item) => item.id === 'consents')?.message).toBe('Tick the remaining consent.');
    expect(blockers.find((item) => item.id === 'signature')?.stepId).toBe('documents');
    expect(blockers.some((item) => item.id === 'offline')).toBe(false);
  });
});
