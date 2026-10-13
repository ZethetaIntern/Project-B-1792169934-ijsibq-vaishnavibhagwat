import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { useState } from 'react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { DOCUMENT_SPECS, type UploadRules } from '../constants/documents';
import type { UploadedDocument } from '../types/application';
import { hasFile, putFile, resetVaultConnection } from '../utils/documentVault';
import { useFileUpload } from './useFileUpload';

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];

function pdf(name = 'statement.pdf', size = 2048): File {
  const bytes = new Uint8Array(size);
  bytes.set(PDF_HEADER);
  return new File([bytes], name, { type: 'application/pdf' });
}

function useHarness(initial: UploadedDocument[], rules: UploadRules) {
  const [files, setFiles] = useState(initial);
  const upload = useFileUpload({
    label: 'Bank statements', rules, files, onChange: setFiles,
  });
  return { files, ...upload };
}

function render(
  initial: UploadedDocument[] = [],
  rules: UploadRules = DOCUMENT_SPECS.bankStatements,
) {
  return renderHook(() => useHarness(initial, rules));
}

const SLOW = { timeout: 4000 };

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetVaultConnection();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFileUpload', () => {
  it('uploads a valid PDF into the vault, then marks it verified', async () => {
    const { result } = render();
    act(() => result.current.addFiles([pdf()]));
    expect(result.current.pending[0]).toMatchObject({ name: 'statement.pdf', stage: 'checking' });

    await waitFor(() => expect(result.current.files).toHaveLength(1), SLOW);
    const [uploaded] = result.current.files;
    expect(uploaded).toMatchObject({
      name: 'statement.pdf', mimeType: 'application/pdf', compressed: false, verified: false,
    });
    expect(result.current.pending).toEqual([]);
    expect(result.current.announcement).toMatch(/statement.pdf uploaded/);
    expect(await hasFile(uploaded.id)).toBe(true);

    await waitFor(() => expect(result.current.files[0].verified).toBe(true), SLOW);
  });

  it('rejects a wrong file type with a specific message', async () => {
    const { result } = render();
    act(() => result.current.addFiles([new File(['hello'], 'notes.txt', { type: 'text/plain' })]));
    await waitFor(() => expect(result.current.rejections).toEqual(['“notes.txt” is not a PDF file. Choose a PDF instead.']));
    expect(result.current.files).toEqual([]);
  });

  it('enforces the per-document file limit', () => {
    const { result } = render([], { ...DOCUMENT_SPECS.bankStatements, maxFiles: 1 });
    act(() => result.current.addFiles([pdf('a.pdf'), pdf('b.pdf')]));
    expect(result.current.rejections).toEqual(['Bank statements takes one file. Remove the current file to replace it.']);
    expect(result.current.pending).toHaveLength(1);
  });

  it('pauses when offline and succeeds on retry', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = render();
    act(() => result.current.addFiles([pdf()]));
    await waitFor(() => expect(result.current.pending[0]?.stage).toBe('failed'));
    expect(result.current.pending[0].error).toMatch(/you are offline/);

    online.mockReturnValue(true);
    act(() => {
      result.current.retry(result.current.pending[0].key);
    });
    await waitFor(() => expect(result.current.files).toHaveLength(1), SLOW);
  });

  it('removes a file from the form and the vault', async () => {
    await putFile('existing', new Blob(['%PDF-'], { type: 'application/pdf' }));
    const existing: UploadedDocument = {
      id: 'existing',
      name: 'old.pdf',
      mimeType: 'application/pdf',
      originalSize: 5,
      size: 5,
      compressed: false,
      uploadedAt: new Date().toISOString(),
      verified: true,
    };
    const { result } = render([existing]);
    await act(() => result.current.remove('existing'));
    expect(result.current.files).toEqual([]);
    expect(result.current.announcement).toBe('old.pdf removed.');
    expect(await hasFile('existing')).toBe(false);
  });

  it('drops files from a restored draft that are no longer in the vault', async () => {
    const lost: UploadedDocument = {
      id: 'gone',
      name: 'lost.pdf',
      mimeType: 'application/pdf',
      originalSize: 5,
      size: 5,
      compressed: false,
      uploadedAt: new Date().toISOString(),
      verified: true,
    };
    const { result } = render([lost]);
    await waitFor(() => expect(result.current.files).toEqual([]));
    expect(result.current.rejections[0]).toMatch(/“lost.pdf” could not be recovered/);
  });
});
