import {
  CircleCheck, Copy, FileDown,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { SubmissionReceipt } from '../../store/applicationStore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface SubmissionSuccessProps {
  receipt: SubmissionReceipt | null;
  applicantName: string;
  productLabel: string;
  onDownloadSummary: () => Promise<void>;
  onDone: () => void;
}

const NEXT_STEPS = [
  'We check your documents and the details you gave.',
  'With your consent, we run a credit bureau check and assess affordability.',
  'If approved, you get a formal Key Fact Statement and loan agreement to e-sign. The cooling-off period starts when the money is disbursed.',
];

/** Confirmation with the client-side reference, next steps and a PDF summary. */
export function SubmissionSuccess({
  receipt, applicantName, productLabel, onDownloadSummary, onDone,
}: SubmissionSuccessProps) {
  const { toast } = useToast();
  const doneRef = useRef<HTMLButtonElement>(null);
  const [downloading, setDownloading] = useState(false);
  const firstName = applicantName.split(' ')[0] || 'there';
  const submittedAt = receipt
    ? new Date(receipt.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  const copyReference = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.reference);
      toast({ id: 'reference-copied', tone: 'success', title: 'Reference copied' });
    } catch {
      toast({
        id: 'reference-copied', tone: 'danger', title: "Couldn't copy", description: 'Select the reference and copy it manually.',
      });
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await onDownloadSummary();
    } catch {
      toast({
        id: 'summary-pdf', tone: 'danger', title: "Couldn't create the PDF", description: 'Please try again.',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={Boolean(receipt)}
      onClose={onDone}
      dismissible={false}
      size="lg"
      initialFocusRef={doneRef}
      icon={<CircleCheck aria-hidden="true" className="size-7 text-success-ink" />}
      title="Application submitted"
      description={`Thank you, ${firstName}. We have received your ${productLabel} application.`}
      footer={(
        <>
          <Button
            variant="secondary"
            onClick={download}
            loading={downloading}
            loadingText="Preparing PDF…"
            leadingIcon={<FileDown aria-hidden="true" className="size-4" />}
          >
            Download summary
          </Button>
          <Button ref={doneRef} onClick={onDone}>Done</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-5" data-testid="submission-success">
        <div className="flex flex-col gap-1.5 rounded-card border border-line bg-canvas p-4">
          <p className="text-xs font-medium tracking-wide text-slate uppercase">Application reference</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <code className="font-mono text-[15px] font-semibold break-all text-ink" data-testid="submission-reference">
              {receipt?.reference}
            </code>
            <Button variant="ghost" size="sm" onClick={copyReference} leadingIcon={<Copy aria-hidden="true" className="size-4" />}>
              Copy
            </Button>
          </div>
          <p className="text-xs text-slate">{`Submitted ${submittedAt}. Quote this reference if you contact us.`}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">What happens next</p>
          <ol className="flex flex-col gap-2.5">
            {NEXT_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-[13px] leading-5 text-ink-soft">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="rounded-field bg-warning-tint px-3 py-2 text-xs leading-5 text-warning-ink">
          This is a demo. Nothing was sent to a lender, the reference was generated in your
          browser, and no credit decision will be made. Your saved draft and files have been
          deleted from this device.
        </p>
      </div>
    </Modal>
  );
}
