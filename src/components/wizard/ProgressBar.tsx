import { Check } from 'lucide-react';
import type { StepMeta } from '../../constants/steps';
import type { StepId } from '../../types/application';
import { cn } from '../../utils/cn';

interface ProgressBarProps {
  steps: readonly StepMeta[];
  currentIndex: number;
  /** Furthest step the user may jump to (everything before it is complete). */
  reachableIndex: number;
  onSelect: (stepId: StepId) => void;
}

type SegmentState = 'complete' | 'current' | 'upcoming' | 'locked';

function segmentState(index: number, currentIndex: number, reachableIndex: number): SegmentState {
  if (index === currentIndex) return 'current';
  if (index < reachableIndex) return 'complete';
  if (index === reachableIndex) return 'upcoming';
  return 'locked';
}

const STATE_LABEL: Record<SegmentState, string> = {
  complete: 'completed',
  current: 'current step',
  upcoming: 'not started',
  locked: 'not available yet',
};

/**
 * Segmented progress indicator. Each segment is a button for steps the user may
 * revisit; later steps are disabled until everything before them is valid.
 * The `<nav>` label announces "step X of Y" to screen readers.
 */
export function ProgressBar({
  steps, currentIndex, reachableIndex, onSelect,
}: ProgressBarProps) {
  const total = steps.length;
  const current = steps[currentIndex];

  return (
    <nav aria-label={`Application progress: step ${currentIndex + 1} of ${total}, ${current?.title ?? ''}`}>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const state = segmentState(index, currentIndex, reachableIndex);
          const clickable = state !== 'locked' && state !== 'current';
          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={state === 'locked'}
                aria-current={state === 'current' ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.title}, ${STATE_LABEL[state]}`}
                onClick={() => clickable && onSelect(step.id)}
                className={cn(
                  'group flex w-full flex-col gap-2 rounded-md py-2 text-left disabled:cursor-not-allowed',
                  clickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-500 ease-out',
                      state === 'complete' && 'w-full bg-brand',
                      state === 'current' && 'w-full bg-cobalt',
                      (state === 'upcoming' || state === 'locked') && 'w-0',
                    )}
                  />
                </span>
                <span
                  className={cn(
                    'hidden items-center gap-1 truncate text-xs font-medium lg:flex',
                    state === 'current' && 'text-ink',
                    state === 'complete' && 'text-slate group-hover:text-ink',
                    (state === 'upcoming' || state === 'locked') && 'text-muted',
                  )}
                >
                  {state === 'complete' ? (
                    <Check aria-hidden="true" className="size-3.5 shrink-0 text-success-ink" strokeWidth={3} />
                  ) : (
                    <span aria-hidden="true" className="tabular">{index + 1}</span>
                  )}
                  <span className="truncate">{step.shortTitle}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
