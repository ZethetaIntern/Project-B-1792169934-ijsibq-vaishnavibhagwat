import {
  DRAFT_KEY_PREFIX, DRAFT_META_SUFFIX, DRAFT_SCHEMA_VERSION, DRAFT_TTL_MS,
} from '../constants/persistence';
import { draftMetaSchema, draftPayloadSchema } from '../schemas/draftSchema';
import type { ApplicationSnapshot } from '../store/applicationStore';
import type { LoanType, StepId } from '../types/application';
import { decryptString, encryptString } from './encryption';
import { createUuid } from './ids';

export interface DraftMeta {
  version: string;
  timestamp: string;
  step: StepId;
  loanType: LoanType | '';
  tabId: string;
}

export interface DraftSummary extends DraftMeta {
  key: string;
}

export class DraftUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DraftUnavailableError';
  }
}

/** Identifies this browser tab so concurrent tabs can detect each other's saves. */
export const TAB_ID = typeof crypto !== 'undefined' ? createUuid() : `tab-${Date.now()}`;

export const draftKeyFor = (loanType: LoanType | '') => `${DRAFT_KEY_PREFIX}${loanType || 'new'}`;
const metaKeyFor = (draftKey: string) => `${draftKey}${DRAFT_META_SUFFIX}`;
export function isDraftKey(key: string | null): key is string {
  return Boolean(key?.startsWith(DRAFT_KEY_PREFIX)) && !key?.endsWith(DRAFT_META_SUFFIX);
}

function storageKeys(): string[] {
  return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => key !== null);
}

let draftsLocked = false;

/**
 * Blocks draft writes, e.g. right after submission: an auto-save that started
 * encrypting a moment earlier must not write the draft back once it was cleared.
 */
export function lockDrafts(locked = true): void {
  draftsLocked = locked;
}

export function deleteDraft(key: string): void {
  localStorage.removeItem(key);
  localStorage.removeItem(metaKeyFor(key));
}

export function deleteAllDrafts(): void {
  storageKeys()
    .filter((key) => key.startsWith(DRAFT_KEY_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

function readMeta(key: string): DraftMeta | null {
  try {
    const parsed = draftMetaSchema.safeParse(JSON.parse(localStorage.getItem(metaKeyFor(key)) ?? 'null'));
    return parsed.success ? (parsed.data as DraftMeta) : null;
  } catch {
    return null;
  }
}

/**
 * Saved drafts, newest first. Expired drafts (> 72 h) and drafts without readable
 * metadata are purged on the way.
 */
export function listDrafts(now = Date.now()): DraftSummary[] {
  return storageKeys()
    .filter(isDraftKey)
    .flatMap((key) => {
      const meta = readMeta(key);
      if (!meta || now - Date.parse(meta.timestamp) > DRAFT_TTL_MS) {
        deleteDraft(key);
        return [];
      }
      return [{ ...meta, key }];
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

/**
 * Encrypts and writes the application under `lendswift_draft_[loanType]` with its
 * metadata beside it. Drafts this tab wrote under a previous loan type are removed.
 */
export async function saveDraft(
  snapshot: ApplicationSnapshot,
  tabId = TAB_ID,
): Promise<DraftSummary> {
  const timestamp = new Date().toISOString();
  const key = draftKeyFor(snapshot.data.loan.loanType);
  const payload = JSON.stringify({
    version: DRAFT_SCHEMA_VERSION,
    savedAt: timestamp,
    currentStepId: snapshot.currentStepId,
    data: snapshot.data,
  });
  const sealed = await encryptString(payload, key);
  const meta: DraftMeta = {
    version: DRAFT_SCHEMA_VERSION,
    timestamp,
    step: snapshot.currentStepId,
    loanType: snapshot.data.loan.loanType,
    tabId,
  };
  if (draftsLocked) throw new DraftUnavailableError('Drafts are locked after submission.');
  localStorage.setItem(key, sealed); // may throw QuotaExceededError — surfaced as "Couldn't save"
  localStorage.setItem(metaKeyFor(key), JSON.stringify(meta));
  storageKeys()
    .filter((other) => isDraftKey(other) && other !== key && readMeta(other)?.tabId === tabId)
    .forEach(deleteDraft);
  return { ...meta, key };
}

/**
 * Decrypts a draft and validates it against the current schema version. Any
 * failure (tampering, corruption, old version) throws DraftUnavailableError.
 */
export async function loadDraft(key: string): Promise<ApplicationSnapshot> {
  const sealed = localStorage.getItem(key);
  const meta = readMeta(key);
  if (!sealed || !meta) throw new DraftUnavailableError('The saved application could not be found.');
  if (meta.version !== DRAFT_SCHEMA_VERSION) {
    throw new DraftUnavailableError('The saved application is from an older version of this form.');
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(await decryptString(sealed, key));
  } catch {
    throw new DraftUnavailableError('The saved application appears to be damaged or was changed outside this app.');
  }
  const parsed = draftPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new DraftUnavailableError('The saved application does not match the current form and cannot be restored.');
  }
  return { data: parsed.data.data, currentStepId: parsed.data.currentStepId as StepId };
}
