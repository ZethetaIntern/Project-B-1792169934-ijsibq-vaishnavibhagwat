import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '../common/Button';

interface StepNavigationProps {
  formId: string;
  canGoBack: boolean;
  onBack: () => void;
  /** Hide Continue on the final step — Submit lives in the review step itself. */
  showContinue: boolean;
  busy: boolean;
  continueLabel: string;
  /** Shorter label for narrow phones (≤ 640 px), e.g. "Review". */
  continueShortLabel?: string;
  onSaveDraft?: () => void;
}

/**
 * Persistent action bar. Continue is a real submit button bound to the step form
 * (`form` attribute), so Enter in any field advances exactly like a click.
 */
export function StepNavigation({
  formId,
  canGoBack,
  onBack,
  showContinue,
  busy,
  continueLabel,
  continueShortLabel = continueLabel,
  onSaveDraft,
}: StepNavigationProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75 sm:mx-0 sm:rounded-card sm:border sm:bg-surface/90 sm:px-4 sm:shadow-raised">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={!canGoBack || busy}
          leadingIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
          aria-label="Back to previous step"
        >
          <span className="hidden sm:inline">Back</span>
        </Button>
        {onSaveDraft && (
          <Button
            variant="ghost"
            onClick={onSaveDraft}
            leadingIcon={<Save aria-hidden="true" className="size-4" />}
            aria-label="Save draft"
            className="max-sm:w-11 max-sm:gap-0 max-sm:px-0"
          >
            <span className="max-sm:hidden">Save draft</span>
          </Button>
        )}
        <div className="flex-1" />
        {showContinue && (
          <Button
            type="submit"
            form={formId}
            loading={busy}
            loadingText="Checking…"
            trailingIcon={<ArrowRight aria-hidden="true" className="size-4" />}
            className="min-w-36"
          >
            <span className="sm:hidden">{continueShortLabel}</span>
            <span className="max-sm:hidden">{continueLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
