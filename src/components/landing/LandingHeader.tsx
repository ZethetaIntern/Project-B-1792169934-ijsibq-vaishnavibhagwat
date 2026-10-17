import { Button } from '../common/Button';
import { Wordmark } from '../layout/Wordmark';

export const LANDING_SECTIONS = [
  { id: 'loans', label: 'Loans' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'help', label: 'Help' },
] as const;

/** Marketing header: wordmark, in-page navigation and the primary action. */
export function LandingHeader({ onStart }: { onStart: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <a href="#top" aria-label="LendSwift home" className="inline-flex min-h-11 min-w-11 items-center rounded-md">
          <Wordmark />
        </a>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {LANDING_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate transition-colors hover:bg-ink/[0.04] hover:text-ink">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Button size="sm" onClick={onStart} className="ml-auto">Start application</Button>
      </div>
      <nav aria-label="Sections" className="border-t border-line-soft md:hidden">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2">
          {LANDING_SECTIONS.map((section) => (
            <li key={section.id} className="shrink-0">
              <a href={`#${section.id}`} className="flex min-h-11 items-center px-3 text-sm font-medium text-slate hover:text-ink">
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
