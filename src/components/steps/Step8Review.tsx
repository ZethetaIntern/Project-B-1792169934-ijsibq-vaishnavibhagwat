import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { getLoanProduct } from '../../constants/loan';
import { isStepActive } from '../../constants/steps';
import { useApplicationSubmit } from '../../hooks/useApplicationSubmit';
import { navigateTo } from '../../hooks/useRoute';
import { useOnlineStatus } from '../../hooks/useSessionSignals';
import { useApplicationStore } from '../../store/applicationStore';
import type { ReviewConsents } from '../../types/application';
import { getApplicationEstimate } from '../../utils/applicationMetrics';
import { formatPercent } from '../../utils/format';
import { buildReviewSections } from '../../utils/reviewSummary';
import { getSubmissionBlockers } from '../../utils/submissionReadiness';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { Checkbox } from '../common/Checkbox';
import { FormSection } from '../common/FormSection';
import { KeyFactStatement } from '../review/KeyFactStatement';
import { RegulatoryDisclosures } from '../review/RegulatoryDisclosures';
import { ReviewSection } from '../review/ReviewSection';
import { SignatureReview } from '../review/SignatureReview';
import { SubmissionSuccess } from '../review/SubmissionSuccess';
import { SubmitPanel } from '../review/SubmitPanel';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';

/** Sample terms, served from `public/`. */
const TERMS_PDF_PATH = '/lendswift-terms-and-conditions.pdf';

function focusFirstInvalid() {
  window.setTimeout(() => {
    document.querySelector<HTMLElement>('#wizard-step-form [aria-invalid="true"]')?.focus();
  }, 0);
}

export default function Step8Review() {
  const form = useStepForm('review');
  const { control, register, handleSubmit } = form;
  const status = useFieldStatus(form);
  const application = useApplicationStore((state) => state.data);
  const receipt = useApplicationStore((state) => state.submission);
  const online = useOnlineStatus();
  const [revealed, setRevealed] = useState(false);
  const { submit, status: submitStatus, error } = useApplicationSubmit();

  const consents = useWatch({ control }) as ReviewConsents;
  const sections = useMemo(() => buildReviewSections(application), [application]);
  const { estimate, affordability } = useMemo(
    () => getApplicationEstimate(application),
    [application],
  );
  const product = getLoanProduct(application.loan.loanType);
  const blockers = getSubmissionBlockers(application, consents, online);
  const hasCoApplicant = isStepActive('coApplicant', application);

  const onSubmit = handleSubmit(async (values) => {
    if (getSubmissionBlockers(application, values, navigator.onLine).length) return;
    await submit({ ...application, review: values });
  }, focusFirstInvalid);

  const downloadSummary = async () => {
    if (!receipt) return;
    const { downloadApplicationSummary } = await import('../../utils/applicationPdf');
    await downloadApplicationSummary(application, receipt);
  };

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-10">
        {estimate && product && (
          <KeyFactStatement
            productLabel={product.label}
            estimate={estimate}
            affordability={affordability}
            hasCoApplicant={hasCoApplicant}
          />
        )}

        {affordability?.exceedsLimit && (
          <Callout tone="warning" title={`Your EMI is ${formatPercent(affordability.emiToIncomeRatio)} of your monthly income`}>
            <p className="mb-3">
              Lenders usually keep EMIs under 50% of income. You can still apply, but repayments
              may be hard to manage. A smaller amount or a longer tenure lowers the EMI.
            </p>
            <Checkbox
              {...register('highEmiAcknowledged')}
              variant="card"
              label="I understand this EMI is more than half of my monthly income and I still want to apply."
              error={status('highEmiAcknowledged').error}
            />
          </Callout>
        )}

        <FormSection title="Your answers" description="Check each section. Edit takes you back, and Continue brings you straight here again.">
          <div className="-mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={revealed}
              onClick={() => setRevealed((value) => !value)}
              leadingIcon={revealed ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
            >
              {revealed ? 'Hide sensitive details' : 'Show sensitive details'}
            </Button>
          </div>
          {sections.map((section) => (
            <ReviewSection key={section.stepId} section={section} revealed={revealed} />
          ))}
          <SignatureReview
            signature={application.documents.signature}
            method={application.documents.signatureMethod}
            signerName={application.personal.fullName}
          />
        </FormSection>

        <RegulatoryDisclosures />

        <FormSection title="Your consent" description="Each consent is separate and none is ticked for you.">
          <Checkbox
            {...register('accuracy')}
            variant="card"
            label="The information I have given is true, complete and accurate."
            description="I will tell LendSwift if any of it changes before the loan is disbursed."
            error={status('accuracy').error}
          />
          <Checkbox
            {...register('creditCheck')}
            variant="card"
            label="I authorise LendSwift to get my credit report from credit bureaus such as CIBIL and Equifax."
            description="Used only to assess this application. It may show as an enquiry on your credit report."
            error={status('creditCheck').error}
          />
          <Checkbox
            {...register('terms')}
            variant="card"
            label={(
              <>
                {'I have read and agree to the '}
                <a href={TERMS_PDF_PATH} target="_blank" rel="noopener noreferrer" className="relative z-20 font-medium text-cobalt underline underline-offset-4">
                  Terms and Conditions (PDF)
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                {' and the key facts above.'}
              </>
            )}
            error={status('terms').error}
          />
          <Checkbox
            {...register('communication')}
            variant="card"
            label="I agree to receive updates about this application by SMS, email and phone."
            description="Only about this application. You can opt out of marketing at any time."
            error={status('communication').error}
          />
        </FormSection>

        <SubmitPanel
          blockers={blockers}
          submitting={submitStatus === 'submitting'}
          error={error}
          onSubmit={onSubmit}
        />
      </div>

      <SubmissionSuccess
        receipt={receipt}
        applicantName={application.personal.fullName}
        productLabel={product?.label ?? 'loan'}
        onDownloadSummary={downloadSummary}
        onDone={() => navigateTo('landing')}
      />
    </FormProvider>
  );
}
