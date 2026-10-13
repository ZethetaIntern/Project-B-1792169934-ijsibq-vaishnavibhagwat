import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { useApplicationStore } from '../store/applicationStore';
import { createEmptyApplication } from '../store/initialApplication';
import type { UploadedDocument } from '../types/application';
import { hasFile, putFile, resetVaultConnection } from '../utils/documentVault';
import { useVaultJanitor } from './useVaultJanitor';

const doc = (id: string): UploadedDocument => ({
  id,
  name: `${id}.pdf`,
  mimeType: 'application/pdf',
  originalSize: 1,
  size: 1,
  compressed: false,
  uploadedAt: '2026-10-13T10:00:00.000Z',
  verified: true,
});

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  resetVaultConnection();
  useApplicationStore.getState().reset();
  await putFile('slip', new Blob(['%PDF-']));
  await putFile('statement', new Blob(['%PDF-']));
  useApplicationStore.getState().updateSection('documents', {
    files: { salarySlips: [doc('slip')], bankStatements: [doc('statement')] },
  });
});

describe('useVaultJanitor', () => {
  it('deletes a file once a committed change drops it', async () => {
    renderHook(() => useVaultJanitor());
    useApplicationStore.getState().updateSection('documents', {
      files: { bankStatements: [doc('statement')] },
    });
    await waitFor(async () => expect(await hasFile('slip')).toBe(false));
    expect(await hasFile('statement')).toBe(true);
  });

  it('keeps files when the store is reset or hydrated', async () => {
    renderHook(() => useVaultJanitor());
    useApplicationStore.getState().reset();
    useApplicationStore.getState().hydrate({ data: createEmptyApplication(), currentStepId: 'loan' });
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(await hasFile('slip')).toBe(true);
    expect(await hasFile('statement')).toBe(true);
  });
});
