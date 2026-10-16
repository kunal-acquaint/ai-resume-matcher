import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { getErrorMessage } from '@/lib/api/api-error';
import { Alert } from './Alert';
import { Button } from './Button';
import { Spinner } from './Spinner';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <Icon aria-hidden="true" className="size-6 text-slate-400" />
      </span>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Error from a failed query, with a retry button. */
export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="space-y-3 py-6">
      <Alert>{getErrorMessage(error)}</Alert>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex justify-center py-12 text-brand-600">
      <Spinner className="size-6" label={label} />
    </div>
  );
}
