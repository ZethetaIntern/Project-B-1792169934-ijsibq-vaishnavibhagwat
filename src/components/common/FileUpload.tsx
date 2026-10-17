import {
  CircleAlert, RotateCcw, UploadCloud, X,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { describeRules, toAcceptMap, type UploadRules } from '../../constants/documents';
import { useFileUpload, type PendingUpload } from '../../hooks/useFileUpload';
import type { UploadedDocument } from '../../types/application';
import { cn } from '../../utils/cn';
import { formatBytes } from '../../utils/format';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { FilePreview } from './FilePreview';
import { Spinner } from './Spinner';

const STAGE_LABELS: Record<PendingUpload['stage'], string> = {
  checking: 'Checking file…',
  compressing: 'Compressing on your device…',
  uploading: 'Uploading',
  failed: 'Upload failed',
};

function PendingRow({ item, onRetry, onDiscard }: {
  item: PendingUpload; onRetry: () => void; onDiscard: () => void;
}) {
  const failed = item.stage === 'failed';
  return (
    <li className={cn('flex flex-col gap-2 rounded-field border p-3', failed ? 'border-danger/40 bg-danger-tint/50' : 'border-line bg-canvas')}>
      <div className="flex items-center gap-3">
        {failed
          ? <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-danger-ink" />
          : <Spinner className="size-4 shrink-0 text-cobalt" />}
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink" title={item.name}>{item.name}</p>
        <span className="shrink-0 text-xs text-slate tabular">
          {item.stage === 'uploading' ? `${item.progress}%` : formatBytes(item.size)}
        </span>
      </div>
      {failed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="flex-1 text-[13px] text-danger-ink">{item.error}</p>
          <Button variant="ghost" size="sm" onClick={onRetry} leadingIcon={<RotateCcw aria-hidden="true" className="size-4" />}>Retry</Button>
          <Button variant="ghost" size="sm" onClick={onDiscard} aria-label={`Cancel ${item.name}`}>Cancel</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div
            role="progressbar"
            aria-label={`${item.name}: ${STAGE_LABELS[item.stage]}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.stage === 'uploading' ? item.progress : undefined}
            className="h-1.5 overflow-hidden rounded-full bg-canvas-sunken"
          >
            <div
              className={cn('h-full rounded-full bg-cobalt transition-[width] duration-100 ease-linear', item.stage !== 'uploading' && 'w-1/4 animate-pulse')}
              style={item.stage === 'uploading' ? { width: `${item.progress}%` } : undefined}
            />
          </div>
          <p className="text-xs text-slate">{STAGE_LABELS[item.stage]}</p>
        </div>
      )}
    </li>
  );
}

export interface FileUploadProps {
  /** Stable identifier, used for test hooks and element ids (e.g. "bankStatements"). */
  name: string;
  label: string;
  hint?: ReactNode;
  optional?: boolean;
  rules: UploadRules;
  files: UploadedDocument[];
  onChange: (files: UploadedDocument[]) => void;
  error?: string;
  /** Status element shown beside the label, e.g. a checklist badge. */
  status?: ReactNode;
  /** Render prop for a custom preview of each uploaded file. */
  children?: (file: UploadedDocument, actions: { remove: () => void }) => ReactNode;
  className?: string;
}

/**
 * Drag-and-drop uploader (react-dropzone) with a keyboard-accessible "Choose files"
 * button. Files are validated, compressed and "uploaded" by `useFileUpload`; every
 * stage is announced through a polite live region.
 */
export function FileUpload({
  name, label, hint, optional = false, rules, files, onChange, error, status, children, className,
}: FileUploadProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const upload = useFileUpload({
    label, rules, files, onChange,
  });
  const inFlight = upload.pending.filter((item) => item.stage !== 'failed').length;
  const canAdd = files.length + inFlight < rules.maxFiles;

  const {
    getRootProps, getInputProps, isDragActive, open,
  } = useDropzone({
    accept: toAcceptMap(rules.formats),
    multiple: rules.maxFiles > 1,
    noClick: true,
    noKeyboard: true,
    disabled: !canAdd,
    // Our own validator explains *why* a file was refused, so rejected files are
    // passed through to it rather than dropped silently.
    onDrop: (accepted, rejected) => {
      upload.addFiles([...accepted, ...rejected.map(({ file }) => file)]);
    },
  });

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={[hintId, error ? errorId : ''].filter(Boolean).join(' ')}
      data-testid={`upload-${name}`}
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p id={labelId} className="text-[15px] font-semibold text-ink">
            {label}
            {optional && <span className="ml-1.5 text-[13px] font-normal text-slate">(Optional)</span>}
          </p>
          <div id={hintId} className="text-[13px] leading-5 text-slate">
            {hint && <p>{hint}</p>}
            <p className="text-muted">{describeRules(rules)}</p>
          </div>
        </div>
        {status}
      </div>

      {(files.length > 0 || upload.pending.length > 0) && (
        <ul className="flex flex-col gap-2" aria-label={`${label}: uploaded files`}>
          {files.map((file) => (
            <li key={file.id}>
              {children
                ? children(file, { remove: () => upload.remove(file.id) })
                : <FilePreview file={file} onRemove={() => upload.remove(file.id)} />}
            </li>
          ))}
          {upload.pending.map((item) => (
            <PendingRow
              key={item.key}
              item={item}
              onRetry={() => upload.retry(item.key)}
              onDiscard={() => upload.discard(item.key)}
            />
          ))}
        </ul>
      )}

      {canAdd && (
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center gap-3 rounded-field border border-dashed px-4 py-5 text-center transition-colors sm:flex-row sm:text-left',
            isDragActive ? 'border-cobalt bg-cobalt-tint' : 'border-line-strong bg-canvas/60',
            error && !isDragActive && 'border-danger-ink',
          )}
        >
          <input {...getInputProps({ 'aria-label': `Choose ${label} files` })} data-testid={`upload-input-${name}`} />
          <UploadCloud aria-hidden="true" className={cn('size-6 shrink-0', isDragActive ? 'text-cobalt' : 'text-muted')} />
          <p className="flex-1 text-sm text-slate">
            {isDragActive ? 'Drop to upload' : (
              <>
                <span className="max-sm:hidden">Drag and drop here, or choose from your device.</span>
                <span className="sm:hidden">Choose from your phone or take a photo.</span>
              </>
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={open}
            data-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
            className="max-sm:w-full"
          >
            {files.length ? 'Add another file' : `Choose ${rules.maxFiles > 1 ? 'files' : 'file'}`}
          </Button>
        </div>
      )}

      {upload.rejections.length > 0 && (
        <div className="flex items-start gap-2 rounded-field bg-danger-tint px-3 py-2.5 text-sm text-danger-ink">
          <ul className="flex flex-1 flex-col gap-1">
            {upload.rejections.map((message) => <li key={message}>{message}</li>)}
          </ul>
          <button
            type="button"
            onClick={upload.dismissRejections}
            aria-label="Dismiss upload messages"
            className="-m-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-danger/10 max-sm:-m-2.5 max-sm:size-11"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      <ErrorMessage id={errorId} message={error} />
      <p className="sr-only" aria-live="polite" aria-atomic="true">{upload.announcement}</p>
    </div>
  );
}
