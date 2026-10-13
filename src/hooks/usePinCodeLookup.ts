import { useEffect, useState } from 'react';
import { lookupPinCode, PIN_CODE_PATTERN, type PinCodeRecord } from '../utils/pinCodes';

interface LookupResult {
  pin: string;
  record: PinCodeRecord | null;
  error: string | null;
}

export interface PinCodeLookup {
  city: string;
  state: string;
  postOffice: string;
  isLoading: boolean;
  error: string | null;
  /** Well-formed PIN that is not in the sample directory — the user fills city/state manually. */
  notFound: boolean;
  record: PinCodeRecord | null;
}

/**
 * Looks up a 6-digit PIN code in the simulated India Post directory.
 * Loading and results are derived from the PIN the last response belongs to, so a
 * slow response for an old PIN can never overwrite a newer one.
 */
export function usePinCodeLookup(pin: string): PinCodeLookup {
  const [result, setResult] = useState<LookupResult | null>(null);
  const isWellFormed = PIN_CODE_PATTERN.test(pin);

  useEffect(() => {
    if (!isWellFormed) return undefined;
    let cancelled = false;
    lookupPinCode(pin)
      .then((record) => {
        if (!cancelled) setResult({ pin, record, error: null });
      })
      .catch((problem: Error) => {
        if (!cancelled) setResult({ pin, record: null, error: `PIN lookup is unavailable. ${problem.message}` });
      });
    return () => {
      cancelled = true;
    };
  }, [pin, isWellFormed]);

  const current = isWellFormed && result?.pin === pin ? result : null;
  const record = current?.record ?? null;
  return {
    city: record?.city ?? '',
    state: record?.state ?? '',
    postOffice: record?.postOffice ?? '',
    isLoading: isWellFormed && !current,
    error: current?.error ?? null,
    notFound: Boolean(current && !current.record && !current.error),
    record,
  };
}
