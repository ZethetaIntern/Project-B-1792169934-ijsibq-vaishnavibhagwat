import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { useApplicationStore } from '../../store/applicationStore';
import { createEmptyApplication } from '../../store/initialApplication';
import { createCompleteApplication, createScenario } from '../../test/fixtures';
import { continueButton, renderWizardAt } from '../../test/renderWizard';

beforeEach(() => {
  useApplicationStore.getState().reset();
});

describe('Step 5 — employment', () => {
  it('asks before switching away from filled-in salary details, and clears them on confirm', async () => {
    const user = userEvent.setup();
    await renderWizardAt('employment', createCompleteApplication());
    expect(screen.getByRole('combobox', { name: /Company name/ })).toHaveValue('Infosys');

    await user.click(screen.getByRole('radio', { name: /Self-employed/ }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Switch to Self-employed?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep salaried' }));
    expect(screen.getByRole('combobox', { name: /Company name/ })).toHaveValue('Infosys');

    await user.click(screen.getByRole('radio', { name: /Self-employed/ }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Switch and clear' }));
    // The salaried sub-form collapses with an animation before it unmounts.
    await waitFor(() => expect(screen.queryByRole('combobox', { name: /Company name/ })).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: /Business name/ })).toHaveValue('');
  });

  it('shows the business sub-form with GSTIN for a business owner', async () => {
    await renderWizardAt('employment', createScenario('business', 'businessOwner'));
    expect(screen.getByRole('textbox', { name: /GSTIN/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Salaried.*Not available for Business Loans/ })).toBeInTheDocument();
  });

  it('requires a choice before Continue', async () => {
    const user = userEvent.setup();
    const data = createCompleteApplication();
    data.employment = createEmptyApplication().employment;
    await renderWizardAt('employment', data);
    await user.click(continueButton());
    expect(await screen.findByText('Choose how you earn your income.')).toBeInTheDocument();
  });
});
