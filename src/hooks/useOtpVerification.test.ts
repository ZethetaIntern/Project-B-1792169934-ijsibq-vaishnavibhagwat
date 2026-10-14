import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { OTP_RESEND_SECONDS, useOtpVerification } from './useOtpVerification';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function sendCode() {
  const hook = renderHook(() => useOtpVerification());
  await act(async () => {
    const sending = hook.result.current.send();
    await vi.advanceTimersByTimeAsync(900);
    await sending;
  });
  return hook;
}

async function verify(hook: Awaited<ReturnType<typeof sendCode>>, code: string) {
  let outcome = false;
  await act(async () => {
    const pending = hook.result.current.verify(code);
    await vi.advanceTimersByTimeAsync(700);
    outcome = await pending;
  });
  return outcome;
}

const wrong = (code: string) => code.split('').map((digit) => String((Number(digit) + 1) % 10)).join('');

describe('useOtpVerification', () => {
  it('sends a 6-digit demo code and verifies it', async () => {
    const hook = await sendCode();
    const code = hook.result.current.demoCode ?? '';
    expect(code).toMatch(/^\d{6}$/);
    expect(hook.result.current.status).toBe('sent');
    expect(hook.result.current.secondsUntilResend).toBe(OTP_RESEND_SECONDS);

    expect(await verify(hook, code)).toBe(true);
    expect(hook.result.current.status).toBe('verified');
    expect(hook.result.current.demoCode).toBeNull();
  });

  it('counts down before a resend is allowed', async () => {
    const hook = await sendCode();
    // Each tick re-arms after a render, so advance one second at a time.
    for (let second = 0; second < 3; second += 1) {
      // eslint-disable-next-line no-await-in-loop -- ticks are sequential by design
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(hook.result.current.secondsUntilResend).toBe(OTP_RESEND_SECONDS - 3);
  });

  it('rejects malformed and wrong codes, then locks after three attempts', async () => {
    const hook = await sendCode();
    const code = hook.result.current.demoCode ?? '';

    expect(await verify(hook, '12')).toBe(false);
    expect(hook.result.current.error).toBe('Enter the 6-digit code.');

    expect(await verify(hook, wrong(code))).toBe(false);
    expect(hook.result.current.error).toBe("That code doesn't match. 2 attempts left.");
    expect(await verify(hook, wrong(code))).toBe(false);
    expect(hook.result.current.error).toBe("That code doesn't match. 1 attempt left.");
    expect(await verify(hook, wrong(code))).toBe(false);
    expect(hook.result.current.error).toBe('Too many incorrect attempts. Request a new code.');
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.demoCode).toBeNull();
  });

  it('reports being offline instead of sending', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const hook = renderHook(() => useOtpVerification());
    await act(async () => {
      await hook.result.current.send();
    });
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.error).toMatch(/offline/);
  });

  it('reset clears the flow', async () => {
    const hook = await sendCode();
    act(() => hook.result.current.reset());
    expect(hook.result.current).toMatchObject({
      status: 'idle', error: null, demoCode: null, secondsUntilResend: 0,
    });
  });
});
