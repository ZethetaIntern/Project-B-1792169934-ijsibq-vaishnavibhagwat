import { PencilLine } from 'lucide-react';
import type { SignatureMethod } from '../../types/application';
import { Button } from '../common/Button';
import { InactiveShield, useWindowInactive } from '../common/SignatureCanvas';
import { useWizardNavigation } from '../wizard/WizardNavigationContext';

interface SignatureReviewProps {
  signature: string;
  method: SignatureMethod | '';
  signerName: string;
}

/** The applicant's e-signature as it will be attached; hidden while the window is inactive. */
export function SignatureReview({ signature, method, signerName }: SignatureReviewProps) {
  const { goTo } = useWizardNavigation();
  const inactive = useWindowInactive();
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-ink">Your e-signature</p>
          <p className="text-[13px] text-slate">
            {`${method === 'type' ? 'Typed' : 'Drawn'} by ${signerName || 'the applicant'}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo('documents', { fromReview: true })}
          leadingIcon={<PencilLine aria-hidden="true" className="size-4" />}
          aria-label="Change your signature"
          className="-mr-2 text-cobalt hover:text-cobalt-hover"
        >
          Change
        </Button>
      </div>
      <div className="relative overflow-hidden rounded-field border border-line-soft bg-surface">
        {signature
          ? <img src={signature} alt={`Signature of ${signerName || 'the applicant'}`} className="mx-auto h-28 w-full object-contain" data-testid="review-signature" />
          : <p className="flex h-28 items-center justify-center text-sm text-danger-ink">No signature yet — add one on the documents step.</p>}
        <InactiveShield show={inactive && Boolean(signature)} />
      </div>
    </div>
  );
}
