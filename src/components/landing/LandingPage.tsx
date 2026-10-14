import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { navigateTo } from '../../hooks/useRoute';
import { useApplicationStore } from '../../store/applicationStore';
import type { LoanType } from '../../types/application';
import { Button } from '../common/Button';
import { EmiCalculator, type LoanPreset } from './EmiCalculator';
import { Eligibility } from './Eligibility';
import { HelpFaq } from './HelpFaq';
import { HowItWorks } from './HowItWorks';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
import { LoanProducts } from './LoanProducts';
import { TrustNotes } from './TrustNotes';

interface LandingPageProps {
  /** Extra hero action, e.g. the demo launcher. */
  secondaryAction?: ReactNode;
}

/**
 * Experience A — the public landing page: what LendSwift offers, what it will
 * cost, who can apply and how the application works, before anyone starts.
 */
export function LandingPage({ secondaryAction }: LandingPageProps) {
  const updateSection = useApplicationStore((state) => state.updateSection);

  const start = () => navigateTo('apply');
  const startWith = (preset: Partial<LoanPreset> & { loanType: LoanType }) => {
    updateSection('loan', { loanAmount: null, tenureMonths: null, ...preset });
    start();
  };

  return (
    <div id="top" className="min-h-dvh">
      <LandingHeader onStart={start} />
      <main id="main-content" className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pt-10 pb-24 sm:px-6 sm:pt-16 lg:gap-32">
        <section aria-labelledby="hero-title" className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
          <div className="flex flex-col gap-6">
            <h1 id="hero-title" className="max-w-[13ch] text-[44px] leading-[1.02] font-semibold tracking-[-0.04em] text-ink sm:text-[64px]">
              Your next chapter starts with a smarter loan.
            </h1>
            <p className="max-w-[46ch] text-lg leading-7 text-slate">
              Personal, Home and Business loans in one guided application. See what you will
              repay before you begin, upload documents from your phone, and pick up where you
              left off.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={start} trailingIcon={<ArrowRight aria-hidden="true" className="size-4" />}>
                Start your application
              </Button>
              {secondaryAction}
            </div>
            <p className="text-sm text-slate">You will need your PAN, Aadhaar and recent bank statements.</p>
          </div>
          <EmiCalculator onApply={startWith} />
        </section>

        <LoanProducts onChoose={(loanType) => startWith({ loanType })} />
        <HowItWorks />
        <Eligibility />
        <TrustNotes />
        <HelpFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
