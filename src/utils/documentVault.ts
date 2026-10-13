import { DRAFT_TTL_MS } from '../constants/persistence';
import { decryptBytes, encryptBytes } from './encryption';

/**
 * Encrypted file vault (crash recovery for uploads, A1.6 f).
 *
 * Drafts in LocalStorage only carry file *metadata*; the binaries live here, in
 * IndexedDB, each encrypted with AES-256-GCM (same key and caveats as drafts — see
 * encryption.ts) and bound to its id so records cannot be swapped. Base64 files in
 * LocalStorage would hit its ~5 MB quota after one or two scans.
 *
 * When IndexedDB is unavailable (some private-browsing modes) files are kept in
 * memory for this session only, so uploading still works; they are simply not
 * recoverable after a reload.
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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

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
  await withStore('readwrite', (store) => store.delete(id));
}

/** Encrypts and stores a file. Throws (e.g. QuotaExceededError) if it cannot be kept. */
export async function putFile(id: string, file: Blob): Promise<void> {
  const db = await openVault();
  if (!db) {
    memoryFallback.set(id, file);
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
  if (!record) return null;
  try {
    const plain = await decryptBytes(record.payload, contextFor(id));
    return new Blob([plain], { type: record.mimeType });
  } catch {
    await deleteFile(id);
    return null;
  }
}

export async function hasFile(id: string): Promise<boolean> {
  if (memoryFallback.has(id)) return true;
  return (await withStore('readonly', (store) => store.count(id)) ?? 0) > 0;
}

/** Removes every stored file (Start fresh, successful submission). */
export async function clearVault(): Promise<void> {
  memoryFallback.clear();
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
  const stale = (await allRecords()).filter(
    (record) => now - record.savedAt > DRAFT_TTL_MS || (keepIds && !keepIds.has(record.id)),
  );
  await Promise.all(stale.map((record) => deleteFile(record.id)));
  if (keepIds) {
    [...memoryFallback.keys()]
      .filter((id) => !keepIds.has(id))
      .forEach((id) => memoryFallback.delete(id));
  }
  return stale.length;
}

/** Test helper: forget the open connection so a fresh IndexedDB can be used. */
export function resetVaultConnection(): void {
  dbPromise = null;
  memoryFallback.clear();
}
