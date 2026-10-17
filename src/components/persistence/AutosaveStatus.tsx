import { CloudCheck, CloudOff, Cloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';
import { Spinner } from '../common/Spinner';

interface AutosaveStatusProps {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  onRetry: () => void;
}

function relativeTime(date: Date, now: number): string {
  const seconds = Math.round((now - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `at ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Header indicator: "Saving…", "Saved just now", "Saved 3 min ago", "Couldn't save". */
export function AutosaveStatus({ status, lastSavedAt, onRetry }: AutosaveStatusProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  let content;
  if (status === 'saving') {
    content = (
      <>
        <Spinner className="size-3.5 text-cobalt" />
        Saving…
      </>
    );
  } else if (status === 'error') {
    content = (
      <>
        <CloudOff aria-hidden="true" className="size-4 text-danger-ink" />
        <span className="text-danger-ink">Couldn&apos;t save</span>
        <button type="button" onClick={onRetry} className="inline-flex min-h-11 min-w-11 items-center justify-center font-medium text-cobalt underline-offset-2 hover:underline sm:pointer-fine:min-h-0 sm:pointer-fine:min-w-0">
          Retry
        </button>
      </>
    );
  } else if (lastSavedAt) {
    content = (
      <>
        <CloudCheck aria-hidden="true" className="size-4 text-success-ink" />
        {`Saved ${relativeTime(lastSavedAt, Math.max(now, lastSavedAt.getTime()))}`}
      </>
    );
  } else {
    content = (
      <>
        <Cloud aria-hidden="true" className="size-4 text-muted" />
        Auto-save on
      </>
    );
  }

  return (
    <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-slate">
      {content}
    </p>
  );
}
