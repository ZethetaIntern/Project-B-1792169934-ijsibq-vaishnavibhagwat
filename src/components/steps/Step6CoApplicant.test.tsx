import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { useApplicationStore } from '../../store/applicationStore';
import { createEmptyApplication } from '../../store/initialApplication';
import { createScenario } from '../../test/fixtures';
import { continueButton, renderWizardAt } from '../../test/renderWizard';

function homeLoan(maritalStatus: 'married' | 'single') {
  const data = createScenario('home', 'salaried');
  data.personal.maritalStatus = maritalStatus;
  data.coApplicant = createEmptyApplication().coApplicant;
  return data;
}

beforeEach(() => {
  useApplicationStore.getState().reset();
});

describe('Step 6 — co-applicant', () => {
  it('explains why it appeared and pre-selects Spouse for married applicants', async () => {
    await renderWizardAt('coApplicant', homeLoan('married'));
    expect(screen.getByText(/Home Loans always need a co-applicant/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Relationship to you/ })).toHaveValue('spouse');
  });

  it('does not offer Spouse to an unmarried applicant', async () => {
    await renderWizardAt('coApplicant', homeLoan('single'));
    const relationship = screen.getByRole('combobox', { name: /Relationship to you/ });
    expect(relationship).toHaveValue('');
    expect(screen.queryByRole('option', { name: 'Spouse' })).not.toBeInTheDocument();
    expect(screen.getByText('Spouse is available when you are married (Step 2).')).toBeInTheDocument();
  });

  it('requires the co-applicant consent and signature', async () => {
    const user = userEvent.setup();
    await renderWizardAt('coApplicant', homeLoan('married'));
    await user.click(continueButton());
    expect(await screen.findByText('Your co-applicant must give their consent to continue.')).toBeInTheDocument();
    expect(screen.getByText(/Your co-applicant needs to sign/)).toBeInTheDocument();
  });
});
