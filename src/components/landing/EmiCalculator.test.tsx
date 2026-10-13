import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe, expect, it, vi,
} from 'vitest';
import { estimateLoan } from '../../utils/emiCalculator';
import { formatINR } from '../../utils/format';
import { EmiCalculator } from './EmiCalculator';

describe('EmiCalculator', () => {
  it('shows the EMI for the chosen product, amount and tenure', () => {
    render(<EmiCalculator onApply={() => {}} />);
    expect(screen.getByTestId('landing-emi')).toHaveTextContent(formatINR(estimateLoan(3_00_000, 10.5, 36).emi));

    fireEvent.change(screen.getByRole('slider', { name: 'Amount' }), { target: { value: '500000' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Tenure' }), { target: { value: '60' } });
    expect(screen.getByTestId('landing-emi')).toHaveTextContent(formatINR(estimateLoan(5_00_000, 10.5, 60).emi));
  });

  it('switches product limits and hands the figures to the application', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<EmiCalculator onApply={onApply} />);
    await user.click(screen.getByRole('radio', { name: 'Home' }));
    const tenure = screen.getByRole('slider', { name: 'Tenure' });
    expect(tenure).toHaveAttribute('max', '360');
    expect(tenure).toHaveAttribute('aria-valuetext', '20 years, 240 months');

    await user.click(screen.getByRole('button', { name: /Apply for/ }));
    expect(onApply).toHaveBeenCalledWith({ loanType: 'home', loanAmount: 40_00_000, tenureMonths: 240 });
  });
});
