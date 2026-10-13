import {
  useEffect, useRef, useState, useSyncExternalStore,
} from 'react';
import { DRAFT_META_SUFFIX } from '../constants/persistence';
import { isDraftKey, TAB_ID } from '../utils/draftStorage';

/* -------------------------------------------------------- online / offline */

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Browser connectivity (verification, PIN lookup and submission need it). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/* ------------------------------------------------------------ idle timeout */

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;

/** Calls `onTimeout` after `timeoutMs` without user activity. */
export function useIdleTimeout(timeoutMs: number, onTimeout: () => void, enabled = true) {
  const callback = useRef(onTimeout);
  useEffect(() => {
    callback.current = onTimeout;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = window.setTimeout(() => callback.current(), timeoutMs);
    const restart = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback.current(), timeoutMs);
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, restart, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, restart));
    };
  }, [timeoutMs, enabled]);
}

/* ----------------------------------------------------- multi-tab conflicts */

/**
 * Detects another tab saving a draft for the same loan type. The `storage` event
 * only fires in *other* tabs, so seeing one means two tabs are editing at once.
 */
export function useDraftConflict(loanType: string) {
  const [conflictAt, setConflictAt] = useState<Date | null>(null);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key?.endsWith(DRAFT_META_SUFFIX) || !event.newValue) return;
      const draftKey = event.key.slice(0, -DRAFT_META_SUFFIX.length);
      if (!isDraftKey(draftKey)) return;
      try {
        interface Meta { tabId?: string; loanType?: string; timestamp?: string }
        const meta = JSON.parse(event.newValue) as Meta;
        if (meta.tabId !== TAB_ID && meta.loanType === loanType && meta.timestamp) {
          setConflictAt(new Date(meta.timestamp));
        }
      } catch {
        // Malformed metadata from elsewhere — nothing to report.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loanType]);

  return { conflictAt, dismissConflict: () => setConflictAt(null) };
}
