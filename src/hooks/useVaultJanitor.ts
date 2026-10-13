import { useEffect } from 'react';
import { getReferencedFileIds } from '../schemas/step7Schema';
import { useApplicationStore } from '../store/applicationStore';
import { deleteFile, pruneVault } from '../utils/documentVault';

/**
 * Keeps the encrypted file vault in step with the application:
 * - on start, files older than the 72-hour draft TTL are purged;
 * - when a committed change drops a file (e.g. salary slips after switching to
 *   self-employed, which Step 7 clears on save), its binary is deleted too.
 * Hydrating or resetting the store (resume, Start fresh, session timeout) is not
 * an edit, so it never deletes anything — the saved draft may still need the files.
 */
export function useVaultJanitor(): void {
  useEffect(() => {
    pruneVault().catch(() => undefined);

    const initial = useApplicationStore.getState();
    let previous = { revision: initial.revision, ids: getReferencedFileIds(initial.data) };
    return useApplicationStore.subscribe((state) => {
      const ids = getReferencedFileIds(state.data);
      if (state.revision === previous.revision) {
        previous.ids.forEach((id) => {
          if (!ids.has(id)) deleteFile(id).catch(() => undefined);
        });
      }
      previous = { revision: state.revision, ids };
    });
  }, []);
}
