import type { Ref, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>;
  invalid?: boolean;
}

/**
 * Native select (accessible and keyboard-friendly by default), styled like `Input`.
 * The `ui-select` class (styles/index.css) adds a custom chevron and, in browsers that
 * support customizable selects, a styled options list.
 */
export function Select({ className, invalid = false, ref, children, ...props }: SelectProps) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        // Display and horizontal padding come from `ui-select` (layout differs per browser support).
        'ui-select h-10 w-full rounded-lg border bg-white text-sm text-slate-900 shadow-sm',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
        invalid ? 'border-red-400' : 'border-slate-300',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
