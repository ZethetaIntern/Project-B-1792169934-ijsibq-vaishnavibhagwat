import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { getApplicationSnapshot, useApplicationStore } from './applicationStore';
import { createEmptyApplication } from './initialApplication';

describe('applicationStore', () => {
  beforeEach(() => {
    useApplicationStore.getState().reset();
  });

  it('starts with an empty application on the loan step', () => {
    const { data, currentStepId } = getApplicationSnapshot();
    expect(currentStepId).toBe('loan');
    expect(data).toEqual(createEmptyApplication());
  });

  it('merges partial section updates without touching other sections', () => {
    const { updateSection } = useApplicationStore.getState();
    updateSection('loan', { loanType: 'home', loanAmount: 25_00_000 });
    updateSection('personal', { fullName: 'Asha Verma' });
    updateSection('loan', { tenureMonths: 240 });

    const { data } = getApplicationSnapshot();
    expect(data.loan).toMatchObject({ loanType: 'home', loanAmount: 25_00_000, tenureMonths: 240 });
    expect(data.personal.fullName).toBe('Asha Verma');
    expect(data.kyc).toEqual(createEmptyApplication().kyc);
  });

  it('tracks navigation and the return-to-review flag', () => {
    const { goToStep } = useApplicationStore.getState();
    goToStep('kyc', { fromReview: true });
    expect(useApplicationStore.getState()).toMatchObject({ currentStepId: 'kyc', returnToReview: true });
    goToStep('address');
    expect(useApplicationStore.getState().returnToReview).toBe(false);
  });

  it('hydrates a saved snapshot and clears everything on reset', () => {
    const saved = createEmptyApplication();
    saved.loan.loanType = 'business';
    const before = useApplicationStore.getState().revision;

    useApplicationStore.getState().hydrate({ data: saved, currentStepId: 'employment' });
    expect(getApplicationSnapshot()).toEqual({ data: saved, currentStepId: 'employment' });
    expect(useApplicationStore.getState().revision).toBe(before + 1);

    useApplicationStore.getState().reset();
    expect(getApplicationSnapshot().data.loan.loanType).toBe('');
  });

  it('replaces a whole section', () => {
    const coApplicant = { ...createEmptyApplication().coApplicant, fullName: 'Ravi Verma' };
    useApplicationStore.getState().replaceSection('coApplicant', coApplicant);
    expect(getApplicationSnapshot().data.coApplicant).toEqual(coApplicant);
  });
});
