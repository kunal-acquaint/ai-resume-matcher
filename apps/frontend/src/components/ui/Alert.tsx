import { CircleAlert, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface AlertProps {
  variant?: 'error' | 'info';
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = 'error', children, className }: AlertProps) {
  const Icon = variant === 'error' ? CircleAlert : Info;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3 text-sm',
        variant === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-brand-100 bg-brand-50 text-brand-700',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
