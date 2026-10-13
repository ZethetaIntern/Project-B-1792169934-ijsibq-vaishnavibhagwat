import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useApplicationStore } from '../store/applicationStore';
import { createEmptyApplication } from '../store/initialApplication';
import {
  deleteAllDrafts, listDrafts, lockDrafts, saveDraft,
} from '../utils/draftStorage';
import * as submitModule from '../utils/submitApplication';
import { buildSubmissionPayload } from '../utils/submitApplication';
import { useApplicationSubmit } from './useApplicationSubmit';

function application() {
  const data = createEmptyApplication();
  data.loan = {
    ...data.loan, loanType: 'personal', loanAmount: 3_00_000, tenureMonths: 36,
  };
  return data;
}

beforeEach(() => {
  lockDrafts(false);
  deleteAllDrafts();
  useApplicationStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useApplicationSubmit', () => {
  it('submits once even when triggered twice, then clears and locks drafts', async () => {
    await saveDraft({ data: application(), currentStepId: 'review' });
    expect(listDrafts()).toHaveLength(1);
    const spy = vi.spyOn(submitModule, 'submitApplication').mockResolvedValue({
      reference: '6f1c2b1e-0000-4000-8000-000000000000', submittedAt: '2026-10-13T10:00:00.000Z',
    });
    const { result } = renderHook(() => useApplicationSubmit());

    await act(async () => {
      const { submit } = result.current;
      await Promise.all([submit(application()), submit(application())]);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(useApplicationStore.getState().submission?.reference).toBe('6f1c2b1e-0000-4000-8000-000000000000');
    expect(listDrafts()).toEqual([]);
    await expect(saveDraft({ data: application(), currentStepId: 'review' })).rejects.toThrow(/locked/);

    await act(async () => {
      await result.current.submit(application());
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('reports a failure without clearing anything', async () => {
    await saveDraft({ data: application(), currentStepId: 'review' });
    vi.spyOn(submitModule, 'submitApplication').mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApplicationSubmit());
    await act(async () => {
      await result.current.submit(application());
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatch(/Nothing was lost/);
    expect(listDrafts()).toHaveLength(1);
    expect(useApplicationStore.getState().submission).toBeNull();
  });
});

describe('submitApplication', () => {
  it('generates a UUID reference after the simulated round trip', async () => {
    vi.useFakeTimers();
    const pending = submitModule.submitApplication(application());
    await vi.advanceTimersByTimeAsync(submitModule.SUBMIT_LATENCY_MS);
    const receipt = await pending;
    expect(receipt.reference).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('leaves out a co-applicant and documents that do not apply', () => {
    const data = application();
    data.coApplicant.fullName = 'Ravi Verma';
    data.documents.files = {
      itr: [{
        id: 'x', name: 'itr.pdf', mimeType: 'application/pdf', originalSize: 1, size: 1, compressed: false, uploadedAt: '', verified: true,
      }],
    };
    data.employment.employmentType = 'salaried';
    const payload = buildSubmissionPayload(data);
    expect(payload.coApplicant.fullName).toBe('');
    expect(payload.documents.files).toEqual({});
  });
});
