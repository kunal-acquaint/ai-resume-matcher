import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons at the bottom of the dialog. */
  footer?: ReactNode;
}

/**
 * Modal built on the native `<dialog>` element: the browser handles focus
 * trapping, the Escape key and making the rest of the page inert.
 */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape key: let React state decide whether the dialog closes.
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
    >
      {open && (
        <div className="flex flex-col">
          <header className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>
          <div className="px-5 py-2">{children}</div>
          {footer && <footer className="flex justify-end gap-2 px-5 pb-5 pt-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
