import { STEPS } from '../../constants/steps';

const STEP_SUMMARIES: Record<string, string> = {
  loan: 'Product, amount and tenure, with your EMI as you go.',
  personal: 'Your name as on PAN, date of birth and contact details.',
  kyc: 'PAN and Aadhaar, checked on the spot.',
  address: 'Type a PIN code and the city and state fill in.',
  employment: 'How you earn and what you take home each month.',
  coApplicant: 'Only if your loan needs one — their income counts too.',
  documents: 'Upload from your phone and sign on screen.',
  review: 'Key facts, separate consents, then submit.',
};

/** The eight steps of the application as a vertical timeline (it is a real sequence). */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="grid scroll-mt-28 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex max-w-md flex-col gap-4">
        <h2 id="how-title" className="text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[34px]">
          Eight short steps, saved as you go
        </h2>
        <p className="text-[15px] leading-6 text-slate">
          One topic per screen, with errors shown only after you have finished a field. Your
          answers are saved on this device every few seconds, so a dropped connection or a
          closed tab does not cost you your progress.
        </p>
        <p className="text-[15px] leading-6 text-slate">
          Come back within 72 hours and pick up exactly where you stopped.
        </p>
      </div>

      <ol className="relative flex flex-col">
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            data-reveal-item
            style={{ transitionDelay: `${120 + index * 50}ms` }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="absolute top-9 bottom-1 left-[17px] w-px bg-line-strong/40" />
            )}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold text-brand tabular">
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5 pt-1.5">
              <h3 className="text-[15px] font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-6 text-slate">{STEP_SUMMARIES[step.id]}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
