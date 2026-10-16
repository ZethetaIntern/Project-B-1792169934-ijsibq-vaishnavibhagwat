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

  it('adds, validates and removes previous employers (useFieldArray)', async () => {
    const user = userEvent.setup();
    await renderWizardAt('employment', createCompleteApplication());

    await user.click(screen.getByRole('button', { name: 'Add a previous employer' }));
    const first = screen.getByRole('group', { name: 'Previous employer 1' });
    expect(within(first).getByRole('textbox', { name: /Company name/ })).toHaveFocus();

    await user.click(continueButton());
    expect(await within(first).findByText('Enter the company name.')).toBeInTheDocument();
    expect(within(first).getByText('Enter the job title you held.')).toBeInTheDocument();

    await user.type(within(first).getByRole('textbox', { name: /Company name/ }), 'Wipro');
    await user.type(within(first).getByRole('textbox', { name: /Job title/ }), 'Analyst');
    await user.type(within(first).getByRole('textbox', { name: /Years there/ }), '9');
    expect(await screen.findByText(/previous jobs add up to 9 years, more than the 6 years/)).toBeInTheDocument();

    await user.clear(within(first).getByRole('textbox', { name: /Years there/ }));
    await user.type(within(first).getByRole('textbox', { name: /Years there/ }), '2');
    await waitFor(() => expect(screen.queryByText(/previous jobs add up to/)).not.toBeInTheDocument());
    expect(useApplicationStore.getState().data.employment.previousEmployers)
      .toEqual([{ companyName: 'Wipro', designation: 'Analyst', years: 2 }]);

    await user.click(screen.getByRole('button', { name: 'Add another' }));
    await user.click(screen.getByRole('button', { name: 'Remove previous employer 2' }));
    expect(screen.queryByRole('group', { name: 'Previous employer 2' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add another' })).toHaveFocus());
    expect(screen.getByText('Previous employer 2 removed.')).toBeInTheDocument();
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
