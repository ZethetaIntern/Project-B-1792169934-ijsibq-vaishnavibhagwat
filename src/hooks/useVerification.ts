import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { randomDigits, simulateRequest } from '../utils/simulate';
import { validateAadhaar, validatePan } from '../utils/validators';

export type VerificationKind = 'pan' | 'aadhaar';
export type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'failed';

/** Simulated round-trip to the (imaginary) NSDL / UIDAI verification service. */
export const VERIFICATION_DELAY_MS = 1500;

export interface VerificationResponse {
  valid: boolean;
  reference: string;
  message?: string;
}

const SERVICE: Record<VerificationKind, string> = { pan: 'PAN', aadhaar: 'Aadhaar' };

/**
 * Mock verification API: succeeds for well-formed numbers, fails otherwise. Nothing
 * leaves the browser — this only demonstrates loading, success, failure and retry.
 */
export function mockVerify(
  kind: VerificationKind,
  formatError: string | null,
): VerificationResponse {
  return formatError
    ? { valid: false, reference: '', message: formatError }
    : { valid: true, reference: `SIM-${SERVICE[kind]}-${randomDigits(6)}` };
}

const DEFAULT_VALIDATORS: Record<VerificationKind, (value: string) => string | null> = {
  pan: (value) => validatePan(value),
  aadhaar: validateAadhaar,
};

interface UseVerificationOptions {
  /** Format check; defaults to the standard PAN (individual) or Aadhaar rules. */
  validate?: (value: string) => string | null;
  /** The value was already verified (resumed application). */
  initiallyVerified?: boolean;
}

interface VerificationResult {
  /** The value this result belongs to: a different current value means "not checked yet". */
  value: string;
  status: VerificationStatus;
  error: string | null;
  reference: string | null;
}

const idle = (value: string): VerificationResult => ({
  value, status: 'idle', error: null, reference: null,
});

/**
 * `useVerification(value, type)` →
 * `{ status, isVerifying, isVerified, error, reference, verify, reset }`.
 *
 * Pass the field's current value; `verify()` checks that value. Editing the value
 * resets the result to idle, and a response for a value that has since changed is
 * ignored, so a stale "Verified" can never be shown.
 */
export function useVerification(
  value: string,
  type: VerificationKind,
  { validate = DEFAULT_VALIDATORS[type], initiallyVerified = false }: UseVerificationOptions = {},
) {
  const [result, setResult] = useState<VerificationResult>(
    initiallyVerified ? { ...idle(value), status: 'verified' } : idle(value),
  );
  const latestRequest = useRef(0);
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  // Adjust state while rendering when the value changes (no effect, no flash of stale state).
  if (result.value !== value) setResult(idle(value));

  const verify = useCallback(async (): Promise<boolean> => {
    latestRequest.current += 1;
    const requestId = latestRequest.current;
    const formatError = validate(value);
    if (formatError) {
      // Invalid format: no request — the field's own validation shows the error at once.
      setResult(idle(value));
      return false;
    }

    setResult({ ...idle(value), status: 'verifying' });
    // Only the latest request for the value still in the field may settle the result.
    const settle = (next: VerificationResult) => {
      if (requestId !== latestRequest.current || latestValue.current !== value) return false;
      setResult(next);
      return next.status === 'verified';
    };
    try {
      const response = await simulateRequest(
        VERIFICATION_DELAY_MS,
        () => mockVerify(type, validate(value)),
      );
      return settle(response.valid
        ? { ...idle(value), status: 'verified', reference: response.reference }
        : { ...idle(value), status: 'failed', error: response.message ?? `We could not verify this ${SERVICE[type]}.` });
    } catch (problem) {
      return settle({
        ...idle(value),
        status: 'failed',
        error: `${SERVICE[type]} verification is unavailable. ${(problem as Error).message}`,
      });
    }
  }, [type, validate, value]);

  const reset = useCallback(() => {
    latestRequest.current += 1;
    setResult(idle(value));
  }, [value]);

  return {
    status: result.status,
    isVerifying: result.status === 'verifying',
    isVerified: result.status === 'verified',
    error: result.error,
    reference: result.reference,
    verify,
    reset,
  };
}
