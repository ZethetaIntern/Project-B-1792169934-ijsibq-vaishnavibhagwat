import { getActiveSteps, STEP_ORDER, type StepMeta } from '../constants/steps';
import { isStepComplete } from '../schemas/schemaFactory';
import type { ApplicationData, StepId } from '../types/application';

/**
 * Index of the first active step whose stored data does not satisfy its schema,
 * or `steps.length` when every step is complete. Everything before it is valid,
 * so the user may freely jump back and forth up to (and including) this step.
 */
export function getFirstIncompleteIndex(steps: readonly StepMeta[], data: ApplicationData): number {
  const index = steps.findIndex((step) => !isStepComplete(step.id, data));
  return index === -1 ? steps.length : index;
}

/** Furthest step index the user may navigate to. */
export function getReachableIndex(steps: readonly StepMeta[], data: ApplicationData): number {
  return Math.min(getFirstIncompleteIndex(steps, data), steps.length - 1);
}

export function canNavigateTo(stepId: StepId, data: ApplicationData): boolean {
  const steps = getActiveSteps(data);
  const index = steps.findIndex((step) => step.id === stepId);
  return index !== -1 && index <= getReachableIndex(steps, data);
}

/**
 * If the current step stopped being part of the flow (e.g. the co-applicant step
 * after the loan amount was lowered), move to the next active step in canonical order.
 */
export function resolveActiveStepId(stepId: StepId, data: ApplicationData): StepId {
  const activeIds = getActiveSteps(data).map((step) => step.id);
  if (activeIds.includes(stepId)) return stepId;
  const canonicalIndex = STEP_ORDER.indexOf(stepId);
  return STEP_ORDER.slice(canonicalIndex + 1).find((id) => activeIds.includes(id))
    ?? activeIds[activeIds.length - 1];
}

export function getNextStepId(stepId: StepId, data: ApplicationData): StepId | null {
  const steps = getActiveSteps(data);
  const index = steps.findIndex((step) => step.id === resolveActiveStepId(stepId, data));
  return steps[index + 1]?.id ?? null;
}

export function getPreviousStepId(stepId: StepId, data: ApplicationData): StepId | null {
  const steps = getActiveSteps(data);
  const index = steps.findIndex((step) => step.id === stepId);
  if (index === -1) {
    // Current step is no longer active: go to the closest active step before it.
    const canonicalIndex = STEP_ORDER.indexOf(stepId);
    const activeIds = steps.map((step) => step.id);
    const earlier = STEP_ORDER.slice(0, canonicalIndex).reverse();
    return earlier.find((id) => activeIds.includes(id)) ?? null;
  }
  return steps[index - 1]?.id ?? null;
}

/**
 * Where Continue should lead after an edit started from the review page: straight
 * back to review if everything in between is still valid, otherwise to the first
 * step that now needs attention (e.g. a newly required co-applicant step).
 */
export function getReturnToReviewTarget(data: ApplicationData): StepId {
  const steps = getActiveSteps(data);
  return steps[getReachableIndex(steps, data)].id;
}

export interface WizardProgress {
  completed: number;
  total: number;
  percent: number;
}

export function getProgress(data: ApplicationData): WizardProgress {
  const steps = getActiveSteps(data);
  const completed = getFirstIncompleteIndex(steps, data);
  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
  };
}
