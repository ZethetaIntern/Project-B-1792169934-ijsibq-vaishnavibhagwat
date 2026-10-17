import type { ReactNode } from 'react';
import { navigateTo } from '../../hooks/useRoute';
import { Wordmark } from './Wordmark';

interface AppHeaderProps {
  /** Context label, e.g. "Home Loan application". */
  title?: ReactNode;
  actions?: ReactNode;
}

/** Compact, distraction-free header for the application workspace. */
export function AppHeader({ title, actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigateTo('landing');
          }}
          className="inline-flex min-h-11 min-w-11 items-center rounded-md"
          aria-label="LendSwift home"
        >
          <Wordmark compact />
        </a>
        {title && (
          <>
            <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />
            <p className="hidden truncate text-sm font-medium text-slate sm:block">{title}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
