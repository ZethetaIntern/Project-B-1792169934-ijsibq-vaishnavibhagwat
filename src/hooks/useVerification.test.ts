import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { validatePan } from '../utils/validators';
import { mockVerify, useVerification, VERIFICATION_DELAY_MS } from './useVerification';

describe('useVerification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = (initiallyVerified = false) => renderHook(
    () => useVerification('pan', { validate: (value) => validatePan(value), initiallyVerified }),
  );

  it('shows a 1.5 s verifying state, then succeeds for a well-formed PAN', async () => {
    const { result } = setup();
    let outcome: Promise<boolean> = Promise.resolve(false);
    act(() => {
      outcome = result.current.verify('ABCPE1234F');
    });
    expect(result.current.isVerifying).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VERIFICATION_DELAY_MS);
    });
    await expect(outcome).resolves.toBe(true);
    expect(result.current.isVerified).toBe(true);
    expect(result.current.reference).toMatch(/^SIM-PAN-\d{6}$/);
  });

  it('does not call the service for an invalid format', async () => {
    const { result } = setup();
    let outcome = true;
    await act(async () => {
      outcome = await result.current.verify('ABCDE1234F');
    });
    expect(outcome).toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('fails with a retryable error when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = setup();
    await act(async () => {
      await result.current.verify('ABCPE1234F');
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatch(/PAN verification is unavailable\. You appear to be offline/);
  });

  it('ignores a stale response when reset mid-flight', async () => {
    const { result } = setup();
    let outcome: Promise<boolean> = Promise.resolve(true);
    act(() => {
      outcome = result.current.verify('ABCPE1234F');
    });
    act(() => result.current.reset());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VERIFICATION_DELAY_MS);
    });
    await expect(outcome).resolves.toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('can start verified (resumed application)', () => {
    expect(setup(true).result.current.isVerified).toBe(true);
  });

  it('mock service mirrors the format check', () => {
    expect(mockVerify('aadhaar', null)).toMatchObject({ valid: true });
    expect(mockVerify('aadhaar', 'bad')).toEqual({ valid: false, reference: '', message: 'bad' });
  });
});
