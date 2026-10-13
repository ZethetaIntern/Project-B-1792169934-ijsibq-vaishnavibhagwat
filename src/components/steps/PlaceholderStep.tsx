import { getStepMeta } from '../../constants/steps';
import { useApplicationStore } from '../../store/applicationStore';
import { useStepForm } from '../wizard/useStepForm';

/** Temporary stand-in used while a step's real form is being built. */
export default function PlaceholderStep() {
  const stepId = useApplicationStore((state) => state.currentStepId);
  useStepForm(stepId);
  return (
    <div className="rounded-field border border-dashed border-line-strong p-6 text-slate">
      The
      {' '}
      <strong className="text-ink">{getStepMeta(stepId).title}</strong>
      {' '}
      step is under construction.
    </div>
  );
}
