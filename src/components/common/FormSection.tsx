import { useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Visually and semantically groups related fields (NN/g: group related fields). */
export function FormSection({
  title, description, children, className,
}: FormSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-1 border-b border-line-soft pb-3">
        <h2 id={headingId} className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="text-[13px] leading-5 text-slate">{description}</p>}
      </div>
      {children}
    </section>
  );
}
