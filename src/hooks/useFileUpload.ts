import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import type { UploadRules } from '../constants/documents';
import type { UploadedDocument } from '../types/application';
import { deleteFile, hasFile, putFile } from '../utils/documentVault';
import { checkSize, tooManyFilesMessage, validateIncomingFile } from '../utils/fileValidation';
import { formatBytes } from '../utils/format';
import { compressImage, isCompressibleImage } from '../utils/imageCompression';
import { NetworkUnavailableError, wait } from '../utils/simulate';

/** Simulated document check (format, legibility) after a file arrives. */
export const DOCUMENT_CHECK_MS = 1_500;
const PROGRESS_TICK_MS = 100;

export type UploadStage = 'checking' | 'compressing' | 'uploading' | 'failed';

/** A file that is being processed, or whose upload failed and can be retried. */
export interface PendingUpload {
  key: string;
  name: string;
  size: number;
  stage: UploadStage;
  /** 0–100 while uploading. */
  progress: number;
  error?: string;
}

interface UseFileUploadOptions {
  /** Document name used in messages, e.g. "Bank statements". */
  label: string;
  rules: UploadRules;
  files: readonly UploadedDocument[];
  onChange: (files: UploadedDocument[]) => void;
}

/** A processed file waiting to be (re)uploaded. */
interface PreparedFile {
  file: File;
  meta: Omit<UploadedDocument, 'id' | 'uploadedAt' | 'verified'>;
}

/** Simulated transfer time: quick on 4G, proportional to size. */
const uploadDuration = (bytes: number) => Math.min(600 + (bytes / (1024 * 1024)) * 300, 2_400);

/**
 * The upload pipeline behind <FileUpload>: validate → compress (images) → simulated
 * upload with progress → encrypted vault → simulated document check. Each stage is
 * reported for the UI and for screen readers (`announcement`, aria-live).
 *
 * The binary goes to the vault before the metadata reaches the form, so a crash at
 * any point leaves either nothing or a recoverable file — never dangling metadata.
 */
export function useFileUpload({
  label, rules, files, onChange,
}: UseFileUploadOptions) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [rejections, setRejections] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const filesRef = useRef(files);
  const onChangeRef = useRef(onChange);
  const retryBlobs = useRef(new Map<string, PreparedFile>());
  const mounted = useRef(true);

  useEffect(() => {
    filesRef.current = files;
    onChangeRef.current = onChange;
  }, [files, onChange]);

  useEffect(() => {
    mounted.current = true;
    const blobs = retryBlobs.current;
    return () => {
      mounted.current = false;
      blobs.clear();
    };
  }, []);

  const commit = useCallback((next: UploadedDocument[]) => {
    filesRef.current = next;
    onChangeRef.current(next);
  }, []);

  const patch = (key: string, changes: Partial<PendingUpload>) => setPending(
    (current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
  );

  /** Simulated upload of an already processed file, then hand-off to the form. */
  const transfer = useCallback(async (key: string) => {
    const prepared = retryBlobs.current.get(key);
    if (!prepared) return;
    patch(key, { stage: 'uploading', progress: 0, error: undefined });
    const id = crypto.randomUUID();
    try {
      const steps = Math.max(Math.round(uploadDuration(prepared.file.size) / PROGRESS_TICK_MS), 1);
      for (let step = 1; step <= steps; step += 1) {
        if (!navigator.onLine) throw new NetworkUnavailableError();
        // eslint-disable-next-line no-await-in-loop -- progress is deliberately sequential
        await wait(PROGRESS_TICK_MS);
        if (!mounted.current) return;
        patch(key, { progress: Math.round((step / steps) * 100) });
      }
      await putFile(id, prepared.file);
      if (!mounted.current) {
        await deleteFile(id);
        return;
      }
      const document: UploadedDocument = {
        ...prepared.meta, id, uploadedAt: new Date().toISOString(), verified: false,
      };
      retryBlobs.current.delete(key);
      setPending((current) => current.filter((item) => item.key !== key));
      commit([...filesRef.current, document]);
      const sizeNote = document.compressed
        ? ` Compressed from ${formatBytes(document.originalSize)} to ${formatBytes(document.size)}.`
        : '';
      setAnnouncement(`${document.name} uploaded.${sizeNote} Checking the document…`);
    } catch (problem) {
      if (!mounted.current) return;
      const offline = problem instanceof NetworkUnavailableError;
      const message = offline
        ? 'Upload paused — you are offline. Retry once you reconnect.'
        : 'This file could not be saved on your device. Free up browser storage and retry.';
      patch(key, { stage: 'failed', error: message });
      setAnnouncement(`${prepared.file.name}: ${message}`);
    }
  }, [commit]);

  const processFile = useCallback(async (key: string, file: File) => {
    const problem = await validateIncomingFile(file, rules);
    if (problem) throw new Error(problem);
    let output = file;
    let compressed = false;
    if (isCompressibleImage(file)) {
      patch(key, { stage: 'compressing' });
      const result = await compressImage(file);
      output = result.file;
      compressed = result.compressed;
    }
    const tooBig = checkSize(file, output.size, rules);
    if (tooBig) throw new Error(tooBig);
    retryBlobs.current.set(key, {
      file: output,
      meta: {
        name: output.name,
        mimeType: output.type,
        originalSize: file.size,
        size: output.size,
        compressed,
      },
    });
    await transfer(key);
  }, [rules, transfer]);

  const addFiles = useCallback((incoming: readonly File[]) => {
    const capacity = rules.maxFiles - filesRef.current.length
      - pending.filter((item) => item.stage !== 'failed').length;
    const accepted = incoming.slice(0, Math.max(capacity, 0));
    const messages = incoming.length > accepted.length
      ? [tooManyFilesMessage(label, rules.maxFiles)]
      : [];
    setRejections(messages);
    if (!accepted.length) {
      setAnnouncement(messages.join(' '));
      return;
    }

    const queued = accepted.map((file) => ({ key: crypto.randomUUID(), file }));
    setPending((current) => [...current, ...queued.map(({ key, file }) => ({
      key, name: file.name, size: file.size, stage: 'checking' as const, progress: 0,
    }))]);
    setAnnouncement(`Processing ${accepted.length === 1 ? accepted[0].name : `${accepted.length} files`}…`);

    queued.forEach(({ key, file }) => {
      processFile(key, file).catch((error: Error) => {
        if (!mounted.current) return;
        setPending((current) => current.filter((item) => item.key !== key));
        setRejections((current) => [...current, error.message]);
        setAnnouncement(error.message);
      });
    });
  }, [label, pending, processFile, rules.maxFiles]);

  const remove = useCallback(async (id: string) => {
    const target = filesRef.current.find((file) => file.id === id);
    commit(filesRef.current.filter((file) => file.id !== id));
    setAnnouncement(target ? `${target.name} removed.` : '');
    await deleteFile(id);
  }, [commit]);

  const discard = useCallback((key: string) => {
    retryBlobs.current.delete(key);
    setPending((current) => current.filter((item) => item.key !== key));
  }, []);

  // Crash recovery: files listed in a restored draft must still be in the vault.
  useEffect(() => {
    let cancelled = false;
    const listed = filesRef.current;
    if (!listed.length) return undefined;
    Promise.all(listed.map((file) => hasFile(file.id))).then((present) => {
      if (cancelled || present.every(Boolean)) return;
      const lost = listed.filter((_, index) => !present[index]);
      const lostIds = new Set(lost.map((file) => file.id));
      commit(filesRef.current.filter((file) => !lostIds.has(file.id)));
      setRejections(lost.map((file) => `“${file.name}” could not be recovered from your last session. Please upload it again.`));
    });
    return () => {
      cancelled = true;
    };
  }, [commit]);

  // Simulated document check: unverified files (new, or restored from a draft)
  // are marked verified after a short delay.
  const unverifiedIds = files.filter((file) => !file.verified).map((file) => file.id).join(',');
  useEffect(() => {
    if (!unverifiedIds) return undefined;
    const timer = window.setTimeout(() => {
      const ids = new Set(unverifiedIds.split(','));
      commit(filesRef.current.map(
        (file) => (ids.has(file.id) ? { ...file, verified: true } : file),
      ));
      setAnnouncement(`${label}: ${ids.size === 1 ? 'document' : 'documents'} checked.`);
    }, DOCUMENT_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [unverifiedIds, commit, label]);

  return {
    pending,
    rejections,
    announcement,
    addFiles,
    remove,
    retry: transfer,
    discard,
    dismissRejections: () => setRejections([]),
  };
}
