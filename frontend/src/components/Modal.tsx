import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width class for the panel, e.g. "max-w-lg". */
  widthClass?: string;
  /** When true, clicking the backdrop or pressing Escape does nothing (e.g. while saving). */
  locked?: boolean;
  labelledBy?: string;
}

/**
 * Renders a centred dialog on document.body, so it always covers the whole viewport. Rendering it inside the page
 * would pin it to the animated page wrapper instead, which made the backdrop fill the page and pushed the dialog
 * below the fold.
 */
export default function Modal({ onClose, children, widthClass = 'max-w-lg', locked = false, labelledBy }: ModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !locked) onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, locked]);

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !locked && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative z-10 flex max-h-[calc(100vh-2rem)] w-full ${widthClass} flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
