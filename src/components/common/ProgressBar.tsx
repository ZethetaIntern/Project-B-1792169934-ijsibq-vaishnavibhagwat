import { Check, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { StepMeta } from '../../constants/steps';
import type { StepId } from '../../types/application';
import { cn } from '../../utils/cn';

interface ProgressBarProps {
  steps: readonly StepMeta[];
  currentIndex: number;
  /** Furthest step the user may jump to (everything before it is complete). */
  reachableIndex: number;
  onSelect: (stepId: StepId) => void;
  /** True while cross-step validation is catching up with the latest answers. */
  revalidating?: boolean;
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
 *
 * On phones eight segments would be ~31px wide, under the 44×44px touch-target
 * minimum, so below `sm` the segments are a plain bar and the step buttons move
 * into an "All steps" list of full-width rows.
 */
export function ProgressBar({
  steps, currentIndex, reachableIndex, onSelect, revalidating = false,
}: ProgressBarProps) {
  const total = steps.length;
  const current = steps[currentIndex];
  const listId = useId();
  // Tied to the step it was opened on, so the list closes whenever the step changes.
  const [openAt, setOpenAt] = useState<number | null>(null);
  const listOpen = openAt === currentIndex;
  const columns = { gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` };

  return (
    <nav
      aria-label={`Application progress: step ${currentIndex + 1} of ${total}, ${current?.title ?? ''}`}
      aria-busy={revalidating || undefined}
    >
      <div className="flex items-center gap-3 sm:hidden">
        <div aria-hidden="true" className="grid flex-1 gap-1" style={columns}>
          {steps.map((step, index) => {
            const state = segmentState(index, currentIndex, reachableIndex);
            return (
              <span
                key={step.id}
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-500',
                  state === 'complete' && 'bg-brand',
                  state === 'current' && 'bg-cobalt',
                  (state === 'upcoming' || state === 'locked') && 'bg-line',
                )}
              />
            );
          })}
        </div>
        <button
          type="button"
          aria-expanded={listOpen}
          aria-controls={listId}
          onClick={() => setOpenAt(listOpen ? null : currentIndex)}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-cobalt"
        >
          All steps
          <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', listOpen && 'rotate-180')} />
        </button>
      </div>

      <ol
        id={listId}
        className={cn(listOpen ? 'mt-2 flex flex-col gap-1' : 'hidden', 'sm:mt-0 sm:grid sm:gap-1.5')}
        style={columns}
      >
        {steps.map((step, index) => {
          const state = segmentState(index, currentIndex, reachableIndex);
          const clickable = state !== 'locked' && state !== 'current';
          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={state === 'locked'}
                aria-current={state === 'current' ? 'step' : undefined}
                onClick={() => clickable && onSelect(step.id)}
                className={cn(
                  'group flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left disabled:cursor-not-allowed',
                  'sm:flex-col sm:items-stretch sm:justify-center sm:px-0 sm:py-2 lg:min-h-0',
                  state === 'current' && 'max-sm:bg-cobalt-tint/60',
                  clickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span className="relative hidden h-1.5 w-full overflow-hidden rounded-full bg-line sm:block">
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
                    'flex min-w-0 items-center gap-2 text-sm font-medium sm:hidden lg:flex lg:gap-1 lg:text-xs',
                    state === 'current' && 'text-ink',
                    state === 'complete' && 'text-slate group-hover:text-ink',
                    (state === 'upcoming' || state === 'locked') && 'text-muted',
                  )}
                >
                  {state === 'complete' ? (
                    <Check aria-hidden="true" className="size-3.5 shrink-0 text-success-ink" strokeWidth={3} />
                  ) : (
                    <span className="tabular">{index + 1}</span>
                  )}
                  <span className="truncate sm:hidden">{step.title}</span>
                  <span className="hidden truncate lg:inline">{step.shortTitle}</span>
                </span>
                {/* Accessible name = visible label first (WCAG 2.5.3), then context. */}
                <span className="sr-only">{` Step ${index + 1}: ${step.title}, ${STATE_LABEL[state]}`}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
