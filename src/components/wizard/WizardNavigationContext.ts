import { createContext, useContext } from 'react';
import type { StepId } from '../../types/application';

export interface WizardNavigation {
  /**
   * Saves the open step (without validating) and jumps to an already reachable step.
   * `fromReview` makes Continue on that step return straight to the review page.
   */
  goTo: (stepId: StepId, options?: { fromReview?: boolean }) => void;
}

export const WizardNavigationContext = createContext<WizardNavigation | null>(null);

export function useWizardNavigation(): WizardNavigation {
  const context = useContext(WizardNavigationContext);
  if (!context) throw new Error('useWizardNavigation must be used inside <Wizard>.');
  return context;
}
