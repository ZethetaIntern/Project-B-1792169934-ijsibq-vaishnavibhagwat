import { LogOut, TimerOff } from 'lucide-react';
import {
  useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { getLoanProduct } from '../../constants/loan';
import {
  AUTOSAVE_INTERVAL_MS, AUTOSAVE_TOAST_MS, SESSION_TIMEOUT_MS,
} from '../../constants/persistence';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useFormPersistence } from '../../hooks/useFormPersistence';
import { navigateTo } from '../../hooks/useRoute';
import {
  useDraftConflict, useIdleTimeout, useOnlineStatus,
} from '../../hooks/useSessionSignals';
import { getApplicationSnapshot, useApplicationStore } from '../../store/applicationStore';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { AutosaveStatus } from '../persistence/AutosaveStatus';
import { ResumeDraftModal } from '../persistence/ResumeDraftModal';
import { LoanLedger } from '../summary/LoanLedger';
import { MobileLoanSummary } from '../summary/MobileLoanSummary';
import { getLiveApplicationData, stepFormBridge } from '../wizard/stepFormBridge';
import { Wizard } from '../wizard/Wizard';
import { AppHeader } from './AppHeader';
import { StepGuidance } from './StepGuidance';

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/**
 * Experience B — the application workspace: compact header with auto-save status,
 * the wizard in the main column and a contextual side panel (collapsed into the
 * flow on small screens). Owns persistence: resume prompt, auto-save, session
 * timeout, offline and multi-tab warnings.
 */
export default function ApplicationWorkspace() {
  const storeData = useApplicationStore((state) => state.data);
  const currentStepId = useApplicationStore((state) => state.currentStepId);
  const reset = useApplicationStore((state) => state.reset);
  const { loanType } = storeData.loan;
  const product = getLoanProduct(loanType);
  const { toast } = useToast();
  const online = useOnlineStatus();
  const persistence = useFormPersistence();
  const [sessionExpired, setSessionExpired] = useState(false);
  const ready = persistence.phase === 'ready' && !sessionExpired;

  // Any committed change (store) or unsaved keystroke (open step) restarts the timer.
  const editVersion = useSyncExternalStore(
    stepFormBridge.subscribeToEdits,
    stepFormBridge.getEditVersion,
  );
  const changeSignal = useMemo(() => ({ storeData, editVersion }), [storeData, editVersion]);

  const { status, lastSavedAt, saveNow } = useAutoSave(changeSignal, AUTOSAVE_INTERVAL_MS, {
    getSnapshot: () => ({
      data: getLiveApplicationData(),
      currentStepId: getApplicationSnapshot().currentStepId,
    }),
    enabled: ready,
    onSaved: (summary, trigger) => {
      if (trigger === 'timer' || trigger === 'manual') {
        toast({
          id: 'autosave', tone: 'success', title: `Draft saved at ${timeLabel(summary.timestamp)}`, duration: AUTOSAVE_TOAST_MS,
        });
      }
    },
    onError: () => toast({
      id: 'autosave-error',
      tone: 'danger',
      title: "Couldn't save your draft",
      description: 'Browser storage may be full or blocked. Your answers are still on this page.',
      duration: 6000,
    }),
  });

  // Save on every step change, and when the tab is hidden or closed.
  const lastStep = useRef(currentStepId);
  useEffect(() => {
    if (lastStep.current === currentStepId) return;
    lastStep.current = currentStepId;
    saveNow('navigation');
  }, [currentStepId, saveNow]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') saveNow('exit');
    };
    const onPageHide = () => saveNow('exit');
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [saveNow]);

  // After 15 idle minutes: save, then clear personal data from memory.
  useIdleTimeout(SESSION_TIMEOUT_MS, async () => {
    await saveNow('exit');
    reset();
    setSessionExpired(true);
  }, ready);

  const { conflictAt, dismissConflict } = useDraftConflict(loanType);

  // Clear applicant data from memory when leaving the workspace (B4.4).
  useEffect(() => () => useApplicationStore.getState().reset(), []);

  const exit = async () => {
    await saveNow('exit');
    navigateTo('landing');
  };

  return (
    <div className="min-h-dvh">
      <AppHeader
        title={product ? `${product.label} application` : 'Loan application'}
        actions={(
          <>
            <span className="hidden sm:block">
              <AutosaveStatus status={status} lastSavedAt={lastSavedAt} onRetry={() => saveNow('manual')} />
            </span>
            <Button variant="ghost" size="sm" onClick={exit} leadingIcon={<LogOut aria-hidden="true" className="size-4" />}>
              Save &amp; exit
            </Button>
          </>
        )}
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pt-10">
        <main id="main-content" className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 empty:hidden">
            {!online && (
              <Callout role="status" tone="warning" title="You're offline">
                Keep going — your draft is saved on this device. Verification, PIN lookup and
                submission will work again once you reconnect.
              </Callout>
            )}
            {conflictAt && (
              <Callout
                role="alert"
                tone="warning"
                title="This application is open in another tab"
                action={<Button variant="link" onClick={dismissConflict}>Continue in this tab</Button>}
              >
                {`Another tab saved changes at ${timeLabel(conflictAt.toISOString())}. If you keep working here, this tab's next save will replace them.`}
              </Callout>
            )}
          </div>
          <div className="mb-3 sm:hidden">
            <AutosaveStatus status={status} lastSavedAt={lastSavedAt} onRetry={() => saveNow('manual')} />
          </div>
          <MobileLoanSummary />
          <Wizard onSaveDraft={() => saveNow('manual')} />
        </main>
        <aside aria-label="Application summary" className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-4">
            <LoanLedger />
            <StepGuidance />
          </div>
        </aside>
      </div>

      <ResumeDraftModal persistence={persistence} />
      <Modal
        open={sessionExpired}
        onClose={() => undefined}
        dismissible={false}
        size="sm"
        icon={<TimerOff aria-hidden="true" className="size-6 text-cobalt" />}
        title="Your session timed out"
        description="For your security we closed this session after 15 minutes of inactivity and cleared your details from the page. Your progress is saved, encrypted, on this device."
        footer={(
          <Button onClick={() => {
            setSessionExpired(false);
            persistence.recheck();
          }}
          >
            Continue my application
          </Button>
        )}
      />
    </div>
  );
}
