import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { AUTOSAVE_INTERVAL_MS } from '../constants/persistence';
import { saveDraft, type DraftSummary } from '../utils/draftStorage';
import type { ApplicationSnapshot } from '../store/applicationStore';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveOptions {
  /** Reads the live application at save time (committed steps + open step's fields). */
  getSnapshot: () => ApplicationSnapshot;
  /** When false nothing is written (e.g. while the resume prompt is open, or after submit). */
  enabled?: boolean;
  onSaved?: (summary: DraftSummary, trigger: SaveTrigger) => void;
  onError?: (error: Error) => void;
}

export type SaveTrigger = 'timer' | 'manual' | 'navigation' | 'exit';

/** True until the applicant has entered anything worth keeping. */
function isBlank({ data }: ApplicationSnapshot): boolean {
  return !data.loan.loanType && data.loan.loanAmount === null;
}

/**
 * `useAutoSave(formState, interval = 30000)` — debounced, encrypted auto-save.
 *
 * - `formState` is any value that changes whenever the application changes; each
 *   change resets the timer held in a ref.
 * - So that continuous typing still gets saved, a save is never deferred more than
 *   two intervals after the first unsaved change.
 * - `saveNow(trigger)` saves immediately (Save draft button, step navigation, exit).
 * The write itself is asynchronous (Web Crypto) and never blocks typing.
 */
export function useAutoSave(
  formState: unknown,
  interval = AUTOSAVE_INTERVAL_MS,
  {
    getSnapshot, enabled = true, onSaved, onError,
  }: AutoSaveOptions = {
    getSnapshot: () => {
      throw new Error('getSnapshot is required');
    },
  },
) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const firstUnsavedChangeAt = useRef<number | null>(null);
  // Unsaved changes exist. Automatic saves are skipped when nothing changed, so a
  // reload never silently overwrites the stored draft (e.g. one edited outside the app).
  const dirty = useRef(false);
  const callbacks = useRef({
    getSnapshot, onSaved, onError, enabled,
  });

  useEffect(() => {
    callbacks.current = {
      getSnapshot, onSaved, onError, enabled,
    };
  });

  const saveNow = useCallback(async (trigger: SaveTrigger = 'manual'): Promise<boolean> => {
    window.clearTimeout(timerRef.current);
    const { current } = callbacks;
    if (!current.enabled) return false;
    const snapshot = current.getSnapshot();
    if (isBlank(snapshot)) return false;
    if (trigger !== 'manual' && !dirty.current) return false;

    setStatus('saving');
    const started = performance.now();
    try {
      const summary = await saveDraft(snapshot);
      firstUnsavedChangeAt.current = null;
      dirty.current = false;
      setLastDurationMs(Math.round(performance.now() - started));
      setLastSavedAt(new Date(summary.timestamp));
      setStatus('saved');
      callbacks.current.onSaved?.(summary, trigger);
      return true;
    } catch (problem) {
      setStatus('error');
      callbacks.current.onError?.(problem as Error);
      return false;
    }
  }, []);

  // Every change resets the debounce timer (capped by the max-wait rule).
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return undefined;
    }
    if (!callbacks.current.enabled) return undefined;
    const now = Date.now();
    dirty.current = true;
    firstUnsavedChangeAt.current ??= now;
    const maxWaitLeft = 2 * interval - (now - firstUnsavedChangeAt.current);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      saveNow('timer');
    }, Math.max(0, Math.min(interval, maxWaitLeft)));
    return undefined;
  }, [formState, interval, saveNow]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return {
    status, lastSavedAt, lastDurationMs, saveNow,
  };
}
