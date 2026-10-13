import { useCallback, useState } from 'react';
import { useApplicationStore } from '../store/applicationStore';
import { clearVault } from '../utils/documentVault';
import {
  deleteDraft, listDrafts, loadDraft, type DraftSummary,
} from '../utils/draftStorage';

export type PersistencePhase = 'prompt' | 'restoring' | 'failed' | 'ready';

/**
 * Resume-or-start-fresh flow (C3.4). On mount, saved drafts younger than 72 hours
 * are offered; auto-save stays off (`phase !== 'ready'`) until the applicant
 * decides, so an existing draft is never overwritten by an empty form.
 */
export function useFormPersistence() {
  const hydrate = useApplicationStore((state) => state.hydrate);
  const reset = useApplicationStore((state) => state.reset);
  const [drafts, setDrafts] = useState<DraftSummary[]>(() => listDrafts());
  const [phase, setPhase] = useState<PersistencePhase>(() => (drafts.length ? 'prompt' : 'ready'));
  const [failure, setFailure] = useState<string | null>(null);

  const resume = useCallback(async (key: string): Promise<boolean> => {
    setPhase('restoring');
    try {
      hydrate(await loadDraft(key));
      setPhase('ready');
      return true;
    } catch (problem) {
      // Corrupted, tampered or outdated: discard it rather than load bad data.
      deleteDraft(key);
      setDrafts((current) => current.filter((draft) => draft.key !== key));
      setFailure((problem as Error).message);
      setPhase('failed');
      return false;
    }
  }, [hydrate]);

  const startFresh = useCallback(() => {
    drafts.forEach((draft) => deleteDraft(draft.key));
    // Every saved draft is gone, so no stored file is referenced any more.
    clearVault().catch(() => undefined);
    setDrafts([]);
    reset();
    setPhase('ready');
  }, [drafts, reset]);

  const acknowledgeFailure = useCallback(() => {
    setFailure(null);
    reset();
    setPhase('ready');
  }, [reset]);

  /** Looks for drafts again, e.g. after the session timed out. */
  const recheck = useCallback(() => {
    const found = listDrafts();
    setDrafts(found);
    setPhase(found.length ? 'prompt' : 'ready');
  }, []);

  return {
    phase, drafts, failure, resume, startFresh, acknowledgeFailure, recheck,
  };
}
