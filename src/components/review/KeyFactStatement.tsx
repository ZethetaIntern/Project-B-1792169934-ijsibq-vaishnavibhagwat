import { useId } from 'react';
import {
  MAX_PROCESSING_FEE, MIN_PROCESSING_FEE, PROCESSING_FEE_RATE,
} from '../../constants/loan';
import { cn } from '../../utils/cn';
import type { Affordability, LoanEstimate } from '../../utils/emiCalculator';
import { formatINR, formatPercent, formatTenure } from '../../utils/format';
import { Badge } from '../common/Badge';

interface KeyFactStatementProps {
  productLabel: string;
  estimate: LoanEstimate;
  affordability: Affordability | null;
  hasCoApplicant: boolean;
}

interface Row {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
}

/**
 * Pre-approval card in the shape of an RBI Key Fact Statement: every figure the
 * borrower pays, including the APR, before they consent. Clearly marked as an
 * illustrative estimate — this project makes no credit decision.
 */
export function KeyFactStatement({
  productLabel, estimate, affordability, hasCoApplicant,
}: KeyFactStatementProps) {
  const headingId = useId();
  const rows: Row[] = [
    { label: 'Loan amount', value: formatINR(estimate.principal) },
    { label: 'Tenure', value: `${formatTenure(estimate.tenureMonths)} · ${estimate.tenureMonths} monthly instalments` },
    { label: 'Interest rate', value: `${estimate.annualRate}% p.a., fixed`, note: 'Illustrative rate for this product' },
    { label: 'Annual percentage rate (APR)', value: `${estimate.apr.toFixed(2)}%`, note: 'Interest plus the processing fee, as a yearly rate' },
    {
      label: 'Processing fee',
      value: formatINR(estimate.processingFee),
      note: `${PROCESSING_FEE_RATE * 100}% of the amount, between ${formatINR(MIN_PROCESSING_FEE)} and ${formatINR(MAX_PROCESSING_FEE)}`,
    },
    { label: 'Amount you receive', value: formatINR(estimate.principal - estimate.processingFee), note: 'Loan amount minus the processing fee' },
    { label: 'Total interest (cost of borrowing)', value: formatINR(estimate.totalInterest) },
    { label: 'Total amount payable', value: formatINR(estimate.totalPayable), strong: true },
  ];

  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-panel border border-line bg-surface shadow-card" data-testid="key-fact-statement">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-brand px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="text-[11px] font-semibold tracking-[0.12em] text-white/75 uppercase">
            Key fact statement · indicative
          </h2>
          <p className="text-[13px] text-white/80">{`${productLabel} · estimated monthly instalment`}</p>
          <p className="text-[34px] leading-tight font-semibold tracking-[-0.03em] tabular">
            {formatINR(estimate.emi)}
            <span className="text-base font-medium text-white/75"> /month</span>
          </p>
        </div>
        <Badge tone="neutral" className="bg-white/15 text-white">Illustrative</Badge>
      </div>

      <dl className="divide-y divide-line-soft px-5 sm:px-6">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-3">
            <dt className="flex flex-col">
              <span className={cn('text-sm', row.strong ? 'font-semibold text-ink' : 'text-ink-soft')}>{row.label}</span>
              {row.note && <span className="text-xs text-slate">{row.note}</span>}
            </dt>
            <dd className={cn('tabular', row.strong ? 'text-base font-semibold text-ink' : 'text-sm font-medium text-ink')}>
              {row.value}
            </dd>
          </div>
        ))}
        {affordability && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-3">
            <dt className="flex flex-col">
              <span className="text-sm text-ink-soft">EMI as a share of income</span>
              <span className="text-xs text-slate">
                {`Of ${formatINR(affordability.monthlyIncome)} monthly income${hasCoApplicant ? ', including your co-applicant' : ''}`}
              </span>
            </dt>
            <dd className={cn('text-sm font-medium tabular', affordability.exceedsLimit ? 'text-danger-ink' : 'text-ink')}>
              {formatPercent(affordability.emiToIncomeRatio)}
            </dd>
          </div>
        )}
      </dl>

      <p className="border-t border-line bg-canvas/60 px-5 py-3 text-xs leading-5 text-slate sm:px-6">
        An estimate from the details you entered, not a sanction or credit decision. If your
        application is approved you will receive a formal Key Fact Statement to accept before
        signing the loan agreement.
      </p>
    </section>
  );
}
