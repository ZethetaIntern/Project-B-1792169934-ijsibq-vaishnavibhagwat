import { BadgeCheck, RotateCcw, ShieldQuestion } from 'lucide-react';
import { useContext } from 'react';
import type { VerificationStatus } from '../../hooks/useVerification';
import { Badge } from './Badge';
import { Button } from './Button';
import { FieldContext } from './FieldContext';
import { Spinner } from './Spinner';

interface VerificationIndicatorProps {
  status: VerificationStatus;
  /** Shown as the action when idle (e.g. after resuming) or after a failure. */
  onVerify: () => void;
  hasValue: boolean;
  label: string;
}

/** Trailing control for verifiable fields: Verify → Verifying… → Verified, or Retry. */
export function VerificationIndicator({
  status, onVerify, hasValue, label,
}: VerificationIndicatorProps) {
  const field = useContext(FieldContext);

  if (status === 'verifying') {
    return (
      <span className="mr-2 flex items-center gap-1.5 text-xs font-medium text-slate">
        <Spinner className="size-4 text-cobalt" />
        <span className="max-sm:sr-only">Verifying…</span>
      </span>
    );
  }
  if (status === 'verified') {
    return (
      <Badge tone="success" icon={<BadgeCheck aria-hidden="true" className="size-3.5" />} className="mr-1">
        <span className="max-sm:sr-only">Verified</span>
      </Badge>
    );
  }
  if (!hasValue) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        // The button gives way to "Verifying…" at once, which would drop focus to the
        // page; keep it on the field being checked (the result is announced).
        if (field) document.getElementById(field.fieldId)?.focus();
        onVerify();
      }}
      aria-label={status === 'failed' ? `Retry ${label} verification` : `Verify ${label}`}
      leadingIcon={status === 'failed'
        ? <RotateCcw aria-hidden="true" className="size-3.5" />
        : <ShieldQuestion aria-hidden="true" className="size-3.5" />}
      className="text-cobalt hover:text-cobalt-hover"
    >
      {status === 'failed' ? 'Retry' : 'Verify'}
    </Button>
  );
}

/** Screen-reader announcement for verification progress. */
export function verificationAnnouncement(status: VerificationStatus, label: string): string {
  if (status === 'verifying') return `Verifying ${label}…`;
  if (status === 'verified') return `${label} verified.`;
  if (status === 'failed') return `${label} could not be verified.`;
  return '';
}
