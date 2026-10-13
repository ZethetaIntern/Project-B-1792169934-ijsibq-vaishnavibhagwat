import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import { useAutoSave } from './useAutoSave';

const saveDraft = vi.fn();
vi.mock('../utils/draftStorage', () => ({
  saveDraft: (...args: unknown[]) => saveDraft(...args),
}));

function snapshot(started = true) {
  const data = createEmptyApplication();
  if (started) data.loan.loanType = 'personal';
  return { data, currentStepId: 'loan' as const };
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveDraft.mockReset();
    saveDraft.mockResolvedValue({ timestamp: new Date().toISOString(), key: 'lendswift_draft_personal' });
  });
  afterEach(() => vi.useRealTimers());

  const render = (getSnapshot = () => snapshot(), enabled = true) => renderHook(
    ({ version }) => useAutoSave(version, 30_000, { getSnapshot, enabled }),
    { initialProps: { version: 0 } },
  );

  it('saves 30 seconds after the last change and resets the timer on each change', async () => {
    const { rerender, result } = render();
    rerender({ version: 1 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    rerender({ version: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(saveDraft).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('never defers a save beyond 60 seconds of continuous edits', async () => {
    const { rerender } = render();
    for (let version = 1; version <= 7; version += 1) {
      rerender({ version });
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
    }
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it('does not save on mount, when disabled, or while the application is blank', async () => {
    const blank = render(() => snapshot(false));
    blank.rerender({ version: 1 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    const disabled = render(() => snapshot(), false);
    disabled.rerender({ version: 1 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    render();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('saves immediately on demand and reports errors', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAutoSave(0, 30_000, {
      getSnapshot: () => snapshot(),
      onError,
    }));
    saveDraft.mockRejectedValueOnce(new Error('QuotaExceededError'));
    await act(async () => {
      await result.current.saveNow('manual');
    });
    expect(result.current.status).toBe('error');
    expect(onError).toHaveBeenCalled();
    await act(async () => {
      await result.current.saveNow('manual');
    });
    expect(result.current.status).toBe('saved');
  });
});
