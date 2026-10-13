/**
 * Helpers for the simulated back-end. There is no server in this project: every
 * "API call" is a timed promise that also respects the browser's online state, so
 * verification and submission fail gracefully when the network drops.
 */

export class NetworkUnavailableError extends Error {
  constructor() {
    super('You appear to be offline. Check your connection and try again.');
    this.name = 'NetworkUnavailableError';
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Resolves after `latencyMs`, or rejects if the browser is offline at either end. */
export async function simulateRequest<T>(latencyMs: number, respond: () => T): Promise<T> {
  if (!navigator.onLine) throw new NetworkUnavailableError();
  await wait(latencyMs);
  if (!navigator.onLine) throw new NetworkUnavailableError();
  return respond();
}

/** Cryptographically random numeric code, e.g. a 6-digit one-time password. */
export function randomDigits(length: number): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => String(value % 10)).join('');
}
