import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { useApplicationStore } from '../../store/applicationStore';
import { createEmptyApplication } from '../../store/initialApplication';
import { createCompleteApplication } from '../../test/fixtures';
import { continueButton, renderWizardAt } from '../../test/renderWizard';

const SLOW = { timeout: 4000 };

function application() {
  const data = createCompleteApplication();
  data.personal = createEmptyApplication().personal;
  return data;
}

beforeEach(() => {
  useApplicationStore.getState().reset();
});

describe('Step 2 — personal details', () => {
  it('verifies the mobile number with the on-screen one-time code', async () => {
    const user = userEvent.setup();
    await renderWizardAt('personal', application());
    const mobile = screen.getByRole('textbox', { name: /Mobile number/ });
    await user.type(mobile, '9000012345');
    await user.click(screen.getByRole('button', { name: 'Verify mobile number' }));

    const code = (await screen.findByTestId('demo-otp', {}, SLOW)).textContent ?? '';
    const otpInput = screen.getByLabelText(/Enter the 6-digit code sent to \+91 9000012345/);
    await user.type(otpInput, code);
    await user.click(screen.getByRole('button', { name: 'Verify code' }));

    await waitFor(() => expect(screen.queryByLabelText(/Enter the 6-digit code/)).not.toBeInTheDocument(), SLOW);
    const field = mobile.closest('div')?.parentElement as HTMLElement;
    expect(within(field).getByText('Verified')).toBeInTheDocument();
  });

  it('explains a wrong code and keeps the number unverified', async () => {
    const user = userEvent.setup();
    await renderWizardAt('personal', application());
    await user.type(screen.getByRole('textbox', { name: /Mobile number/ }), '9000012345');
    await user.click(screen.getByRole('button', { name: 'Verify mobile number' }));
    const code = (await screen.findByTestId('demo-otp', {}, SLOW)).textContent ?? '';
    const wrong = code.split('').map((digit) => String((Number(digit) + 1) % 10)).join('');
    await user.type(screen.getByLabelText(/Enter the 6-digit code/), wrong);
    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(await screen.findByText("That code doesn't match. 2 attempts left.", {}, SLOW)).toBeInTheDocument();
  });

  it('blocks Continue until every required answer is given', async () => {
    const user = userEvent.setup();
    await renderWizardAt('personal', application());
    await user.click(continueButton());
    expect(await screen.findByText('Enter your date of birth.')).toBeInTheDocument();
    expect(screen.getByText('Select your gender.')).toBeInTheDocument();
    expect(screen.getByText('Enter your mobile number.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'About you' })).toBeInTheDocument();
  });
});
