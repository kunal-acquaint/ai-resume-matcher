import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SpinnerProps {
  className?: string;
  /** Announced to screen readers. */
  label?: string;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    // <output> is an implicit status region, so the label is announced politely.
    <output className="inline-flex items-center">
      <LoaderCircle aria-hidden="true" className={cn('size-5 animate-spin', className)} />
      <span className="sr-only">{label}</span>
    </output>
  );
}

/** Centered spinner filling the viewport, for app-level loading states. */
export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center text-brand-600">
      <Spinner className="size-8" label={label} />
    </div>
  );
}
