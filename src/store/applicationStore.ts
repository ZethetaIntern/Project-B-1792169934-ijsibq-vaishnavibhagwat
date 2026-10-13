import { create } from 'zustand';
import type { ApplicationData, StepId } from '../types/application';
import { createEmptyApplication } from './initialApplication';

export interface ApplicationSnapshot {
  data: ApplicationData;
  currentStepId: StepId;
}

interface ApplicationState extends ApplicationSnapshot {
  /** Set when the user jumped to a step via "Edit" on the review page. */
  returnToReview: boolean;
  /** Bumped on hydrate/reset so mounted step forms re-read their defaults. */
  revision: number;
  updateSection: <K extends StepId>(section: K, values: Partial<ApplicationData[K]>) => void;
  replaceSection: <K extends StepId>(section: K, values: ApplicationData[K]) => void;
  goToStep: (stepId: StepId, options?: { fromReview?: boolean }) => void;
  hydrate: (snapshot: ApplicationSnapshot) => void;
  reset: () => void;
}

const INITIAL_STEP: StepId = 'loan';

/**
 * The central application store (Wizard "step registry + central store" pattern).
 *
 * Step forms own their in-progress field state through React Hook Form and commit
 * into this store on Continue/Back, so data survives step unmounts — Back never
 * wipes earlier steps. Zustand lets components subscribe to the exact slice they
 * read, so typing in one step does not re-render the summary panel or wizard chrome.
 */
export const useApplicationStore = create<ApplicationState>()((set) => ({
  data: createEmptyApplication(),
  currentStepId: INITIAL_STEP,
  returnToReview: false,
  revision: 0,

  updateSection: (section, values) => set((state) => ({
    data: { ...state.data, [section]: { ...state.data[section], ...values } },
  })),

  replaceSection: (section, values) => set((state) => ({
    data: { ...state.data, [section]: values },
  })),

  goToStep: (stepId, options) => set({
    currentStepId: stepId,
    returnToReview: Boolean(options?.fromReview),
  }),

  hydrate: (snapshot) => set((state) => ({
    data: snapshot.data,
    currentStepId: snapshot.currentStepId,
    returnToReview: false,
    revision: state.revision + 1,
  })),

  // Clears all applicant data from memory (used on unmount, Start fresh and submit).
  reset: () => set((state) => ({
    data: createEmptyApplication(),
    currentStepId: INITIAL_STEP,
    returnToReview: false,
    revision: state.revision + 1,
  })),
}));

/** Non-reactive read of the current application, for event handlers and timers. */
export const getApplicationSnapshot = (): ApplicationSnapshot => {
  const { data, currentStepId } = useApplicationStore.getState();
  return { data, currentStepId };
};
