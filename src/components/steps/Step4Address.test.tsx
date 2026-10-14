import { screen, waitFor } from '@testing-library/react';
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
  data.address = createEmptyApplication().address;
  return data;
}

beforeEach(() => {
  useApplicationStore.getState().reset();
});

describe('Step 4 — address', () => {
  it('fills city and state from the PIN code', async () => {
    const user = userEvent.setup();
    await renderWizardAt('address', application());
    const [pin] = screen.getAllByRole('textbox', { name: /PIN code/ });
    await user.type(pin, '560001');
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: /City or town/ })[0]).toHaveValue('Bengaluru'), SLOW);
    expect(screen.getAllByRole('combobox', { name: /State or union territory/ })[0]).toHaveValue('Karnataka');
    expect(screen.getByText('Post office: Bengaluru G.P.O')).toBeInTheDocument();
  });

  it('asks for rent when renting and a previous address after under a year', async () => {
    const user = userEvent.setup();
    await renderWizardAt('address', application());
    expect(screen.queryByRole('textbox', { name: /Monthly rent/ })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /This home is/ }), 'rented');
    expect(await screen.findByRole('textbox', { name: /Monthly rent/ })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /Years at this address/ }), '0');
    expect(await screen.findByRole('heading', { name: 'Previous address' })).toBeInTheDocument();

    await user.click(continueButton());
    expect(await screen.findByText('Enter the rent you pay each month.')).toBeInTheDocument();
    expect(screen.getByText(/Enter the first line of your previous address/)).toBeInTheDocument();
  });

  it('shows the permanent address fields when it differs from the current one', async () => {
    const user = userEvent.setup();
    await renderWizardAt('address', application());
    expect(screen.getAllByRole('textbox', { name: /Address line 1/ })).toHaveLength(1);
    await user.click(screen.getByLabelText('My permanent address is the same as my current address'));
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: /Address line 1/ })).toHaveLength(2));
  });
});
