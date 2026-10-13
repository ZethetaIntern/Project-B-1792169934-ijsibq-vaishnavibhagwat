import { useCallback, useRef, useState } from 'react';
import { useApplicationStore, type SubmissionReceipt } from '../store/applicationStore';
import type { ApplicationData } from '../types/application';
import { clearVault } from '../utils/documentVault';
import { deleteAllDrafts, lockDrafts } from '../utils/draftStorage';
import { NetworkUnavailableError } from '../utils/simulate';
import { submitApplication } from '../utils/submitApplication';

export type SubmitStatus = 'idle' | 'submitting' | 'failed';

/**
 * Final submission with a double-submit guard. The guard is a ref, not state, so
 * two clicks (or Enter presses) in the same frame cannot both get through. On
 * success the saved drafts and stored files are deleted — the application no
 * longer needs to live on this device.
 */
export function useApplicationSubmit() {
  const completeSubmission = useApplicationStore((state) => state.completeSubmission);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const submit = useCallback(async (application: ApplicationData) => {
    if (inFlight.current || useApplicationStore.getState().submission) return null;
    inFlight.current = true;
    setStatus('submitting');
    setError(null);
    try {
      const receipt: SubmissionReceipt = await submitApplication(application);
      lockDrafts();
      deleteAllDrafts();
      await clearVault().catch(() => undefined);
      completeSubmission(receipt);
      setStatus('idle');
      return receipt;
    } catch (problem) {
      setError(problem instanceof NetworkUnavailableError
        ? problem.message
        : 'We could not submit your application. Nothing was lost — please try again.');
      setStatus('failed');
      return null;
    } finally {
      inFlight.current = false;
    }
  }, [completeSubmission]);

  return { submit, status, error };
}
