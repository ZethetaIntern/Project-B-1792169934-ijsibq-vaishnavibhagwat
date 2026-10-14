import {
  FlaskConical, ListChecks, LogOut, RotateCcw, Wand2,
} from 'lucide-react';
import { useId, useState } from 'react';
import { clearLocalApplication, useDemoMode } from '../../demo/demoMode';
import { fillDemoStep } from '../../demo/fillDemoStep';
import { getDemoScenario } from '../../demo/scenarios';
import { navigateTo } from '../../hooks/useRoute';
import { useApplicationStore } from '../../store/applicationStore';
import { Button } from '../common/Button';
import { Collapse } from '../common/Collapse';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

/**
 * Shown above the wizard while a demo runs: fills the open step with synthetic
 * answers (the person still presses Continue), explains what the scenario shows,
 * and resets or ends the demo — clearing every demo answer, draft and file.
 */
export function DemoBar() {
  const scenarioId = useDemoMode((state) => state.scenarioId);
  const stop = useDemoMode((state) => state.stop);
  const currentStepId = useApplicationStore((state) => state.currentStepId);
  const { toast } = useToast();
  const guideId = useId();
  const [guideOpen, setGuideOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [filling, setFilling] = useState(false);
  const scenario = getDemoScenario(scenarioId);
  if (!scenario) return null;

  const fill = async () => {
    setFilling(true);
    try {
      const outcome = await fillDemoStep(scenario, useApplicationStore.getState().data);
      toast({
        id: 'demo-fill', tone: outcome.filled ? 'info' : 'warning', title: outcome.filled ? 'Demo answers filled in' : 'Nothing filled', description: outcome.message, duration: 6000,
      });
    } finally {
      setFilling(false);
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    await clearLocalApplication();
    toast({
      id: 'demo-reset', tone: 'success', title: 'Demo reset', description: 'All demo answers and sample files were cleared.',
    });
  };

  const exit = async () => {
    await clearLocalApplication();
    stop();
    navigateTo('landing');
  };

  return (
    <section aria-label="Demo mode" className="mb-5 rounded-card border border-cobalt/25 bg-cobalt-tint/50 p-4" data-testid="demo-bar">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-cobalt" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-semibold text-ink">{`Demo: ${scenario.title}`}</p>
            <p className="text-[13px] leading-5 text-slate">
              Synthetic data only. Fill a step, check it, then press Continue — every rule
              still applies.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            onClick={fill}
            loading={filling}
            loadingText="Filling…"
            disabled={currentStepId === 'review'}
            leadingIcon={<Wand2 aria-hidden="true" className="size-4" />}
          >
            Fill this step
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={guideOpen}
            aria-controls={guideId}
            onClick={() => setGuideOpen((open) => !open)}
            leadingIcon={<ListChecks aria-hidden="true" className="size-4" />}
          >
            What to try
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)} leadingIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
            Reset demo
          </Button>
          <Button variant="ghost" size="sm" onClick={exit} leadingIcon={<LogOut aria-hidden="true" className="size-4" />}>
            Exit demo
          </Button>
        </div>
      </div>

      <Collapse open={guideOpen} id={guideId}>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 border-t border-cobalt/15 pt-3 pl-5 text-[13px] leading-5 text-ink-soft marker:text-cobalt">
          {scenario.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
          <li>
            One-time passwords appear on screen, and PAN and Aadhaar checks take about 1.5
            seconds.
          </li>
          {currentStepId === 'review' && <li>Consents are never ticked for you — tick them to submit.</li>}
        </ul>
      </Collapse>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        role="alertdialog"
        size="sm"
        title="Reset the demo?"
        description="This clears every demo answer, the saved draft and all sample files, and takes you back to Step 1."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Keep going</Button>
            <Button variant="danger" onClick={reset}>Reset demo</Button>
          </>
        )}
      />
    </section>
  );
}
