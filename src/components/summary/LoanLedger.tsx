import { useId, useMemo } from 'react';
import { getLoanProduct, MAX_EMI_TO_INCOME_RATIO } from '../../constants/loan';
import { useApplicationStore } from '../../store/applicationStore';
import { getApplicationEstimate } from '../../utils/applicationMetrics';
import { cn } from '../../utils/cn';
import type { Affordability, LoanEstimate } from '../../utils/emiCalculator';
import { formatINR, formatPercent, formatTenure } from '../../utils/format';

const SEGMENTS = [
  { key: 'principal', label: 'Principal', swatch: 'bg-brand' },
  { key: 'interest', label: 'Interest', swatch: 'bg-cobalt' },
  { key: 'fee', label: 'Processing fee', swatch: 'bg-warning' },
] as const;

/** Principal / interest / fee bar with its legend — the ledger's signature element. */
export function LedgerComposition({ estimate }: { estimate: LoanEstimate }) {
  const values = {
    principal: estimate.principal,
    interest: estimate.totalInterest,
    fee: estimate.processingFee,
  };
  const total = estimate.totalPayable || 1;
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Of ${formatINR(total)} payable: principal ${formatINR(values.principal)}, interest ${formatINR(values.interest)}, processing fee ${formatINR(values.fee)}.`}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-line"
      >
        {SEGMENTS.map((segment) => (
          <span
            key={segment.key}
            className={cn('h-full rounded-full transition-[width] duration-700 ease-out', segment.swatch)}
            style={{ width: `${(values[segment.key] / total) * 100}%` }}
          />
        ))}
      </div>
      <dl className="flex flex-col gap-1.5 text-[13px]">
        {SEGMENTS.map((segment) => (
          <div key={segment.key} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-slate">
              <span aria-hidden="true" className={cn('size-2 rounded-full', segment.swatch)} />
              {segment.label}
            </dt>
            <dd className="font-medium text-ink tabular">{formatINR(values[segment.key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AffordabilityMeter({ affordability }: { affordability: Affordability }) {
  const ratio = affordability.emiToIncomeRatio;
  let tone = 'bg-success';
  if (ratio > MAX_EMI_TO_INCOME_RATIO) tone = 'bg-danger';
  else if (ratio > 0.4) tone = 'bg-warning';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-slate">EMI to monthly income</span>
        <span className={cn('font-semibold tabular', affordability.exceedsLimit ? 'text-danger-ink' : 'text-ink')}>
          {formatPercent(ratio)}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-line">
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out', tone)}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
        <span aria-hidden="true" className="absolute -top-1 -bottom-1 left-1/2 w-px bg-ink/40" />
      </div>
      <p className="text-xs text-slate">
        {affordability.exceedsLimit
          ? 'Above the 50% guideline — you will be asked to acknowledge this before submitting.'
          : `Within the 50% guideline. About ${formatINR(affordability.disposableIncome)} a month remains after EMI${affordability.obligationRatio > ratio ? ' and rent' : ''}.`}
      </p>
    </div>
  );
}

/**
 * The workspace's signature element: a ledger-style breakdown of the loan that
 * updates as the applicant types. Every figure is labelled as illustrative.
 */
export function LoanLedger({ className }: { className?: string }) {
  const application = useApplicationStore((state) => state.data);
  const { loanType, loanAmount, tenureMonths } = application.loan;
  const product = getLoanProduct(loanType);
  const { estimate, affordability } = useMemo(
    () => getApplicationEstimate(application),
    [application],
  );
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('overflow-hidden rounded-panel border border-line bg-surface shadow-card', className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 id={headingId} className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
          Your loan
        </h2>
        {product && (
          <span className="rounded-full bg-canvas-sunken px-2.5 py-0.5 text-xs font-medium text-ink-soft">
            {product.label}
          </span>
        )}
      </div>

      {!estimate ? (
        <div className="px-5 pt-3 pb-5">
          <p className="text-[15px] font-medium text-ink">Your estimate appears here</p>
          <p className="mt-1 text-[13px] leading-5 text-slate">
            Choose a loan type, amount and tenure to see your monthly instalment and total cost.
          </p>
          <div aria-hidden="true" className="mt-4 flex flex-col gap-2.5">
            {[72, 56, 64].map((width) => (
              <div key={width} className="flex justify-between gap-6">
                <span className="h-2.5 rounded bg-canvas-sunken" style={{ width: `${width - 30}%` }} />
                <span className="h-2.5 w-16 rounded bg-canvas-sunken" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="px-5 pt-2">
            <p className="text-[32px] leading-tight font-semibold tracking-[-0.03em] text-ink tabular">
              {formatINR(loanAmount ?? 0)}
            </p>
            <p className="mt-0.5 text-[13px] text-slate tabular">
              {`${formatTenure(tenureMonths ?? 0)} · ${estimate.annualRate}% p.a.*`}
            </p>
          </div>

          <div className="mx-5 my-4 flex flex-col gap-4 rounded-card bg-canvas p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-ink-soft">Estimated EMI</span>
              <span className="text-xl font-semibold tracking-tight text-brand tabular">
                {formatINR(estimate.emi)}
                <span className="text-xs font-medium text-slate"> /mo</span>
              </span>
            </div>
            <LedgerComposition estimate={estimate} />
          </div>

          <dl className="mx-5 flex flex-col gap-1.5 border-t border-dashed border-line-strong/50 pt-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Total cost of borrowing</dt>
              <dd className="font-medium text-ink tabular">{formatINR(estimate.totalInterest)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-[15px]">
              <dt className="font-medium text-ink">Total payable</dt>
              <dd className="font-semibold text-ink tabular">{formatINR(estimate.totalPayable)}</dd>
            </div>
          </dl>

          {affordability && (
            <div className="mx-5 mt-4 border-t border-dashed border-line-strong/50 pt-4">
              <AffordabilityMeter affordability={affordability} />
            </div>
          )}

          <p className="mt-4 border-t border-line bg-canvas/60 px-5 py-3 text-xs leading-5 text-slate">
            *Illustrative rate and figures for estimation only. Not a loan offer or credit decision.
          </p>
        </>
      )}
    </section>
  );
}
