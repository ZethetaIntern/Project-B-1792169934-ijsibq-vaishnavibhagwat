import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react';
import { getActiveSteps } from '../../constants/steps';
import { getApplicationSnapshot, useApplicationStore } from '../../store/applicationStore';
import type { StepId } from '../../types/application';
import {
  canNavigateTo,
  getNextStepId,
  getPreviousStepId,
  getReachableIndex,
  getReturnToReviewTarget,
  resolveActiveStepId,
} from '../../utils/wizardNavigation';
import { LoadErrorBoundary } from '../common/LoadErrorBoundary';
import { ProgressBar } from './ProgressBar';
import { stepFormBridge } from './stepFormBridge';
import { StepNavigation } from './StepNavigation';
import { STEP_COMPONENTS } from './stepComponents';
import { WizardNavigationContext, type WizardNavigation } from './WizardNavigationContext';

const FORM_ID = 'wizard-step-form';
const FOCUSABLE_FIELD = [
  'input:not([type="hidden"]):not([disabled]):not(.sr-only)',
  'input.sr-only:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button[role="combobox"]:not([disabled])',
].join(',');

function StepSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-5">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <div className="h-3.5 w-32 rounded bg-canvas-sunken" />
          <div className="h-11 rounded-field bg-canvas-sunken" />
        </div>
      ))}
    </div>
  );
}

/** Runs `onMount` after the (lazy) step component has mounted. */
function StepMountObserver({ stepId, onMount, children }: {
  stepId: StepId; onMount: (stepId: StepId) => void; children: ReactNode;
}) {
  useEffect(() => {
    onMount(stepId);
  }, [onMount, stepId]);
  return children;
}

interface WizardProps {
  onSaveDraft?: () => void;
}

/**
 * Orchestrates the multi-step flow: which steps are active, validation gating on
 * Continue, Back without losing data, jumping between completed steps, browser
 * back/forward, focus management and screen-reader announcements.
 */
export function Wizard({ onSaveDraft }: WizardProps) {
  const data = useApplicationStore((state) => state.data);
  const storedStepId = useApplicationStore((state) => state.currentStepId);
  const returnToReview = useApplicationStore((state) => state.returnToReview);
  const goToStep = useApplicationStore((state) => state.goToStep);
  const replaceSection = useApplicationStore((state) => state.replaceSection);

  const steps = useMemo(() => getActiveSteps(data), [data]);
  const currentStepId = resolveActiveStepId(storedStepId, data);
  const currentIndex = Math.max(steps.findIndex((step) => step.id === currentStepId), 0);

  // Cross-step validation — every step's schema against the latest answers — runs in a
  // transition: keystrokes stay urgent while this lower-priority render catches up,
  // and React drops stale passes when the person keeps typing.
  const [isRevalidating, startRevalidation] = useTransition();
  const [validatedData, setValidatedData] = useState(data);
  useEffect(() => useApplicationStore.subscribe((state, previous) => {
    if (state.data !== previous.data) startRevalidation(() => setValidatedData(state.data));
  }), []);
  const reachableStepId = useMemo(() => {
    const validatedSteps = getActiveSteps(validatedData);
    return validatedSteps[getReachableIndex(validatedSteps, validatedData)]?.id;
  }, [validatedData]);
  const validatedIndex = steps.findIndex((step) => step.id === reachableStepId);
  // Until a pass catches up with a step being added or removed, keep the open one.
  const reachableIndex = validatedIndex >= 0 ? validatedIndex : currentIndex;
  const meta = steps[currentIndex];
  const StepComponent = STEP_COMPONENTS[currentStepId];
  // Stable element: live store updates (e.g. typed income) re-render the panel, not the form.
  const stepElement = useMemo(() => <StepComponent />, [StepComponent]);

  const headingId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const focusOnMountRef = useRef(false);
  const fromHistoryRef = useRef(false);
  const [busy, setBusy] = useState(false);
  // Continue only works once the step's (code-split) form has mounted and registered.
  const [readyStepId, setReadyStepId] = useState<StepId | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // The stored step can drop out of the flow (e.g. co-applicant no longer needed).
  useEffect(() => {
    if (storedStepId !== currentStepId) goToStep(currentStepId);
  }, [storedStepId, currentStepId, goToStep]);

  const navigate = useCallback((target: StepId, options?: { fromReview?: boolean }) => {
    const latest = getApplicationSnapshot().data;
    const activeSteps = getActiveSteps(latest);
    const index = activeSteps.findIndex((step) => step.id === target);
    focusOnMountRef.current = true;
    setAnnouncement(`Step ${index + 1} of ${activeSteps.length}: ${activeSteps[index]?.title ?? ''}`);
    goToStep(target, options);
  }, [goToStep]);

  /** Saves the open step's values without validating (Back, jumps, history). */
  const saveOpenStep = useCallback(() => {
    const controller = stepFormBridge.get();
    if (controller) replaceSection(controller.stepId, controller.getValues());
  }, [replaceSection]);

  const runLocked = async (task: () => Promise<void> | void) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runLocked(async () => {
      const controller = stepFormBridge.get();
      if (!controller) return;
      const valid = await controller.validate();
      if (!valid) {
        setAnnouncement('Some answers need your attention. The first one has been selected.');
        return;
      }
      const latest = getApplicationSnapshot().data;
      const target = returnToReview
        ? getReturnToReviewTarget(latest)
        : getNextStepId(currentStepId, latest);
      if (target) navigate(target);
    });
  };

  const handleBack = () => runLocked(() => {
    saveOpenStep();
    const previous = getPreviousStepId(currentStepId, getApplicationSnapshot().data);
    if (previous) navigate(previous);
  });

  const navigation = useMemo<WizardNavigation>(() => ({
    goTo: (target, options) => {
      if (lockRef.current) return;
      saveOpenStep();
      if (canNavigateTo(target, getApplicationSnapshot().data)) navigate(target, options);
    },
  }), [navigate, saveOpenStep]);

  const handleSelect = (target: StepId) => runLocked(async () => {
    const targetIndex = steps.findIndex((step) => step.id === target);
    if (targetIndex > currentIndex) {
      // Moving forward requires the open step to be valid.
      const valid = await stepFormBridge.get()?.validate();
      if (!valid) return;
    } else {
      saveOpenStep();
    }
    if (canNavigateTo(target, getApplicationSnapshot().data)) navigate(target);
  });

  // Browser history: every step is an entry, so the Back button walks the wizard.
  useEffect(() => {
    if (fromHistoryRef.current) {
      fromHistoryRef.current = false;
      return;
    }
    const url = `${window.location.pathname}?step=${currentStepId}`;
    if (window.history.state?.stepId === undefined) {
      window.history.replaceState({ ...window.history.state, stepId: currentStepId }, '', url);
    } else if (window.history.state.stepId !== currentStepId) {
      window.history.pushState({ stepId: currentStepId }, '', url);
    }
  }, [currentStepId]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const target = event.state?.stepId as StepId | undefined;
      if (!target) return;
      saveOpenStep();
      const { currentStepId: open } = getApplicationSnapshot();
      if (canNavigateTo(target, getApplicationSnapshot().data)) {
        fromHistoryRef.current = true;
        navigate(target);
      } else {
        // Not reachable yet (e.g. forward past an invalid step): stay put.
        window.history.pushState({ stepId: open }, '', `${window.location.pathname}?step=${open}`);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [navigate, saveOpenStep]);

  const handleStepMounted = useCallback((stepId: StepId) => {
    setReadyStepId(stepId);
    // Marks the step as interactive (form subscriptions are live) — used by E2E tests.
    containerRef.current?.setAttribute('data-step-ready', 'true');
    if (!focusOnMountRef.current) return;
    focusOnMountRef.current = false;
    window.scrollTo({ top: 0 });
    const firstField = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_FIELD);
    firstField?.focus({ preventScroll: true });
  }, []);

  const isLast = currentIndex === steps.length - 1;
  const nextIsReview = steps[currentIndex + 1]?.id === 'review';
  let continueLabel = nextIsReview ? 'Review application' : 'Continue';
  let continueShortLabel = nextIsReview ? 'Review' : 'Continue';
  if (returnToReview) {
    continueLabel = 'Save and return to review';
    continueShortLabel = 'Back to review';
  }

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar
        steps={steps}
        currentIndex={currentIndex}
        reachableIndex={reachableIndex}
        revalidating={isRevalidating}
        onSelect={handleSelect}
      />

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      <div key={currentStepId} className="flex animate-step-in flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-cobalt tabular">
            {`Step ${currentIndex + 1} of ${steps.length}`}
          </p>
          <h1 id={headingId} className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
            {meta?.title}
          </h1>
          <p className="max-w-2xl text-[15px] leading-6 text-slate">{meta?.description}</p>
        </header>

        <form id={FORM_ID} noValidate aria-labelledby={headingId} onSubmit={handleSubmit}>
          <div ref={containerRef} className="rounded-panel border border-line bg-surface p-5 shadow-card sm:p-8">
            {currentStepId !== 'review' && (
              <p className="mb-6 text-[13px] text-slate">All fields are required unless marked Optional.</p>
            )}
            <LoadErrorBoundary key={currentStepId} title="This step did not load">
              <Suspense fallback={<StepSkeleton />}>
                <WizardNavigationContext.Provider value={navigation}>
                  <StepMountObserver stepId={currentStepId} onMount={handleStepMounted}>
                    {stepElement}
                  </StepMountObserver>
                </WizardNavigationContext.Provider>
              </Suspense>
            </LoadErrorBoundary>
          </div>
        </form>
      </div>

      <StepNavigation
        formId={FORM_ID}
        canGoBack={currentIndex > 0}
        onBack={handleBack}
        showContinue={!isLast}
        busy={busy}
        stepReady={readyStepId === currentStepId}
        continueLabel={continueLabel}
        continueShortLabel={continueShortLabel}
        onSaveDraft={onSaveDraft}
      />
    </div>
  );
}
