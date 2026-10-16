/**
 * User Timing spans for the brief's performance budgets (step transition under
 * 200 ms, auto-save write under 50 ms). They show up in the browser's Performance
 * panel and are read back by the E2E budget test. Only the Level 2 API (named
 * marks) is used, which every supported browser has; failures are ignored because
 * timing must never break the form.
 */

export const STEP_TRANSITION = 'lendswift:step-transition';
export const AUTOSAVE_WRITE = 'lendswift:autosave';

export function startSpan(name: string): void {
  try {
    performance.mark(`${name}:start`);
  } catch {
    // User Timing unavailable: nothing to record.
  }
}

/** Ends a span started with `startSpan` and returns its duration in ms. */
export function endSpan(name: string): number | null {
  try {
    performance.mark(`${name}:end`);
    performance.measure(name, `${name}:start`, `${name}:end`);
    performance.clearMarks(`${name}:start`);
    performance.clearMarks(`${name}:end`);
    const entries = performance.getEntriesByName(name, 'measure');
    return entries[entries.length - 1]?.duration ?? null;
  } catch {
    return null; // never started, or User Timing unavailable
  }
}
