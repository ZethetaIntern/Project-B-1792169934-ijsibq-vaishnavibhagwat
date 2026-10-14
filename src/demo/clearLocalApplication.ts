import { useApplicationStore } from '../store/applicationStore';
import { clearVault } from '../utils/documentVault';
import { deleteAllDrafts } from '../utils/draftStorage';

/**
 * Removes every answer, saved draft and stored file, so a demo starts (or ends)
 * clean. Kept apart from the demo state so the landing page does not load the
 * encryption and storage code until a demo actually starts.
 */
export async function clearLocalApplication(): Promise<void> {
  deleteAllDrafts();
  useApplicationStore.getState().reset();
  await clearVault().catch(() => undefined);
}
