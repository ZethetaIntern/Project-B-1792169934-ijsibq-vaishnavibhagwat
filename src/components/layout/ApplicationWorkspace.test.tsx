import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useDemoMode } from '../../demo/demoMode';
import { useApplicationStore } from '../../store/applicationStore';
import { createCompleteApplication } from '../../test/fixtures';
import { deleteAllDrafts, listDrafts, saveDraft } from '../../utils/draftStorage';
import { AutosaveStatus } from '../persistence/AutosaveStatus';
import { ToastProvider } from '../common/Toast';
import ApplicationWorkspace from './ApplicationWorkspace';

const SLOW = { timeout: 5000 };

function renderWorkspace() {
  return render(<ToastProvider><ApplicationWorkspace /></ToastProvider>);
}

beforeEach(() => {
  deleteAllDrafts();
  useDemoMode.getState().stop();
  useApplicationStore.getState().reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ApplicationWorkspace', () => {
  it('offers to resume a saved draft, and Start fresh deletes it', async () => {
    const user = userEvent.setup();
    await saveDraft({ data: createCompleteApplication(), currentStepId: 'address' });
    renderWorkspace();

    const dialog = await screen.findByRole('dialog', { name: /You have a saved application for Personal Loan/ }, SLOW);
    await user.click(within(dialog).getByRole('button', { name: 'Start fresh' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(listDrafts()).toEqual([]);
  });

  it('restores the saved step when resuming', async () => {
    const user = userEvent.setup();
    await saveDraft({ data: createCompleteApplication(), currentStepId: 'address' });
    renderWorkspace();
    await user.click(await screen.findByRole('button', { name: 'Resume application' }, SLOW));
    expect(await screen.findByRole('heading', { level: 1, name: 'Where you live' }, SLOW)).toBeInTheDocument();
  });

  it('tells the person when they are offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderWorkspace();
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByText("You're offline")).toBeInTheDocument();
  });

  it('shows the demo bar with its guide and a confirmed reset while a demo runs', async () => {
    const user = userEvent.setup();
    useDemoMode.getState().start('home-joint');
    renderWorkspace();
    const bar = await screen.findByTestId('demo-bar', {}, SLOW);
    expect(within(bar).getByText('Demo: Home Loan with a spouse')).toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: 'What to try' }));
    expect(within(bar).getByText(/passport field appears for Home Loans above ₹50 lakh/)).toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: 'Reset demo' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Reset the demo?' });
    await user.click(within(confirm).getByRole('button', { name: 'Keep going' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});

describe('AutosaveStatus', () => {
  it('describes each save state in words', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<AutosaveStatus status="idle" lastSavedAt={null} onRetry={onRetry} />);
    expect(screen.getByText('Auto-save on')).toBeInTheDocument();
    rerender(<AutosaveStatus status="saving" lastSavedAt={null} onRetry={onRetry} />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    rerender(<AutosaveStatus status="saved" lastSavedAt={new Date()} onRetry={onRetry} />);
    expect(screen.getByText('Saved just now')).toBeInTheDocument();
    rerender(<AutosaveStatus status="saved" lastSavedAt={new Date(Date.now() - 5 * 60_000)} onRetry={onRetry} />);
    expect(screen.getByText('Saved 5 min ago')).toBeInTheDocument();
    rerender(<AutosaveStatus status="error" lastSavedAt={null} onRetry={onRetry} />);
    expect(screen.getByText("Couldn't save")).toBeInTheDocument();
  });
});
