import type { ReactNode } from 'react';
import { describedBy } from './form-ids';

interface FormFieldProps {
  /** Must match the control's `id`. */
  htmlFor: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/**
 * Label + control + error/hint. Give the control `aria-describedby={describedBy(id)}`
 * so screen readers announce the error or hint with it.
 */
export function FormField({ htmlFor, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={describedBy(htmlFor)} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={describedBy(htmlFor)} className="text-sm text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
