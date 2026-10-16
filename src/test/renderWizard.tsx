import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import { expect } from 'vitest';
import { ToastProvider } from '../components/common/Toast';
import { Wizard } from '../components/common/Wizard';
import { useApplicationStore } from '../store/applicationStore';
import type { ApplicationData, StepId } from '../types/application';

/**
 * Renders the real Wizard on `stepId` with `data` in the store and waits until the
 * (code-split) step has mounted, i.e. Continue is enabled.
 */
export async function renderWizardAt(stepId: StepId, data: ApplicationData) {
  act(() => useApplicationStore.getState().hydrate({ data, currentStepId: stepId }));
  const view = render(<ToastProvider><Wizard /></ToastProvider>);
  await waitFor(
    () => expect(screen.getByRole('button', { name: /Continue|Review application/ })).toBeEnabled(),
    { timeout: 5000 },
  );
  return view;
}

export const continueButton = () => screen.getByRole('button', { name: /Continue|Review application/ });
