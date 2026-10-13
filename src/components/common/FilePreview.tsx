import {
  BadgeCheck, FileText, ImageIcon, Trash2,
} from 'lucide-react';
import { useVaultObjectUrl } from '../../hooks/useVaultObjectUrl';
import type { UploadedDocument } from '../../types/application';
import { formatBytes } from '../../utils/format';
import { Badge } from './Badge';
import { Button } from './Button';
import { Spinner } from './Spinner';

const isImage = (file: UploadedDocument) => file.mimeType.startsWith('image/');

/** Image thumbnail decrypted from the vault, or a document icon for PDFs. */
export function FileThumbnail({ file }: { file: UploadedDocument }) {
  const url = useVaultObjectUrl(file.id, isImage(file));
  const icon = isImage(file)
    ? <ImageIcon aria-hidden="true" className="size-5 text-muted" />
    : <FileText aria-hidden="true" className="size-5 text-brand" />;
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-soft bg-canvas">
      {url
        ? <img src={url} alt="" className="size-full object-cover" data-testid="file-thumbnail" />
        : icon}
    </span>
  );
}

/** "4.5 MB → 1.2 MB, compressed" or "820 KB" */
export function describeFileSize(file: UploadedDocument): string {
  return file.compressed
    ? `${formatBytes(file.originalSize)} → ${formatBytes(file.size)}, compressed on your device`
    : formatBytes(file.size);
}

export function FileCheckBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge tone="success" icon={<BadgeCheck aria-hidden="true" className="size-3.5" />}>Verified</Badge>
  ) : (
    <Badge tone="info" icon={<Spinner className="size-3" />}>Checking…</Badge>
  );
}

interface FilePreviewProps {
  file: UploadedDocument;
  onRemove: () => void;
}

/** Default preview row for an uploaded file (FileUpload's render prop can replace it). */
export function FilePreview({ file, onRemove }: FilePreviewProps) {
  return (
    <div className="flex items-center gap-3 rounded-field border border-line bg-surface p-2.5 pr-1.5" data-testid="uploaded-file">
      <FileThumbnail file={file} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-ink" title={file.name}>{file.name}</p>
        <p className="text-xs text-slate tabular">{describeFileSize(file)}</p>
      </div>
      <span className="max-sm:hidden"><FileCheckBadge verified={file.verified} /></span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="w-11 px-0 text-slate hover:text-danger-ink sm:w-9"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
