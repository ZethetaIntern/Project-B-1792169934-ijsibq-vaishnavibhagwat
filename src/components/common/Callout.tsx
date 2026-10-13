import {
  CircleAlert, Info, ShieldCheck, TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type CalloutTone = 'info' | 'privacy' | 'warning' | 'danger';

const TONES: Record<CalloutTone, { box: string; icon: ReactNode }> = {
  info: {
    box: 'border-cobalt/20 bg-cobalt-tint/60',
    icon: <Info aria-hidden="true" className="size-5 text-cobalt" />,
  },
  privacy: {
    box: 'border-line bg-canvas',
    icon: <ShieldCheck aria-hidden="true" className="size-5 text-success-ink" />,
  },
  warning: {
    box: 'border-warning/40 bg-warning-tint',
    icon: <TriangleAlert aria-hidden="true" className="size-5 text-warning-ink" />,
  },
  danger: {
    box: 'border-danger/30 bg-danger-tint',
    icon: <CircleAlert aria-hidden="true" className="size-5 text-danger-ink" />,
  },
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Use 'status' or 'alert' when the callout appears in response to an event. */
  role?: 'status' | 'alert';
}

/** Inline notice for disclosures, warnings and recoverable errors. */
export function Callout({
  tone = 'info', title, children, action, className, role,
}: CalloutProps) {
  return (
    <div role={role} className={cn('flex gap-3 rounded-card border p-4', TONES[tone].box, className)}>
      <span className="mt-0.5 shrink-0">{TONES[tone].icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] leading-5 text-ink-soft">
        {title && <p className="text-sm font-semibold text-ink">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-1.5">{action}</div>}
      </div>
    </div>
  );
}
