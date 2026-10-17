import {
  ExternalLink, Headset, Scale, Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { FormSection } from '../common/FormSection';

/** Exit window after disbursal under the RBI digital lending rules (tenor of 7 days or more). */
export const COOLING_OFF_DAYS = 3;

function Item({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas-sunken text-brand">{icon}</span>
      <div className="flex flex-col gap-1 text-[13px] leading-5 text-ink-soft">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {children}
      </div>
    </li>
  );
}

/**
 * Disclosures required before a digital loan is accepted (A3.1): cooling-off
 * period, grievance officer and escalation to the RBI Ombudsman. LendSwift is a
 * fictional lender, so its contact details are placeholders and say so.
 */
export function RegulatoryDisclosures() {
  return (
    <FormSection title="Before you submit" description="Your rights if this loan is approved.">
      <ul className="flex flex-col gap-5">
        <Item icon={<Undo2 aria-hidden="true" className="size-4" />} title={`${COOLING_OFF_DAYS}-day cooling-off period`}>
          <p>
            {`After the loan is disbursed you can exit within ${COOLING_OFF_DAYS} days by repaying the principal and the proportionate APR, with no prepayment penalty.`}
          </p>
        </Item>
        <Item icon={<Headset aria-hidden="true" className="size-4" />} title="Grievance redressal officer">
          <p>
            Write to grievance@lendswift.example. Complaints are acknowledged within 2 working
            days and we aim to resolve them within 30 days.
          </p>
          <p className="text-xs text-slate">LendSwift is a fictional lender, so this is a placeholder contact for the demo.</p>
        </Item>
        <Item icon={<Scale aria-hidden="true" className="size-4" />} title="RBI Integrated Ombudsman">
          <p>
            If your complaint is not resolved within 30 days, or you are unhappy with the reply,
            you can complain to the Reserve Bank of India under the Reserve Bank – Integrated
            Ombudsman Scheme, 2021.
          </p>
          <a
            href="https://cms.rbi.org.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-1 font-medium text-cobalt underline-offset-4 hover:underline sm:pointer-fine:min-h-6"
          >
            cms.rbi.org.in
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Item>
      </ul>
    </FormSection>
  );
}
