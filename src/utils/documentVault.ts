import { DRAFT_TTL_MS, FILE_KEY_PREFIX, LOCAL_FILE_BUDGET_CHARS } from '../constants/persistence';
import {
  base64ToBytes, bytesToBase64, decryptBytes, encryptBytes,
} from './encryption';

/**
 * Encrypted file vault (crash recovery for uploads, A1.6 f).
 *
 * Drafts in LocalStorage only carry file *metadata*; the binaries live here, in
 * IndexedDB, each encrypted with AES-256-GCM (same key and caveats as drafts — see
 * encryption.ts) and bound to its id so records cannot be swapped. Base64 files in
 * LocalStorage would hit its ~5 MB quota after one or two scans.
 *
 * When IndexedDB is unavailable (some private-browsing modes and locked-down
 * browsers) each file is saved instead as encrypted base64 in LocalStorage, beside
 * the auto-saved draft, within LOCAL_FILE_BUDGET_CHARS. Files that do not fit are
 * kept in memory for this session only: uploading still works, but those files
 * must be re-uploaded after a reload (the uploader says so).
 */

const DB_NAME = 'lendswift_vault';
const DB_VERSION = 1;
const STORE = 'files';

interface VaultRecord {
  id: string;
  mimeType: string;
  savedAt: number;
  payload: Uint8Array<ArrayBuffer>;
}

interface LocalRecord {
  mimeType: string;
  savedAt: number;
  /** AES-GCM ciphertext (IV first), base64-encoded. */
  payload: string;
}

const memoryFallback = new Map<string, Blob>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

const contextFor = (id: string) => `vault:${id}`;

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openVault(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        // Another tab deleting or upgrading the vault must not be blocked by this one.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

// --- LocalStorage fallback (base64) -------------------------------------------

const localKey = (id: string) => `${FILE_KEY_PREFIX}${id}`;

function localIds(): string[] {
  try {
    return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? '')
      .filter((key) => key.startsWith(FILE_KEY_PREFIX))
      .map((key) => key.slice(FILE_KEY_PREFIX.length));
  } catch {
    return [];
  }
}

function readLocal(id: string): LocalRecord | null {
  try {
    const record = JSON.parse(localStorage.getItem(localKey(id)) ?? 'null') as LocalRecord | null;
    return record && typeof record.payload === 'string' ? record : null;
  } catch {
    return null;
  }
}

function removeLocal(id: string): void {
  try {
    localStorage.removeItem(localKey(id));
  } catch {
    // Storage is unavailable: there is nothing to remove.
  }
}

/** Saves an encrypted base64 copy if it fits the budget; returns whether it did. */
async function saveLocal(id: string, file: Blob): Promise<boolean> {
  const sealed = await encryptBytes(new Uint8Array(await file.arrayBuffer()), contextFor(id));
  const serialised = JSON.stringify({
    mimeType: file.type, savedAt: Date.now(), payload: bytesToBase64(sealed),
  } satisfies LocalRecord);
  const used = localIds()
    .filter((other) => other !== id)
    .reduce((total, other) => total + (localStorage.getItem(localKey(other))?.length ?? 0), 0);
  if (used + serialised.length > LOCAL_FILE_BUDGET_CHARS) return false;
  try {
    localStorage.setItem(localKey(id), serialised);
    return true;
  } catch {
    return false; // QuotaExceededError, or storage disabled
  }
}

async function loadLocal(id: string): Promise<Blob | null> {
  const record = readLocal(id);
  if (!record) return null;
  try {
    const plain = await decryptBytes(base64ToBytes(record.payload), contextFor(id));
    return new Blob([plain], { type: record.mimeType });
  } catch {
    removeLocal(id);
    return null;
  }
}

// --- IndexedDB ------------------------------------------------------------------

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  const db = await openVault();
  if (!db) return undefined;
  return promisify(run(db.transaction(STORE, mode).objectStore(STORE)));
}

export async function deleteFile(id: string): Promise<void> {
  memoryFallback.delete(id);
  removeLocal(id);
  await withStore('readwrite', (store) => store.delete(id));
}

/** Encrypts and stores a file. Throws (e.g. QuotaExceededError) if it cannot be kept. */
export async function putFile(id: string, file: Blob): Promise<void> {
  const db = await openVault();
  if (!db) {
    // Usable at once from memory; persisted for crash recovery when it fits.
    memoryFallback.set(id, file);
    await saveLocal(id, file);
    return;
  }
  const plain = new Uint8Array(await file.arrayBuffer());
  const record: VaultRecord = {
    id,
    mimeType: file.type,
    savedAt: Date.now(),
    payload: await encryptBytes(plain, contextFor(id)),
  };
  await withStore('readwrite', (store) => store.put(record));
}

/** Decrypts a stored file, or `null` if it is missing, expired or was tampered with. */
export async function getFile(id: string): Promise<Blob | null> {
  if (memoryFallback.has(id)) return memoryFallback.get(id) ?? null;
  const record = await withStore<VaultRecord | undefined>('readonly', (store) => store.get(id));
  if (!record) return loadLocal(id);
  try {
    const plain = await decryptBytes(record.payload, contextFor(id));
    return new Blob([plain], { type: record.mimeType });
  } catch {
    await deleteFile(id);
    return null;
  }
}

export async function hasFile(id: string): Promise<boolean> {
  if (memoryFallback.has(id) || readLocal(id)) return true;
  return (await withStore('readonly', (store) => store.count(id)) ?? 0) > 0;
}

/** Removes every stored file (Start fresh, successful submission). */
export async function clearVault(): Promise<void> {
  memoryFallback.clear();
  localIds().forEach(removeLocal);
  await withStore('readwrite', (store) => store.clear());
}

async function allRecords(): Promise<VaultRecord[]> {
  return (await withStore<VaultRecord[]>('readonly', (store) => store.getAll())) ?? [];
}

/**
 * Deletes files older than the draft TTL (72 h) and, when `keepIds` is given, any
 * file no longer referenced by the application. Returns how many were removed.
 */
export async function pruneVault(
  { keepIds, now = Date.now() }: { keepIds?: ReadonlySet<string>; now?: number } = {},
): Promise<number> {
  const isStale = (id: string, savedAt: number) => (
    now - savedAt > DRAFT_TTL_MS || (keepIds !== undefined && !keepIds.has(id))
  );
  const stale = [
    ...(await allRecords()).map(({ id, savedAt }) => ({ id, savedAt })),
    ...localIds().map((id) => ({ id, savedAt: readLocal(id)?.savedAt ?? 0 })),
  ].filter(({ id, savedAt }) => isStale(id, savedAt));
  await Promise.all(stale.map(({ id }) => deleteFile(id)));
  if (keepIds) {
    [...memoryFallback.keys()]
      .filter((id) => !keepIds.has(id))
      .forEach((id) => memoryFallback.delete(id));
  }
  return stale.length;
}

/** Test helper: close and forget the connection so a fresh IndexedDB can be used. */
export function resetVaultConnection(): void {
  dbPromise?.then((db) => db?.close()).catch(() => undefined);
  dbPromise = null;
  memoryFallback.clear();
}
