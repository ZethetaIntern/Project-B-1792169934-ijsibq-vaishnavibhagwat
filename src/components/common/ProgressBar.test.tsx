import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe, expect, it, vi,
} from 'vitest';
import { STEPS } from '../../constants/steps';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('names the current position and gates later steps', () => {
    render(<ProgressBar steps={STEPS} currentIndex={2} reachableIndex={3} onSelect={vi.fn()} />);
    const nav = screen.getByRole('navigation', { name: 'Application progress: step 3 of 8, Verify your identity' });
    const step = (name: RegExp) => within(nav).getByRole('button', { name });
    expect(step(/Step 1: Choose your loan, completed/)).toBeEnabled();
    expect(step(/Step 3: Verify your identity, current step/)).toHaveAttribute('aria-current', 'step');
    expect(step(/Step 4: Where you live, not started/)).toBeEnabled();
    expect(step(/Step 5: Work and income, not available yet/)).toBeDisabled();
  });

  it('opens the phone step list, jumps to a completed step and closes when the step changes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <ProgressBar steps={STEPS} currentIndex={2} reachableIndex={3} onSelect={onSelect} />,
    );
    const toggle = screen.getByRole('button', { name: 'All steps' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: /Step 3: Verify your identity/ }));
    expect(onSelect).not.toHaveBeenCalled(); // the current step is not a link to itself
    await user.click(screen.getByRole('button', { name: /Step 1: Choose your loan/ }));
    expect(onSelect).toHaveBeenCalledWith('loan');

    rerender(<ProgressBar steps={STEPS} currentIndex={0} reachableIndex={3} onSelect={onSelect} />);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
