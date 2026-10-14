import { act, renderHook } from '@testing-library/react';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { TAB_ID } from '../utils/draftStorage';
import { useDraftConflict, useIdleTimeout, useOnlineStatus } from './useSessionSignals';

afterEach(() => {
  vi.useRealTimers();
});

describe('useOnlineStatus', () => {
  it('follows the browser online and offline events', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    online.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });
});

describe('useIdleTimeout', () => {
  it('fires after inactivity and restarts on activity', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(1000, onTimeout));
    act(() => {
      vi.advanceTimersByTime(800);
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(800);
    });
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(1000, onTimeout, false));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});

describe('useDraftConflict', () => {
  const storageEvent = (meta: object, key = 'lendswift_draft_personal_meta') => new StorageEvent('storage', {
    key, newValue: JSON.stringify(meta),
  });

  it('reports another tab saving the same loan type, and can be dismissed', () => {
    const { result } = renderHook(() => useDraftConflict('personal'));
    act(() => {
      window.dispatchEvent(storageEvent({ tabId: 'other-tab', loanType: 'personal', timestamp: '2026-10-14T10:00:00.000Z' }));
    });
    expect(result.current.conflictAt?.toISOString()).toBe('2026-10-14T10:00:00.000Z');
    act(() => result.current.dismissConflict());
    expect(result.current.conflictAt).toBeNull();
  });

  it('ignores this tab, other loan types, unrelated keys and malformed data', () => {
    const { result } = renderHook(() => useDraftConflict('personal'));
    act(() => {
      window.dispatchEvent(storageEvent({ tabId: TAB_ID, loanType: 'personal', timestamp: '2026-10-14T10:00:00.000Z' }));
      window.dispatchEvent(storageEvent({ tabId: 'other', loanType: 'home', timestamp: '2026-10-14T10:00:00.000Z' }));
      window.dispatchEvent(storageEvent({ tabId: 'other', loanType: 'personal' }, 'unrelated_meta'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'lendswift_draft_personal_meta', newValue: '{oops' }));
    });
    expect(result.current.conflictAt).toBeNull();
  });
});
