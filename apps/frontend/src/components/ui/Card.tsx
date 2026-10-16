import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  title?: string;
  description?: ReactNode;
  /** Controls shown in the card header, e.g. an "Edit" button. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** White panel used to group a section of a page. Renders a `<section>` labelled by its title. */
export function Card({ title, description, actions, children, className }: CardProps) {
  const headingId = title ? `card-${title.toLowerCase().replace(/\W+/g, '-')}` : undefined;
  return (
    <section
      aria-labelledby={headingId}
      className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && (
              <h2 id={headingId} className="text-base font-semibold text-slate-900">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
