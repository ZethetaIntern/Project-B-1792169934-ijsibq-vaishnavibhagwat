import { create } from 'zustand';
import { useApplicationStore } from '../store/applicationStore';
import { clearVault } from '../utils/documentVault';
import { deleteAllDrafts } from '../utils/draftStorage';
import { getDemoScenario, type DemoScenarioId } from './scenarios';

/** Session-only (not PII): which demo is running, so a reload stays in demo mode. */
const SESSION_KEY = 'lendswift_demo_scenario';

function readSession(): DemoScenarioId | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    return getDemoScenario(id)?.id ?? null;
  } catch {
    return null;
  }
}

function writeSession(id: DemoScenarioId | null) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: demo mode simply ends on reload.
  }
}

interface DemoModeState {
  scenarioId: DemoScenarioId | null;
  start: (id: DemoScenarioId) => void;
  stop: () => void;
}

export const useDemoMode = create<DemoModeState>()((set) => ({
  scenarioId: readSession(),
  start: (id) => {
    writeSession(id);
    set({ scenarioId: id });
  },
  stop: () => {
    writeSession(null);
    set({ scenarioId: null });
  },
}));

/** Removes every answer, saved draft and stored file, so a demo starts (or ends) clean. */
export async function clearLocalApplication(): Promise<void> {
  deleteAllDrafts();
  useApplicationStore.getState().reset();
  await clearVault().catch(() => undefined);
}
