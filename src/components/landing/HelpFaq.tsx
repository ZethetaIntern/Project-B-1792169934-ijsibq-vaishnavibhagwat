import { ChevronDown } from 'lucide-react';
import { LOAN_PRODUCTS, MAX_PROCESSING_FEE, MIN_PROCESSING_FEE } from '../../constants/loan';
import { formatCompactINR, formatINR } from '../../utils/format';

const QUESTIONS = [
  {
    question: 'How is my EMI worked out?',
    answer: `On a reducing balance at a fixed, illustrative rate for each loan. A processing fee of 1% of the amount (between ${formatINR(MIN_PROCESSING_FEE)} and ${formatINR(MAX_PROCESSING_FEE)}) is shown separately, and the APR combines both.`,
  },
  {
    question: 'Can I stop and finish later?',
    answer: 'Yes. Your answers are saved on this device as you go. Open the application in the same browser within 72 hours and choose Resume.',
  },
  {
    question: 'What if my connection drops?',
    answer: 'Keep going — everything is saved locally. PAN and Aadhaar checks, PIN look-ups, uploads and submission pause until you are back online, and tell you so.',
  },
  {
    question: 'When do I need a co-applicant?',
    answer: `For every ${LOAN_PRODUCTS.home.label}, for a ${LOAN_PRODUCTS.personal.label} above ${formatCompactINR(LOAN_PRODUCTS.personal.coApplicantAboveAmount)} and for a ${LOAN_PRODUCTS.business.label} above ${formatCompactINR(LOAN_PRODUCTS.business.coApplicantAboveAmount)}. Their income is added to yours when we estimate affordability.`,
  },
  {
    question: 'Can I change my mind after the loan is paid out?',
    answer: 'Yes. There is a 3-day cooling-off period after disbursal: repay the principal and the proportionate APR and the loan is closed without a penalty.',
  },
  {
    question: 'Is LendSwift a real lender?',
    answer: 'No. LendSwift is a fictional lender built to demonstrate a loan application. Nothing you enter leaves your browser and no credit decision is made.',
  },
];

/** Common questions as native disclosure widgets (keyboard and screen-reader friendly). */
export function HelpFaq() {
  return (
    <section id="help" aria-labelledby="help-title" className="grid scroll-mt-28 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex max-w-md flex-col gap-3">
        <h2 id="help-title" className="text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[34px]">
          Questions people ask
        </h2>
        <p className="text-[15px] leading-6 text-slate">
          Still stuck? Write to help@lendswift.example — a placeholder address for this demo.
        </p>
      </div>
      <div className="divide-y divide-line rounded-card border border-line bg-surface">
        {QUESTIONS.map((item) => (
          <details key={item.question} className="group px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-slate transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="pb-4 text-sm leading-6 text-slate">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
