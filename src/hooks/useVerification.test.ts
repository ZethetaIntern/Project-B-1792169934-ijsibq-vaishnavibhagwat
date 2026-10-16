import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { verhoeffCheckDigit } from '../utils/validators';
import { mockVerify, useVerification, VERIFICATION_DELAY_MS } from './useVerification';

describe('useVerification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = (value = 'ABCPE1234F', initiallyVerified = false) => renderHook(
    (props) => useVerification(props.value, 'pan', { initiallyVerified }),
    { initialProps: { value } },
  );

  const settle = () => act(async () => {
    await vi.advanceTimersByTimeAsync(VERIFICATION_DELAY_MS);
  });

  it('shows a 1.5 s verifying state, then succeeds for a well-formed PAN', async () => {
    const { result } = setup();
    let outcome: Promise<boolean> = Promise.resolve(false);
    act(() => {
      outcome = result.current.verify();
    });
    expect(result.current.isVerifying).toBe(true);
    await settle();
    await expect(outcome).resolves.toBe(true);
    expect(result.current.isVerified).toBe(true);
    expect(result.current.reference).toMatch(/^SIM-PAN-\d{6}$/);
  });

  it('does not call the service for an invalid format', async () => {
    const { result } = setup('ABCDE1234F');
    let outcome = true;
    await act(async () => {
      outcome = await result.current.verify();
    });
    expect(outcome).toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('fails with a retryable error when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = setup();
    await act(async () => {
      await result.current.verify();
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatch(/PAN verification is unavailable\. You appear to be offline/);
  });

  it('ignores a stale response when reset mid-flight', async () => {
    const { result } = setup();
    let outcome: Promise<boolean> = Promise.resolve(true);
    act(() => {
      outcome = result.current.verify();
    });
    act(() => result.current.reset());
    await settle();
    await expect(outcome).resolves.toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('resets when the value changes, and ignores the answer for the old value', async () => {
    const { result, rerender } = setup();
    let outcome: Promise<boolean> = Promise.resolve(true);
    act(() => {
      outcome = result.current.verify();
    });
    rerender({ value: 'ABCPE1234' });
    expect(result.current.status).toBe('idle');
    await settle();
    await expect(outcome).resolves.toBe(false);
    expect(result.current.status).toBe('idle');

    rerender({ value: 'ABCPE1234G' });
    await act(async () => {
      outcome = result.current.verify();
      await vi.advanceTimersByTimeAsync(VERIFICATION_DELAY_MS);
    });
    await expect(outcome).resolves.toBe(true);
    rerender({ value: 'ABCPE1234H' });
    expect(result.current.isVerified).toBe(false);
  });

  it('uses the Aadhaar rules for type "aadhaar"', async () => {
    const valid = `23456789012${verhoeffCheckDigit('23456789012')}`;
    const { result, rerender } = renderHook(
      (props) => useVerification(props.value, 'aadhaar'),
      { initialProps: { value: '123456789012' } },
    );
    await act(async () => {
      await result.current.verify();
    });
    expect(result.current.status).toBe('idle');
    rerender({ value: valid });
    await act(async () => {
      const verified = result.current.verify();
      await vi.advanceTimersByTimeAsync(VERIFICATION_DELAY_MS);
      await expect(verified).resolves.toBe(true);
    });
    expect(result.current.reference).toMatch(/^SIM-Aadhaar-\d{6}$/);
  });

  it('can start verified (resumed application)', () => {
    expect(setup('ABCPE1234F', true).result.current.isVerified).toBe(true);
  });

  it('mock service mirrors the format check', () => {
    expect(mockVerify('aadhaar', null)).toMatchObject({ valid: true });
    expect(mockVerify('aadhaar', 'bad')).toEqual({ valid: false, reference: '', message: 'bad' });
  });
});
