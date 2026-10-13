import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { DRAFT_TTL_MS } from '../constants/persistence';
import {
  clearVault, deleteFile, getFile, hasFile, pruneVault, putFile, resetVaultConnection,
} from './documentVault';

const text = (blob: Blob | null) => blob?.text();

function rawRecord(id: string): Promise<{ payload: Uint8Array; savedAt: number }> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('lendswift_vault');
    open.onsuccess = () => {
      const request = open.result.transaction('files').objectStore('files').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    };
  });
}

function writeRaw(record: object): Promise<void> {
  return new Promise((resolve) => {
    const open = indexedDB.open('lendswift_vault');
    open.onsuccess = () => {
      const tx = open.result.transaction('files', 'readwrite');
      tx.objectStore('files').put(record);
      tx.oncomplete = () => resolve();
    };
  });
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetVaultConnection();
});

describe('document vault', () => {
  it('stores files encrypted and returns the original bytes and type', async () => {
    await putFile('doc-1', new Blob(['%PDF-1.7 salary slip'], { type: 'application/pdf' }));

    const stored = await rawRecord('doc-1');
    expect(new TextDecoder().decode(stored.payload)).not.toContain('salary slip');

    const restored = await getFile('doc-1');
    expect(restored?.type).toBe('application/pdf');
    expect(await text(restored)).toBe('%PDF-1.7 salary slip');
    expect(await hasFile('doc-1')).toBe(true);
  });

  it('returns null for missing files and deletes on request', async () => {
    expect(await getFile('nope')).toBeNull();
    await putFile('doc-2', new Blob(['x']));
    await deleteFile('doc-2');
    expect(await hasFile('doc-2')).toBe(false);
  });

  it('discards a record whose ciphertext was tampered with or swapped', async () => {
    await putFile('a', new Blob(['first']));
    await putFile('b', new Blob(['second']));
    const recordB = await rawRecord('b');
    await writeRaw({ ...recordB, id: 'a' });

    expect(await getFile('a')).toBeNull();
    expect(await hasFile('a')).toBe(false);
    expect(await text(await getFile('b'))).toBe('second');
  });

  it('prunes expired and unreferenced files', async () => {
    await putFile('keep', new Blob(['1']));
    await putFile('orphan', new Blob(['2']));
    await putFile('old', new Blob(['3']));
    const old = await rawRecord('old');
    await writeRaw({ ...old, savedAt: Date.now() - DRAFT_TTL_MS - 1 });

    expect(await pruneVault()).toBe(1);
    expect(await hasFile('old')).toBe(false);

    expect(await pruneVault({ keepIds: new Set(['keep']) })).toBe(1);
    expect(await hasFile('keep')).toBe(true);
    expect(await hasFile('orphan')).toBe(false);
  });

  it('clears everything', async () => {
    await putFile('x', new Blob(['1']));
    await clearVault();
    expect(await hasFile('x')).toBe(false);
  });

  it('falls back to memory when IndexedDB is unavailable', async () => {
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB;
    resetVaultConnection();
    await putFile('mem', new Blob(['in memory']));
    expect(await text(await getFile('mem'))).toBe('in memory');
    await pruneVault({ keepIds: new Set() });
    expect(await hasFile('mem')).toBe(false);
  });
});
