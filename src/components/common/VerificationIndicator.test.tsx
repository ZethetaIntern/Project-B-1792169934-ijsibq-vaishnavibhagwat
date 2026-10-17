import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe, expect, it, vi,
} from 'vitest';
import { Input } from './Input';
import { VerificationIndicator } from './VerificationIndicator';
import type { VerificationStatus } from '../../hooks/useVerification';

function renderIndicator(status: VerificationStatus, onVerify = vi.fn(), hasValue = true) {
  render(
    <Input>
      <Input.Label>PAN</Input.Label>
      <Input.Field />
      <VerificationIndicator status={status} onVerify={onVerify} hasValue={hasValue} label="PAN" />
    </Input>,
  );
  return onVerify;
}

describe('VerificationIndicator', () => {
  it('offers Verify, and keeps focus on the field when the button gives way', async () => {
    const user = userEvent.setup();
    const onVerify = renderIndicator('idle');
    await user.click(screen.getByRole('button', { name: 'Verify PAN' }));
    expect(onVerify).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: /^PAN/ })).toHaveFocus();
  });

  it('offers Retry after a failure', () => {
    renderIndicator('failed');
    expect(screen.getByRole('button', { name: 'Retry PAN verification' })).toHaveTextContent('Retry');
  });

  it('shows progress instead of a button while verifying', () => {
    renderIndicator('verifying');
    expect(screen.getByText('Verifying…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows Verified once verified', () => {
    renderIndicator('verified');
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows nothing while the field is empty', () => {
    renderIndicator('idle', vi.fn(), false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
