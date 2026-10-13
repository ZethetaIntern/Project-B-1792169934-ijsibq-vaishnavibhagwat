import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { getLoanProduct } from '../../constants/loan';
import { useApplicationStore } from '../../store/applicationStore';
import { cn } from '../../utils/cn';
import { estimateForLoan } from '../../utils/emiCalculator';
import { formatCompactINR, formatINR } from '../../utils/format';
import { Collapse } from '../common/Collapse';
import { LoanLedger } from './LoanLedger';

/** Small-screen version of the side panel: a one-line summary that expands to the ledger. */
export function MobileLoanSummary() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const loan = useApplicationStore((state) => state.data.loan);
  const product = getLoanProduct(loan.loanType);
  const estimate = estimateForLoan(loan.loanType, loan.loanAmount, loan.tenureMonths);

  if (!product || !estimate) return null;

  return (
    <div className="mb-5 lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-2.5 text-left shadow-card"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-slate">
            {`${product.shortLabel} · ${formatCompactINR(estimate.principal)} · ${estimate.tenureMonths} mo`}
          </span>
          <span className="block text-[15px] font-semibold text-ink tabular">
            {`EMI ${formatINR(estimate.emi)}/mo`}
            <span className="text-xs font-normal text-muted"> estimate</span>
          </span>
        </span>
        <span className="text-xs font-medium text-cobalt">{open ? 'Hide' : 'Details'}</span>
        <ChevronDown aria-hidden="true" className={cn('size-4 text-cobalt transition-transform', open && 'rotate-180')} />
      </button>
      <Collapse open={open} id={panelId}>
        <LoanLedger className="mt-3" />
      </Collapse>
    </div>
  );
}
