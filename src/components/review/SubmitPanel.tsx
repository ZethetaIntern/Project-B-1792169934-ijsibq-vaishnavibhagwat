import { CircleCheck, Send } from 'lucide-react';
import { useId } from 'react';
import type { SubmissionBlocker } from '../../utils/submissionReadiness';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { useWizardNavigation } from '../wizard/WizardNavigationContext';

interface SubmitPanelProps {
  blockers: readonly SubmissionBlocker[];
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}

/**
 * Submit gating: the button stays disabled until nothing blocks submission, and
 * the reasons are listed beside it (and linked to its description) so a disabled
 * control is never left unexplained.
 */
export function SubmitPanel({
  blockers, submitting, error, onSubmit,
}: SubmitPanelProps) {
  const { goTo } = useWizardNavigation();
  const statusId = useId();
  const ready = blockers.length === 0;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-canvas p-4 sm:p-5" data-testid="submit-panel">
      <div id={statusId} aria-live="polite">
        {ready ? (
          <p className="flex items-start gap-2 text-sm text-success-ink">
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Everything is ready. Submitting sends your application for a (simulated) review.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Before you can submit</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft marker:text-muted">
              {blockers.map(({ id, message, stepId }) => (
                <li key={id}>
                  {stepId ? (
                    <button
                      type="button"
                      onClick={() => goTo(stepId, { fromReview: true })}
                      className="inline-flex min-h-11 cursor-pointer items-center text-left text-cobalt underline-offset-4 hover:underline sm:min-h-6"
                    >
                      {message}
                    </button>
                  ) : message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <Callout role="alert" tone="danger" title="Submission failed">{error}</Callout>}

      <Button
        size="lg"
        onClick={onSubmit}
        disabled={!ready}
        loading={submitting}
        loadingText="Submitting…"
        aria-describedby={statusId}
        trailingIcon={<Send aria-hidden="true" className="size-4" />}
        className="sm:self-end"
        data-testid="submit-application"
      >
        Submit application
      </Button>
    </div>
  );
}
