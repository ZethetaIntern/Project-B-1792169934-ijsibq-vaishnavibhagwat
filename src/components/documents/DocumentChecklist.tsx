import {
  BadgeCheck, Circle, CircleCheck, CircleDashed, LoaderCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { DocumentTypeId, UploadedDocument } from '../../types/application';
import {
  getChecklistStatus, type ChecklistStatus, type DocumentRequirement,
} from '../../utils/documentRequirements';
import { Badge, type BadgeTone } from '../common/Badge';

const STATUS: Record<ChecklistStatus, { label: string; tone: BadgeTone; icon: ReactNode }> = {
  pending: {
    label: 'Pending', tone: 'warning', icon: <CircleDashed aria-hidden="true" className="size-4 text-warning-ink" />,
  },
  uploaded: {
    label: 'Uploaded', tone: 'info', icon: <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-cobalt motion-reduce:animate-none" />,
  },
  verified: {
    label: 'Verified', tone: 'success', icon: <CircleCheck aria-hidden="true" className="size-4 text-success-ink" />,
  },
  optional: {
    label: 'Optional', tone: 'neutral', icon: <Circle aria-hidden="true" className="size-4 text-muted" />,
  },
};

export function ChecklistBadge({ status }: { status: ChecklistStatus }) {
  const { label, tone } = STATUS[status];
  return (
    <Badge tone={tone} icon={status === 'verified' ? <BadgeCheck aria-hidden="true" className="size-3.5" /> : undefined}>
      {label}
    </Badge>
  );
}

export const documentAnchorId = (id: DocumentTypeId | 'signature') => `document-${id}`;

/** Scrolls to an item's uploader and focuses its first control. */
function jumpTo(id: DocumentTypeId | 'signature') {
  const target = document.getElementById(documentAnchorId(id));
  if (!target) return;
  target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  target.querySelector<HTMLElement>('button, canvas, input:not([type="file"])')?.focus({ preventScroll: true });
}

interface DocumentChecklistProps {
  requirements: readonly DocumentRequirement[];
  files: Partial<Record<DocumentTypeId, UploadedDocument[]>>;
  signed: boolean;
}

/**
 * Overview of everything Step 7 needs, with live status. Each entry links to its
 * uploader. Status is given as text, never colour alone.
 */
interface ChecklistRow {
  id: DocumentTypeId | 'signature';
  label: string;
  required: boolean;
  status: ChecklistStatus;
}

export function DocumentChecklist({ requirements, files, signed }: DocumentChecklistProps) {
  const rows: ChecklistRow[] = requirements.map((requirement) => ({
    id: requirement.spec.id,
    label: requirement.spec.label,
    required: requirement.required,
    status: getChecklistStatus(requirement, files[requirement.spec.id]),
  }));
  rows.push({
    id: 'signature', label: 'E-signature', required: true, status: signed ? 'verified' : 'pending',
  });
  const required = rows.filter((row) => row.required);
  const ready = required.filter((row) => row.status === 'verified' || row.status === 'uploaded').length;

  return (
    <section aria-labelledby="document-checklist-title" className="rounded-card border border-line bg-canvas/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="document-checklist-title" className="text-base font-semibold tracking-tight text-ink">Your checklist</h2>
        <p className="text-[13px] text-slate tabular" aria-live="polite">
          {`${ready} of ${required.length} required items ready`}
        </p>
      </div>
      <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-canvas-sunken">
        <div
          className="h-full rounded-full bg-success transition-[width] duration-300 ease-out"
          style={{ width: `${(ready / Math.max(required.length, 1)) * 100}%` }}
        />
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => jumpTo(row.id)}
              className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left text-sm text-ink-soft transition-colors hover:bg-ink/[0.04] sm:min-h-9"
            >
              {STATUS[row.status].icon}
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              <span className="text-xs font-medium text-slate">{STATUS[row.status].label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
