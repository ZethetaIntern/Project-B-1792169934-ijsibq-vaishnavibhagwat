import { render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { useApplicationStore } from '../../store/applicationStore';
import { createScenario } from '../../test/fixtures';
import type { ApplicationData } from '../../types/application';
import { LoanLedger } from './LoanLedger';

const showLedger = (data: ApplicationData) => {
  useApplicationStore.getState().hydrate({ data, currentStepId: 'review' });
  render(<LoanLedger />);
};

beforeEach(() => {
  useApplicationStore.getState().reset();
});

describe('LoanLedger', () => {
  it('invites the person to choose a loan before there is anything to estimate', () => {
    render(<LoanLedger />);
    expect(screen.getByText('Your estimate appears here')).toBeInTheDocument();
  });

  it('breaks the loan into principal, interest and fee, and checks affordability', () => {
    showLedger(createScenario('home', 'salaried'));
    expect(screen.getByText('Home Loan')).toBeInTheDocument();
    expect(screen.getAllByText('₹40,00,000')).toHaveLength(2); // headline and principal
    expect(screen.getByRole('img', { name: /^Of ₹[\d,]+ payable: principal ₹40,00,000, interest/ })).toBeInTheDocument();
    expect(screen.getByText(/^Within the 50% guideline\. About ₹[\d,]+ a month remains after EMI\.$/)).toBeInTheDocument();
  });

  it('counts rent in what remains each month', () => {
    const data = createScenario('personal', 'salaried');
    data.address = { ...data.address, residenceType: 'rented', monthlyRent: 15_000 };
    showLedger(data);
    expect(screen.getByText(/remains after EMI and rent\.$/)).toBeInTheDocument();
  });

  it('warns when the EMI is more than half of the monthly income', () => {
    const data = createScenario('personal', 'salaried');
    data.employment = { ...data.employment, monthlySalary: 15_000 };
    showLedger(data);
    expect(screen.getByText(/^Above the 50% guideline/)).toBeInTheDocument();
  });
});
