import type { ReactNode } from 'react';
import { Wordmark } from '../layout/Wordmark';

function FooterLink({ href, children, external = false }: {
  href: string; children: ReactNode; external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex min-h-11 items-center text-sm text-slate underline-offset-4 transition-colors hover:text-ink hover:underline sm:pointer-fine:min-h-6"
    >
      {children}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

/** Support, legal links and disclosures. Contact details are placeholders and say so. */
export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-canvas-sunken/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-sm text-[13px] leading-5 text-slate">
            LendSwift is a fictional lender created to demonstrate a digital loan application.
            It is not registered with the Reserve Bank of India and does not offer credit.
            Interest rates and figures are illustrative.
          </p>
        </div>
        <nav aria-label="Support" className="flex flex-col sm:gap-2">
          <h2 className="text-sm font-semibold text-ink">Support</h2>
          <FooterLink href="#help">Help and questions</FooterLink>
          <FooterLink href="mailto:help@lendswift.example">help@lendswift.example</FooterLink>
          <FooterLink href="#privacy">How we handle your information</FooterLink>
        </nav>
        <nav aria-label="Legal" className="flex flex-col sm:gap-2">
          <h2 className="text-sm font-semibold text-ink">Legal</h2>
          <FooterLink href="/lendswift-terms-and-conditions.pdf" external>Terms and conditions (PDF)</FooterLink>
          <FooterLink href="mailto:grievance@lendswift.example">Grievance redressal officer</FooterLink>
          <FooterLink href="https://cms.rbi.org.in" external>RBI Integrated Ombudsman</FooterLink>
        </nav>
      </div>
      <p className="border-t border-line px-4 py-5 text-center text-xs text-slate">
        Email addresses on this page are placeholders on the reserved .example domain.
      </p>
    </footer>
  );
}
