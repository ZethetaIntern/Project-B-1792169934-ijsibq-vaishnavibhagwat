import { cn } from '../../utils/cn';

interface WordmarkProps {
  className?: string;
  /** Hide the text on very small screens, keeping the mark. */
  compact?: boolean;
}

/** LendSwift typographic wordmark: an "L" with a forward arrow, set beside the name. */
export function Wordmark({ className, compact = false }: WordmarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 shrink-0">
        <rect width="32" height="32" rx="9" className="fill-ink" />
        <path d="M10 8v16h12" fill="none" stroke="#F7F5F0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 19l7-7m0 0h-5m5 0v5" fill="none" stroke="#5B82FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={cn('text-[19px] font-semibold tracking-[-0.03em] text-ink', compact && 'max-[359px]:sr-only')}>
        Lend
        <span className="text-cobalt">swift</span>
      </span>
    </span>
  );
}
