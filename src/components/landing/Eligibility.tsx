import { Check, FileText } from 'lucide-react';
import {
  MAX_AGE_AT_MATURITY,
  MAX_APPLICANT_AGE,
  MIN_ANNUAL_TURNOVER,
  MIN_APPLICANT_AGE,
  MIN_MONTHLY_SALARY,
  MIN_YEARS_IN_BUSINESS,
} from '../../constants/loan';
import { formatCompactINR, formatINR } from '../../utils/format';

const CRITERIA = [
  `You are ${MIN_APPLICANT_AGE} to ${MAX_APPLICANT_AGE} years old, and the loan ends before you turn ${MAX_AGE_AT_MATURITY}.`,
  'You have a PAN and an Aadhaar number.',
  `If you are salaried, you take home at least ${formatINR(MIN_MONTHLY_SALARY)} a month.`,
  `If you run a business or work for yourself, you have done so for ${MIN_YEARS_IN_BUSINESS} years or more with a turnover of at least ${formatCompactINR(MIN_ANNUAL_TURNOVER)} a year.`,
];

const DOCUMENTS = [
  'PAN card and both sides of your Aadhaar card',
  'Bank statements for the last 6 months',
  'Salary slips for 3 months, or income tax returns for 2 years',
  'Home Loans: property papers. Business Loans: registration and GST returns',
  'A recent passport-size photo',
];

/** Who can apply, and what to have to hand before starting. */
export function Eligibility() {
  return (
    <section id="eligibility" aria-labelledby="eligibility-title" className="scroll-mt-28">
      <h2 id="eligibility-title" className="max-w-2xl text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[34px]">
        Check you can apply before you start
      </h2>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-6">
          <h3 className="text-[15px] font-semibold text-ink">You can apply if</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {CRITERIA.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-success-ink" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-line bg-surface p-6">
          <h3 className="text-[15px] font-semibold text-ink">Keep these ready</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {DOCUMENTS.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft">
                <FileText aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-5 text-slate">
            Photos taken on your phone are fine. They are compressed before upload.
          </p>
        </div>
      </div>
    </section>
  );
}
