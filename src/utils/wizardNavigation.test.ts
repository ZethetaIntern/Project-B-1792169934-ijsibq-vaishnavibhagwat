import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { getActiveSteps, isStepActive } from '../constants/steps';
import { createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData, LoanType, StepId } from '../types/application';
import {
  canNavigateTo,
  getNextStepId,
  getPreviousStepId,
  getProgress,
  getReachableIndex,
  getReturnToReviewTarget,
  resolveActiveStepId,
} from './wizardNavigation';

const incomplete = new Set<StepId>();

vi.mock('../schemas/schemaFactory', () => ({
  isStepComplete: (stepId: StepId) => !incomplete.has(stepId),
}));

function application(loanType: LoanType | '', loanAmount: number | null): ApplicationData {
  const data = createEmptyApplication();
  data.loan.loanType = loanType;
  data.loan.loanAmount = loanAmount;
  return data;
}

describe('co-applicant step visibility (Step 1 → Step 6)', () => {
  it.each([
    ['personal', 3_00_000, false],
    ['personal', 5_00_000, false],
    ['personal', 5_00_001, true],
    ['home', 50_000, true],
    ['business', 20_00_000, false],
    ['business', 20_00_001, true],
    ['', null, false],
  ] as const)('%s loan of %s → active: %s', (loanType, amount, expected) => {
    expect(isStepActive('coApplicant', application(loanType, amount))).toBe(expected);
  });

  it('keeps every other step active', () => {
    expect(getActiveSteps(application('personal', 1_00_000)).map((step) => step.id)).toEqual([
      'loan', 'personal', 'kyc', 'address', 'employment', 'documents', 'review',
    ]);
    expect(getActiveSteps(application('home', 30_00_000))).toHaveLength(8);
  });
});

describe('step order navigation', () => {
  beforeEach(() => incomplete.clear());

  it('skips the co-applicant step when it is not required', () => {
    const data = application('personal', 3_00_000);
    expect(getNextStepId('employment', data)).toBe('documents');
    expect(getPreviousStepId('documents', data)).toBe('employment');
  });

  it('inserts the co-applicant step when the amount crosses the threshold', () => {
    const data = application('personal', 8_00_000);
    expect(getNextStepId('employment', data)).toBe('coApplicant');
    expect(getPreviousStepId('documents', data)).toBe('coApplicant');
  });

  it('moves off a step that is no longer part of the flow', () => {
    const data = application('personal', 2_00_000);
    expect(resolveActiveStepId('coApplicant', data)).toBe('documents');
    expect(getNextStepId('coApplicant', data)).toBe('review');
    expect(getPreviousStepId('coApplicant', data)).toBe('employment');
    expect(resolveActiveStepId('kyc', data)).toBe('kyc');
  });

  it('has no step before the first or after the last', () => {
    const data = application('home', 40_00_000);
    expect(getPreviousStepId('loan', data)).toBeNull();
    expect(getNextStepId('review', data)).toBeNull();
  });
});

describe('reachability and progress', () => {
  beforeEach(() => incomplete.clear());

  it('allows jumping only up to the first incomplete step', () => {
    const data = application('home', 40_00_000);
    incomplete.add('address');
    incomplete.add('documents');
    expect(getReachableIndex(getActiveSteps(data), data)).toBe(3);
    expect(canNavigateTo('kyc', data)).toBe(true);
    expect(canNavigateTo('address', data)).toBe(true);
    expect(canNavigateTo('employment', data)).toBe(false);
    expect(getProgress(data)).toEqual({ completed: 3, total: 8, percent: 38 });
  });

  it('cannot navigate to an inactive step', () => {
    expect(canNavigateTo('coApplicant', application('personal', 1_00_000))).toBe(false);
  });

  it('returns to review after an edit when everything is valid, else to the gap', () => {
    const data = application('personal', 8_00_000);
    incomplete.add('review');
    expect(getReturnToReviewTarget(data)).toBe('review');
    incomplete.add('coApplicant');
    expect(getReturnToReviewTarget(data)).toBe('coApplicant');
  });

  it('reports full progress when every step is complete', () => {
    expect(getProgress(application('personal', 1_00_000))).toEqual({ completed: 7, total: 7, percent: 100 });
  });
});
