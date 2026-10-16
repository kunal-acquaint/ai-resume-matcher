import { FileText, UploadCloud, X } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { cn } from '@/lib/cn';

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  /** Shown under the prompt, e.g. "PDF, up to 5 MB". */
  hint: string;
  error?: string;
  disabled?: boolean;
}

const NOOP = (): void => undefined;

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Single-file picker. A real (visually hidden) file input sits behind the label,
 * so keyboard and screen-reader users get the native file dialog; dropping a file
 * with the mouse is an additional shortcut.
 */
export function FileDropzone({
  file,
  onFileChange,
  accept,
  hint,
  error,
  disabled = false,
}: FileDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  // Drag-and-drop listeners are attached through a ref callback (React 19 runs the
  // returned cleanup when the element unmounts): it is a pointer-only enhancement on
  // top of the accessible file input, not an interaction of its own.
  const attachDropTarget = useCallback(
    (zone: HTMLDivElement | null) => {
      if (!zone || disabled) return NOOP;
      const onDragOver = (event: DragEvent) => {
        event.preventDefault();
        setDragging(true);
      };
      const onDragLeave = () => setDragging(false);
      const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        onFileChange(event.dataTransfer?.files[0] ?? null);
      };
      zone.addEventListener('dragover', onDragOver);
      zone.addEventListener('dragleave', onDragLeave);
      zone.addEventListener('drop', onDrop);
      return () => {
        zone.removeEventListener('dragover', onDragOver);
        zone.removeEventListener('dragleave', onDragLeave);
        zone.removeEventListener('drop', onDrop);
      };
    },
    [disabled, onFileChange],
  );

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <FileText aria-hidden="true" className="size-8 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onFileChange(null)}
          disabled={disabled}
          aria-label={`Remove ${file.name}`}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={attachDropTarget}>
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="peer sr-only"
        aria-describedby={`${inputId}-hint`}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500',
          dragging
            ? 'border-brand-500 bg-brand-50'
            : error
              ? 'border-red-300 bg-red-50/40'
              : 'border-slate-300 hover:bg-slate-50',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <UploadCloud aria-hidden="true" className="size-8 text-slate-400" />
        <span className="text-sm font-medium text-slate-900">
          Drop the resume here or <span className="text-brand-600">browse</span>
        </span>
        <span id={`${inputId}-hint`} className="text-xs text-slate-500">
          {hint}
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
