import { Lightbulb } from 'lucide-react';
import { getStepMeta } from '../../constants/steps';
import { useApplicationStore } from '../../store/applicationStore';

/** Contextual tips for the open step, shown in the side panel. */
export function StepGuidance() {
  const stepId = useApplicationStore((state) => state.currentStepId);
  const { guidance, shortTitle } = getStepMeta(stepId);

  return (
    <section aria-labelledby="guidance-heading" className="rounded-panel border border-line bg-surface/60 p-5">
      <h2 id="guidance-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Lightbulb aria-hidden="true" className="size-4 text-warning-ink" />
        {`Good to know · ${shortTitle}`}
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5 text-[13px] leading-5 text-slate">
        {guidance.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-line-strong" />
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}
