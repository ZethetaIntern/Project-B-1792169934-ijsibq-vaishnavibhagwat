import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { randomDigits, simulateRequest } from '../utils/simulate';

export type OtpStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified';

export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_ATTEMPTS = 3;

/**
 * Simulated one-time-password flow (no SMS or email is sent).
 * The generated code lives only in component memory — it is never persisted or
 * auto-saved — and is shown on screen as clearly labelled demo data.
 */
export function useOtpVerification() {
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const attempts = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (secondsUntilResend <= 0) return undefined;
    const timer = window.setTimeout(() => setSecondsUntilResend((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsUntilResend]);

  const send = useCallback(async () => {
    setStatus('sending');
    setError(null);
    try {
      const code = await simulateRequest(900, () => randomDigits(OTP_LENGTH));
      if (!mounted.current) return;
      attempts.current = 0;
      setDemoCode(code);
      setStatus('sent');
      setSecondsUntilResend(OTP_RESEND_SECONDS);
    } catch (problem) {
      if (!mounted.current) return;
      setStatus('idle');
      setError((problem as Error).message);
    }
  }, []);

  const verify = useCallback(async (input: string): Promise<boolean> => {
    if (!/^\d{6}$/.test(input)) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`);
      return false;
    }
    setStatus('verifying');
    setError(null);
    try {
      const matches = await simulateRequest(700, () => input === demoCode);
      if (!mounted.current) return false;
      if (matches) {
        setStatus('verified');
        setDemoCode(null);
        return true;
      }
      attempts.current += 1;
      if (attempts.current >= OTP_MAX_ATTEMPTS) {
        setDemoCode(null);
        setStatus('idle');
        setError('Too many incorrect attempts. Request a new code.');
      } else {
        setStatus('sent');
        const left = OTP_MAX_ATTEMPTS - attempts.current;
        setError(`That code doesn't match. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`);
      }
      return false;
    } catch (problem) {
      if (mounted.current) {
        setStatus('sent');
        setError((problem as Error).message);
      }
      return false;
    }
  }, [demoCode]);

  const reset = useCallback(() => {
    attempts.current = 0;
    setStatus('idle');
    setError(null);
    setDemoCode(null);
    setSecondsUntilResend(0);
  }, []);

  return {
    status, error, demoCode, secondsUntilResend, send, verify, reset,
  };
}
