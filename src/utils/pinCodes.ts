import pinCodeData from './pinCodeData.json';
import { simulateRequest } from './simulate';

export interface PinCodeRecord {
  pin: string;
  postOffice: string;
  city: string;
  state: string;
}

/** Indian PIN codes: 6 digits, first digit 1–9 (the postal zone). */
export const PIN_CODE_PATTERN = /^[1-9]\d{5}$/;

const DIRECTORY = new Map<string, PinCodeRecord>(
  (pinCodeData as PinCodeRecord[]).map((record) => [record.pin, record]),
);

export const PIN_DIRECTORY_SIZE = DIRECTORY.size;

/** Synchronous lookup in the bundled sample directory (used by schemas). */
export function findPinCode(pin: string): PinCodeRecord | undefined {
  return DIRECTORY.get(pin);
}

export function validatePinCode(pin: string): string | null {
  if (!/^\d+$/.test(pin)) return 'Use digits only for the PIN code.';
  if (pin.length !== 6) return 'PIN codes are 6 digits long.';
  if (!PIN_CODE_PATTERN.test(pin)) return 'Indian PIN codes do not start with 0.';
  return null;
}

/** Simulated India Post lookup with network latency; `null` when the PIN is not in the sample. */
export function lookupPinCode(pin: string, latencyMs = 450): Promise<PinCodeRecord | null> {
  return simulateRequest(latencyMs, () => findPinCode(pin) ?? null);
}
