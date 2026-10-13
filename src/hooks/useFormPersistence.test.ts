import { act, renderHook } from '@testing-library/react';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { getApplicationSnapshot, useApplicationStore } from '../store/applicationStore';
import { createEmptyApplication } from '../store/initialApplication';
import { listDrafts, saveDraft } from '../utils/draftStorage';
import { useFormPersistence } from './useFormPersistence';

async function seedDraft() {
  const data = createEmptyApplication();
  data.loan = {
    ...data.loan, loanType: 'home', loanAmount: 45_00_000, tenureMonths: 240,
  };
  data.personal.fullName = 'Asha Verma';
  await saveDraft({ data, currentStepId: 'kyc' }, 'other-tab');
}

describe('useFormPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useApplicationStore.getState().reset();
  });

  it('is ready immediately when there is nothing to resume', () => {
    const { result } = renderHook(() => useFormPersistence());
    expect(result.current.phase).toBe('ready');
  });

  it('offers a saved draft and restores it to the saved step', async () => {
    await seedDraft();
    const { result } = renderHook(() => useFormPersistence());
    expect(result.current.phase).toBe('prompt');
    expect(result.current.drafts[0]).toMatchObject({ loanType: 'home', step: 'kyc' });

    await act(async () => {
      await result.current.resume(result.current.drafts[0].key);
    });
    expect(result.current.phase).toBe('ready');
    const { data, currentStepId } = getApplicationSnapshot();
    expect(currentStepId).toBe('kyc');
    expect(data.personal.fullName).toBe('Asha Verma');
  });

  it('discards a tampered draft and explains why', async () => {
    await seedDraft();
    localStorage.setItem('lendswift_draft_home', 'v1.dGFtcGVyZWQ=');
    const { result } = renderHook(() => useFormPersistence());
    await act(async () => {
      await result.current.resume('lendswift_draft_home');
    });
    expect(result.current.phase).toBe('failed');
    expect(result.current.failure).toMatch(/damaged or was changed/);
    expect(listDrafts()).toEqual([]);
    act(() => result.current.acknowledgeFailure());
    expect(result.current.phase).toBe('ready');
  });

  it('starts fresh by deleting drafts and clearing the form', async () => {
    await seedDraft();
    useApplicationStore.getState().updateSection('personal', { fullName: 'Someone' });
    const { result } = renderHook(() => useFormPersistence());
    act(() => result.current.startFresh());
    expect(listDrafts()).toEqual([]);
    expect(getApplicationSnapshot().data.personal.fullName).toBe('');
    expect(result.current.phase).toBe('ready');
  });
});
