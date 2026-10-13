import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { usePinCodeLookup } from './usePinCodeLookup';

describe('usePinCodeLookup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const flush = () => act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });

  it('does nothing until the PIN is well-formed', () => {
    const { result } = renderHook(() => usePinCodeLookup('5600'));
    expect(result.current).toMatchObject({ isLoading: false, city: '', notFound: false });
  });

  it('loads and auto-fills city, state and post office', async () => {
    const { result } = renderHook(() => usePinCodeLookup('682011'));
    expect(result.current.isLoading).toBe(true);
    await flush();
    expect(result.current).toMatchObject({
      isLoading: false, city: 'Kochi', state: 'Kerala', postOffice: 'Ernakulam H.O', error: null,
    });
  });

  it('reports a well-formed PIN that is not in the sample directory', async () => {
    const { result } = renderHook(() => usePinCodeLookup('682099'));
    await flush();
    expect(result.current).toMatchObject({ notFound: true, city: '', isLoading: false });
  });

  it('keeps results tied to the latest PIN', async () => {
    const { result, rerender } = renderHook(({ pin }) => usePinCodeLookup(pin), {
      initialProps: { pin: '110001' },
    });
    rerender({ pin: '400001' });
    await flush();
    expect(result.current.city).toBe('Mumbai');
  });

  it('surfaces an offline error', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => usePinCodeLookup('110001'));
    await flush();
    expect(result.current.error).toMatch(/PIN lookup is unavailable\. You appear to be offline/);
  });
});
