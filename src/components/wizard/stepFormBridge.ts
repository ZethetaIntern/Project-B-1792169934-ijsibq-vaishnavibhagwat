import { getApplicationSnapshot } from '../../store/applicationStore';
import type { ApplicationData, StepId } from '../../types/application';

/**
 * Contract between the Wizard (which owns navigation) and the active step's
 * React Hook Form instance (which owns in-progress field state).
 */
export interface StepController<K extends StepId = StepId> {
  stepId: K;
  /** Validates the step; on success commits the parsed values to the store. */
  validate: () => Promise<boolean>;
  /** Current (possibly invalid, partially filled) values — used by Back and auto-save. */
  getValues: () => ApplicationData[K];
  /** Replaces the form values, e.g. demo data. Validation still runs on Continue. */
  fill: (values: ApplicationData[K]) => void;
}

let activeController: StepController | null = null;

export const stepFormBridge = {
  attach(controller: StepController) {
    activeController = controller;
  },
  detach(controller: StepController) {
    if (activeController === controller) activeController = null;
  },
  get(): StepController | null {
    return activeController;
  },
};

/**
 * The application as the user currently sees it: committed steps from the store
 * plus the open step's unsaved field values. This is what auto-save serialises.
 */
export function getLiveApplicationData(): ApplicationData {
  const { data } = getApplicationSnapshot();
  const controller = activeController;
  if (!controller) return data;
  return { ...data, [controller.stepId]: controller.getValues() };
}
