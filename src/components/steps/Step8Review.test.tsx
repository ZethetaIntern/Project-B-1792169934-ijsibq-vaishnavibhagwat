import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { isStepComplete } from '../../schemas/schemaFactory';
import { useApplicationStore } from '../../store/applicationStore';
import { createCompleteApplication } from '../../test/fixtures';
import { lockDrafts } from '../../utils/draftStorage';
import * as submitModule from '../../utils/submitApplication';
import { ToastProvider } from '../common/Toast';
import { Wizard } from '../wizard/Wizard';

const CONSENTS = [/true, complete and accurate/, /get my credit report/, /I have read and agree/, /receive updates/];

function renderReview(data = createCompleteApplication()) {
  act(() => useApplicationStore.getState().hydrate({ data, currentStepId: 'review' }));
  return render(<ToastProvider><Wizard /></ToastProvider>);
}

beforeEach(() => {
  lockDrafts(false);
  useApplicationStore.getState().reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Step 8 — review and submit', () => {
  it('uses a fixture that satisfies every earlier step', () => {
    const data = createCompleteApplication();
    (['loan', 'personal', 'kyc', 'address', 'employment', 'documents'] as const)
      .forEach((step) => expect(isStepComplete(step, data)).toBe(true));
  });

  it('keeps Submit disabled until all four separate consents are ticked, then submits once', async () => {
    const user = userEvent.setup();
    let resolve: (value: { reference: string; submittedAt: string }) => void = () => {};
    const spy = vi.spyOn(submitModule, 'submitApplication').mockImplementation(() => new Promise((done) => {
      resolve = done;
    }));
    renderReview();

    // The step is code-split; the first import can take a moment under test.
    expect(await screen.findByRole('heading', { name: /Key fact statement/i }, { timeout: 5000 }))
      .toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit application' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription(/Tick the 4 remaining consents/);

    const boxes = CONSENTS.map((label) => screen.getByLabelText(label));
    boxes.forEach((box) => expect(box).not.toBeChecked());
    await user.click(boxes[0]);
    await user.click(boxes[1]);
    await user.click(boxes[2]);
    expect(submit).toHaveAccessibleDescription(/Tick the remaining consent/);
    await user.click(boxes[3]);
    expect(submit).toBeEnabled();

    await user.click(submit);
    await user.click(submit);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await act(async () => resolve({ reference: 'b7e0c7d2-1111-4222-8333-444455556666', submittedAt: '2026-10-13T10:00:00.000Z' }));

    const dialog = await screen.findByRole('dialog', { name: 'Application submitted' });
    expect(within(dialog).getByText('b7e0c7d2-1111-4222-8333-444455556666')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('asks for an extra acknowledgement when the EMI is above half the income', async () => {
    const data = createCompleteApplication();
    data.employment.monthlySalary = 16_000; // EMI ≈ ₹9,751 → 61%
    renderReview(data);
    expect(await screen.findByText(/Your EMI is 60.9% of your monthly income/)).toBeInTheDocument();
    expect(screen.getByLabelText(/more than half of my monthly income/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Submit application' }))
      .toHaveAccessibleDescription(/Acknowledge the high EMI warning/);
  });

  it('masks identifiers until the applicant reveals them', async () => {
    const user = userEvent.setup();
    renderReview();
    const kyc = await screen.findByTestId('review-kyc');
    expect(within(kyc).getByText('••••••234F')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show sensitive details' }));
    expect(within(kyc).getByText('ABCPE1234F')).toBeInTheDocument();
  });

  it('jumps to a step from Edit and offers a way straight back', async () => {
    const user = userEvent.setup();
    renderReview();
    await user.click(await screen.findByRole('button', { name: 'Edit Where you live' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Where you live' })).toBeInTheDocument();
    expect(useApplicationStore.getState().returnToReview).toBe(true);
  });
});
