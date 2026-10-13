import { BadgeCheck, PencilLine } from 'lucide-react';
import { useId } from 'react';
import type { ReviewSectionData } from '../../utils/reviewSummary';
import { Button } from '../common/Button';
import { useWizardNavigation } from '../wizard/WizardNavigationContext';

interface ReviewSectionProps {
  section: ReviewSectionData;
  /** Show PAN, Aadhaar and incomes in full instead of masked. */
  revealed: boolean;
}

/** Read-only summary of one step with an Edit link back to it. */
export function ReviewSection({ section, revealed }: ReviewSectionProps) {
  const { goTo } = useWizardNavigation();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-card border border-line bg-surface" data-testid={`review-${section.stepId}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <h3 id={headingId} className="text-[15px] font-semibold text-ink">{section.title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(section.stepId, { fromReview: true })}
          leadingIcon={<PencilLine aria-hidden="true" className="size-4" />}
          aria-label={`Edit ${section.title}`}
          className="-mr-2 text-cobalt hover:text-cobalt-hover"
        >
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
        {section.items.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-slate">{item.label}</dt>
            <dd className="flex min-w-0 items-center gap-1.5 text-sm font-medium break-words text-ink tabular">
              <span className="min-w-0">{(!revealed && item.masked) || item.value || '—'}</span>
              {item.verified && (
                <BadgeCheck aria-label="Verified" className="size-4 shrink-0 text-success-ink" />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
