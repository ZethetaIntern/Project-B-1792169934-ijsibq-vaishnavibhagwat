import { History, ShieldAlert } from 'lucide-react';
import { useRef } from 'react';
import { getLoanProduct } from '../../constants/loan';
import { getStepMeta } from '../../constants/steps';
import type { useFormPersistence } from '../../hooks/useFormPersistence';
import type { DraftSummary } from '../../utils/draftStorage';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

type Persistence = ReturnType<typeof useFormPersistence>;

function describe(draft: DraftSummary): string {
  const savedAt = new Date(draft.timestamp).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
  return `Saved ${savedAt} · stopped at “${getStepMeta(draft.step).title}”`;
}

/** "You have a saved application for [Loan Type]. Resume or Start Fresh?" */
export function ResumeDraftModal({ persistence }: { persistence: Persistence }) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  const {
    phase, drafts, failure, resume, startFresh, acknowledgeFailure,
  } = persistence;
  const [latest, ...others] = drafts;
  const product = latest ? getLoanProduct(latest.loanType) : undefined;

  if (phase === 'failed') {
    return (
      <Modal
        open
        onClose={acknowledgeFailure}
        dismissible={false}
        role="alertdialog"
        size="sm"
        icon={<ShieldAlert aria-hidden="true" className="size-6 text-warning-ink" />}
        title="We couldn't restore your saved application"
        description={`${failure ?? ''} To protect your information we have deleted it. Please start a new application.`}
        footer={<Button onClick={acknowledgeFailure}>Start a new application</Button>}
      />
    );
  }

  if ((phase !== 'prompt' && phase !== 'restoring') || !latest) return null;

  return (
    <Modal
      open
      onClose={startFresh}
      dismissible={false}
      size="sm"
      initialFocusRef={resumeRef}
      icon={<History aria-hidden="true" className="size-6 text-cobalt" />}
      title={`You have a saved application for ${product ? product.label : 'a loan'}. Resume or start fresh?`}
      description={(
        <>
          <span className="block">{describe(latest)}</span>
          <span className="mt-2 block text-[13px]">
            Drafts are encrypted and kept only on this device for up to 72 hours.
            {others.length > 0 && ` You also have ${others.length} other saved draft${others.length > 1 ? 's' : ''}; starting fresh deletes all of them.`}
          </span>
        </>
      )}
      footer={(
        <>
          <Button variant="secondary" onClick={startFresh} disabled={phase === 'restoring'}>Start fresh</Button>
          <Button ref={resumeRef} onClick={() => resume(latest.key)} loading={phase === 'restoring'} loadingText="Restoring…">
            Resume application
          </Button>
        </>
      )}
    />
  );
}
