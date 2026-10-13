import { useCallback, useRef, useState } from 'react';
import { randomDigits, simulateRequest } from '../utils/simulate';

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

interface UseVerificationOptions {
  /** Format check for the value; the "API" is only called for well-formed input. */
  validate: (value: string) => string | null;
  initiallyVerified?: boolean;
}

/**
 * `useVerification(kind, options)` → `{ status, isVerifying, isVerified, error, verify, reset }`.
 * Stale responses (the value changed while a request was in flight) are ignored.
 */
export function useVerification(
  kind: VerificationKind,
  { validate, initiallyVerified = false }: UseVerificationOptions,
) {
  const [status, setStatus] = useState<VerificationStatus>(initiallyVerified ? 'verified' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const verify = useCallback(async (value: string): Promise<boolean> => {
    latestRequest.current += 1;
    const requestId = latestRequest.current;
    const formatError = validate(value);
    if (formatError) {
      // Invalid format: no request — the field's own validation shows the error at once.
      setStatus('idle');
      setError(null);
      return false;
    }

    setStatus('verifying');
    setError(null);
    try {
      const response = await simulateRequest(
        VERIFICATION_DELAY_MS,
        () => mockVerify(kind, validate(value)),
      );
      if (requestId !== latestRequest.current) return false;
      if (response.valid) {
        setStatus('verified');
        setReference(response.reference);
        return true;
      }
      setStatus('failed');
      setError(response.message ?? `We could not verify this ${SERVICE[kind]}.`);
      return false;
    } catch (problem) {
      if (requestId !== latestRequest.current) return false;
      setStatus('failed');
      setError(`${SERVICE[kind]} verification is unavailable. ${(problem as Error).message}`);
      return false;
    }
  }, [kind, validate]);

  const reset = useCallback(() => {
    latestRequest.current += 1;
    setStatus('idle');
    setError(null);
    setReference(null);
  }, []);

  return {
    status,
    isVerifying: status === 'verifying',
    isVerified: status === 'verified',
    error,
    reference,
    verify,
    reset,
  };
}
