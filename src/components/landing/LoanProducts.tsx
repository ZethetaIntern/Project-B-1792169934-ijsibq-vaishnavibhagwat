import { Briefcase, Home, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { LOAN_PRODUCTS, LOAN_TYPES, type LoanProduct } from '../../constants/loan';
import type { LoanType } from '../../types/application';
import { formatCompactINR, formatTenure } from '../../utils/format';
import { Button } from '../common/Button';

const ICONS: Record<LoanType, ReactNode> = {
  personal: <Wallet aria-hidden="true" className="size-5" />,
  home: <Home aria-hidden="true" className="size-5" />,
  business: <Briefcase aria-hidden="true" className="size-5" />,
};

const WHO_CAN_APPLY: Record<LoanType, string> = {
  personal: 'Salaried, self-employed or business owners',
  home: 'Salaried, self-employed or business owners',
  business: 'Self-employed people and business owners',
};

function coApplicantRule(product: LoanProduct): string {
  return product.coApplicantAboveAmount === 0
    ? 'Always'
    : `Above ${formatCompactINR(product.coApplicantAboveAmount)}`;
}

/** The three products side by side, so their limits can be compared at a glance. */
export function LoanProducts({ onChoose }: { onChoose: (loanType: LoanType) => void }) {
  return (
    <section id="loans" aria-labelledby="loans-title" className="scroll-mt-28">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="loans-title" className="text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[34px]">
          Three loans, one short application
        </h2>
        <p className="text-[15px] leading-6 text-slate">
          Rates are fixed and illustrative. The application adapts to the loan you pick,
          so you only answer what applies to you.
        </p>
      </div>

      <div className="mt-8 grid overflow-hidden rounded-panel border border-line bg-surface shadow-card md:grid-cols-3 md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
        {LOAN_TYPES.map((id) => {
          const product = LOAN_PRODUCTS[id];
          return (
            <article key={id} aria-labelledby={`product-${id}`} className="flex flex-col gap-5 p-6">
              <div className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-tint text-brand">{ICONS[id]}</span>
                <h3 id={`product-${id}`} className="text-lg font-semibold tracking-tight text-ink">{product.label}</h3>
                <p className="text-sm leading-6 text-slate">{product.description}</p>
              </div>
              <dl className="flex flex-col gap-2.5 border-t border-dashed border-line-strong/50 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Borrow up to</dt>
                  <dd className="font-semibold text-ink tabular">{formatCompactINR(product.maxAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Tenure</dt>
                  <dd className="font-medium text-ink tabular">{`${formatTenure(product.minTenureMonths)} to ${formatTenure(product.maxTenureMonths)}`}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Illustrative rate</dt>
                  <dd className="font-medium text-ink tabular">{`${product.annualInterestRate}% p.a.`}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Co-applicant</dt>
                  <dd className="text-right font-medium text-ink">{coApplicantRule(product)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-slate">Who can apply</dt>
                  <dd className="font-medium text-ink">{WHO_CAN_APPLY[id]}</dd>
                </div>
              </dl>
              <Button variant="secondary" className="mt-auto" onClick={() => onChoose(id)}>
                {`Apply for a ${product.label}`}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
