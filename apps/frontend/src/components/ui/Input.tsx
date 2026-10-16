import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
  invalid?: boolean;
}

export function Input({ className, invalid = false, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm',
        'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
        invalid ? 'border-red-400' : 'border-slate-300',
        className,
      )}
      {...props}
    />
  );
}
