import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { ToastProvider } from '../components/common/Toast';
import { Wizard } from '../components/common/Wizard';
import { useApplicationStore } from '../store/applicationStore';
import { createCompleteApplication } from '../test/fixtures';
import { fillDemoStep } from './fillDemoStep';
import { getDemoScenario } from './scenarios';

const scenario = getDemoScenario('personal-salaried')!;

function renderAt(stepId: 'loan' | 'kyc' | 'review') {
  const data = stepId === 'loan' ? useApplicationStore.getState().data : createCompleteApplication();
  act(() => useApplicationStore.getState().hydrate({ data, currentStepId: stepId }));
  return render(<ToastProvider><Wizard /></ToastProvider>);
}

const continueButton = () => screen.getByRole('button', { name: /Continue|Review application/ });

beforeEach(() => {
  useApplicationStore.getState().reset();
});

describe('fillDemoStep', () => {
  it('fills the open step, and Continue moves on only through the normal validation', async () => {
    const user = userEvent.setup();
    renderAt('loan');
    await waitFor(() => expect(continueButton()).toBeEnabled(), { timeout: 5000 });

    const outcome = await act(() => fillDemoStep(scenario, useApplicationStore.getState().data));
    expect(outcome.filled).toBe(true);
    expect(screen.getByRole('textbox', { name: /Loan amount/ })).toHaveValue('3,00,000');

    await user.click(continueButton());
    expect(await screen.findByRole('heading', { level: 1, name: 'About you' }, { timeout: 5000 })).toBeInTheDocument();
    expect(useApplicationStore.getState().data.loan.loanAmount).toBe(3_00_000);
  });

  it('leaves identity checks to the person, so an unverified PAN still blocks Continue', async () => {
    const user = userEvent.setup();
    renderAt('kyc');
    await waitFor(() => expect(continueButton()).toBeEnabled(), { timeout: 5000 });
    const outcome = await act(() => fillDemoStep(scenario, useApplicationStore.getState().data));
    expect(outcome.message).toMatch(/Select Verify on the PAN and the Aadhaar number/);

    await user.click(continueButton());
    expect(await screen.findByText(/PAN has not been verified yet/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Verify your identity' })).toBeInTheDocument();
  });

  it('never ticks consents on the review step', async () => {
    renderAt('review');
    await screen.findByRole('heading', { name: /Key fact statement/i }, { timeout: 5000 });
    const outcome = await act(() => fillDemoStep(scenario, useApplicationStore.getState().data));
    expect(outcome).toEqual({ filled: false, message: expect.stringMatching(/Consents are yours to give/) });
    screen.getAllByRole('checkbox').forEach((box) => expect(box).not.toBeChecked());
  });
});
