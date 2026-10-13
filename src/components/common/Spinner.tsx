import { cn } from '../../utils/cn';

interface SpinnerProps {
  className?: string;
  /** Accessible label; omit when a sibling already describes the busy state. */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-full animate-spin motion-reduce:animate-[spin_1.6s_linear_infinite]"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
