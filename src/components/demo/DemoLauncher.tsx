import { FlaskConical } from 'lucide-react';
import { useId, useState } from 'react';
import { useDemoMode } from '../../demo/demoMode';
import { DEMO_SCENARIOS, type DemoScenarioId } from '../../demo/scenarios';
import { navigateTo } from '../../hooks/useRoute';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { Modal } from '../common/Modal';

const HOW_IT_WORKS = [
  'Fill this step puts synthetic answers into the open step. You check them and press Continue, so every rule still runs.',
  'One-time passwords are shown on screen, and PAN and Aadhaar checks are simulated.',
  'Sample documents go through the real uploader: checks, compression and progress.',
  'Consents are never ticked for you. Reset or exit the demo at any time.',
];

/** "Try demo application": choose a synthetic scenario and start the guided demo. */
export function DemoLauncher() {
  const start = useDemoMode((state) => state.start);
  const groupId = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DemoScenarioId>(DEMO_SCENARIOS[0].id);
  const [hasDraft, setHasDraft] = useState(false);
  const scenario = DEMO_SCENARIOS.find((item) => item.id === selected) ?? DEMO_SCENARIOS[0];

  // Storage and encryption code loads on demand, keeping the landing page light.
  const openLauncher = async () => {
    setOpen(true);
    const { listDrafts } = await import('../../utils/draftStorage');
    setHasDraft(listDrafts().length > 0);
  };

  const begin = async () => {
    const { clearLocalApplication } = await import('../../demo/clearLocalApplication');
    await clearLocalApplication();
    start(selected);
    setOpen(false);
    navigateTo('apply');
  };

  return (
    <>
      <Button variant="secondary" size="lg" onClick={openLauncher} leadingIcon={<FlaskConical aria-hidden="true" className="size-4" />}>
        Try demo application
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Try a demo application"
        description="Every answer is synthetic. Pick a scenario — each one shows different rules in action."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={begin}>{hasDraft ? 'Delete saved draft and start' : 'Start demo'}</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-ink">Scenario</legend>
            {DEMO_SCENARIOS.map((item) => (
              <label key={item.id} className="flex cursor-pointer gap-3 rounded-field border border-line bg-surface p-3 transition-colors has-[:checked]:border-cobalt/50 has-[:checked]:bg-cobalt-tint/40 has-[:focus-visible]:shadow-focus">
                <input
                  type="radio"
                  name={groupId}
                  value={item.id}
                  checked={selected === item.id}
                  onChange={() => setSelected(item.id)}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-cobalt)]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">{item.title}</span>
                  <span className="text-[13px] text-slate">{item.summary}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">What this scenario shows</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] leading-5 text-ink-soft marker:text-cobalt">
              {scenario.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
            </ul>
          </div>

          <details className="group rounded-field bg-canvas px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-ink">How the demo works</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-5 text-slate">
              {HOW_IT_WORKS.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </details>

          {hasDraft && (
            <Callout tone="warning" title="You have a saved application">
              Starting a demo deletes the application saved on this device.
            </Callout>
          )}
        </div>
      </Modal>
    </>
  );
}
