import {
  useDeferredValue, useId, useMemo, useState,
} from 'react';
import {
  getLoanProduct, LOAN_PRODUCTS, LOAN_TYPES, MIN_LOAN_AMOUNT,
} from '../../constants/loan';
import type { LoanType } from '../../types/application';
import { estimateLoan } from '../../utils/emiCalculator';
import {
  formatCompactINR, formatINR, formatTenure,
} from '../../utils/format';
import { Button } from '../common/Button';
import { LedgerComposition } from '../summary/LoanLedger';

export interface LoanPreset {
  loanType: LoanType;
  loanAmount: number;
  tenureMonths: number;
}

const START: Record<LoanType, { amount: number; tenure: number; step: number }> = {
  personal: { amount: 3_00_000, tenure: 36, step: 10_000 },
  home: { amount: 40_00_000, tenure: 240, step: 1_00_000 },
  business: { amount: 15_00_000, tenure: 60, step: 50_000 },
};

const SLIDER_CLASS = 'h-11 w-full cursor-pointer accent-[var(--color-cobalt)]';

/**
 * Landing-page calculator, set as the same ledger the application uses: pick a
 * product, drag amount and tenure, and see the EMI and every rupee of cost. The
 * figures carry straight into Step 1.
 */
export function EmiCalculator({ onApply }: { onApply: (preset: LoanPreset) => void }) {
  const baseId = useId();
  const [loanType, setLoanType] = useState<LoanType>('personal');
  const [amount, setAmount] = useState(START.personal.amount);
  const [tenure, setTenure] = useState(START.personal.tenure);
  const product = getLoanProduct(loanType) ?? LOAN_PRODUCTS.personal;
  // Dragging a slider fires many updates; the ledger follows at lower priority.
  const deferredAmount = useDeferredValue(amount);
  const deferredTenure = useDeferredValue(tenure);
  const estimate = useMemo(
    () => estimateLoan(deferredAmount, product.annualInterestRate, deferredTenure),
    [deferredAmount, deferredTenure, product.annualInterestRate],
  );

  const choose = (next: LoanType) => {
    setLoanType(next);
    setAmount(START[next].amount);
    setTenure(START[next].tenure);
  };

  return (
    <section aria-labelledby={`${baseId}-title`} className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised" data-testid="emi-calculator">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 id={`${baseId}-title`} className="text-base font-semibold tracking-tight text-ink">Work out your EMI</h2>

        <fieldset>
          <legend className="sr-only">Loan type</legend>
          <div className="relative grid grid-cols-3 gap-1 rounded-field bg-canvas-sunken p-1">
            {/* One pill slides to the chosen type, so the eye follows the change. */}
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc((100%-1rem)/3)] rounded-lg bg-surface shadow-card transition-transform duration-250 ease-in-out-quart"
              style={{ transform: `translateX(calc(${LOAN_TYPES.indexOf(loanType)} * (100% + 0.25rem)))` }}
            />
            {LOAN_TYPES.map((id) => (
              <label key={id} className="relative">
                <input
                  type="radio"
                  name={`${baseId}-type`}
                  value={id}
                  checked={loanType === id}
                  onChange={() => choose(id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-medium text-slate transition-colors duration-250 ease-in-out-quart peer-checked:text-ink peer-focus-visible:shadow-focus hover:text-ink sm:pointer-fine:min-h-9">
                  {LOAN_PRODUCTS[id].shortLabel}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${baseId}-amount`} className="text-sm text-slate">Amount</label>
            <output htmlFor={`${baseId}-amount`} className="text-lg font-semibold text-ink tabular">{formatINR(amount)}</output>
          </div>
          <input
            id={`${baseId}-amount`}
            type="range"
            min={MIN_LOAN_AMOUNT}
            max={product.maxAmount}
            step={START[loanType].step}
            value={amount}
            aria-valuetext={formatINR(amount)}
            onChange={(event) => setAmount(Number(event.target.value))}
            className={SLIDER_CLASS}
          />
          <div aria-hidden="true" className="flex justify-between text-xs text-muted tabular">
            <span>{formatCompactINR(MIN_LOAN_AMOUNT)}</span>
            <span>{formatCompactINR(product.maxAmount)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${baseId}-tenure`} className="text-sm text-slate">Tenure</label>
            <output htmlFor={`${baseId}-tenure`} className="text-lg font-semibold text-ink tabular">{formatTenure(tenure)}</output>
          </div>
          <input
            id={`${baseId}-tenure`}
            type="range"
            min={product.minTenureMonths}
            max={product.maxTenureMonths}
            step={product.tenureStepMonths}
            value={tenure}
            aria-valuetext={`${formatTenure(tenure)}, ${tenure} months`}
            onChange={(event) => setTenure(Number(event.target.value))}
            className={SLIDER_CLASS}
          />
          <div aria-hidden="true" className="flex justify-between text-xs text-muted tabular">
            <span>{formatTenure(product.minTenureMonths)}</span>
            <span>{formatTenure(product.maxTenureMonths)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-dashed border-line-strong/50 bg-canvas/70 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-ink-soft">Estimated EMI</span>
          <span className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-brand tabular" data-testid="landing-emi">
            {formatINR(estimate.emi)}
            <span className="text-sm font-medium tracking-normal text-slate"> a month</span>
          </span>
        </div>
        <LedgerComposition estimate={estimate} />
        <dl className="flex flex-col gap-1.5 border-t border-dashed border-line-strong/50 pt-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-slate">Interest rate (illustrative)</dt>
            <dd className="font-medium text-ink tabular">{`${product.annualInterestRate}% p.a., APR ${estimate.apr.toFixed(2)}%`}</dd>
          </div>
          <div className="flex justify-between gap-3 text-[15px]">
            <dt className="font-medium text-ink">Total payable</dt>
            <dd className="font-semibold text-ink tabular">{formatINR(estimate.totalPayable)}</dd>
          </div>
        </dl>
        <Button
          size="lg"
          fullWidth
          onClick={() => onApply({ loanType, loanAmount: amount, tenureMonths: tenure })}
        >
          {`Apply for ${formatCompactINR(amount)}`}
        </Button>
        <p className="text-xs leading-5 text-slate">
          Illustrative figures for estimation only — not a loan offer or credit decision.
        </p>
      </div>
    </section>
  );
}
