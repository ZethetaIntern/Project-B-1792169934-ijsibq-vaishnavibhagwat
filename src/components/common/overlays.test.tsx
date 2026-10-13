import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Collapse } from './Collapse';
import { Modal } from './Modal';
import { ToastProvider, useToast } from './Toast';

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Start fresh</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Discard saved application?"
        description="This permanently deletes the draft on this device."
        role="alertdialog"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Keep draft</Button>
            <Button variant="danger">Discard</Button>
          </>
        )}
      />
    </>
  );
}

describe('Modal', () => {
  it('moves focus in, traps Tab, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = screen.getByRole('button', { name: 'Start fresh' });
    await user.click(opener);

    const dialog = screen.getByRole('alertdialog', { name: /discard saved application/i });
    expect(dialog).toHaveAccessibleDescription(/permanently deletes/i);
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Keep draft' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('Button', () => {
  it('shows a busy state and blocks clicks while loading', () => {
    render(<Button loading loadingText="Submitting…">Submit application</Button>);
    const button = screen.getByRole('button', { name: /submitting/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Collapse', () => {
  it('mounts when opened and unmounts after the close transition', async () => {
    const { rerender } = render(<Collapse open={false}><p>Rent amount</p></Collapse>);
    expect(screen.queryByText('Rent amount')).not.toBeInTheDocument();
    rerender(<Collapse open><p>Rent amount</p></Collapse>);
    expect(screen.getByText('Rent amount')).toBeInTheDocument();
    rerender(<Collapse open={false}><p>Rent amount</p></Collapse>);
    await waitFor(() => expect(screen.queryByText('Rent amount')).not.toBeInTheDocument());
  });
});

function ToastHarness() {
  const { toast } = useToast();
  return (
    <Button onClick={() => toast({
      id: 'autosave', title: 'Draft saved at 10:42', tone: 'success', duration: 50,
    })}
    >
      Save
    </Button>
  );
}

describe('Toast', () => {
  it('announces in a polite status region, de-duplicates by id and auto-dismisses', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><ToastHarness /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getAllByText('Draft saved at 10:42')).toHaveLength(1);
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 80);
      });
    });
    expect(screen.queryByText('Draft saved at 10:42')).not.toBeInTheDocument();
  });
});
