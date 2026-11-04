import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export type NoticeTone = 'error' | 'success';

interface NoticeProps {
  tone: NoticeTone;
  title?: string;
  /** Re-opens the popup when this value changes (defaults to the string children). */
  resetKey?: unknown;
  onClose?: () => void;
  children: ReactNode;
}

const toneConfig = {
  error: {
    Icon: AlertTriangle,
    defaultTitle: 'Something went wrong',
    iconWrap: 'bg-red-100 text-red-600',
    title: 'text-red-900',
  },
  success: {
    Icon: CheckCircle2,
    defaultTitle: 'Success',
    iconWrap: 'bg-emerald-100 text-emerald-600',
    title: 'text-emerald-900',
  },
} as const;

/**
 * Standard app-wide popup for error and success feedback.
 * Closes via the small grey X (top-right), the Escape key, or a click on the backdrop.
 * Render it conditionally (`{error ? <Notice tone="error">{error}</Notice> : null}`);
 * it keeps its own dismissed state and re-opens whenever `resetKey` changes.
 */
export default function Notice({ tone, title, resetKey, onClose, children }: NoticeProps) {
  const [dismissedKey, setDismissedKey] = useState<unknown>(undefined);
  const [hasDismissed, setHasDismissed] = useState(false);
  const key = resetKey ?? (typeof children === 'string' ? children : undefined);
  const open = !(hasDismissed && dismissedKey === key);

  const close = () => {
    setDismissedKey(key);
    setHasDismissed(true);
    onClose?.();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDismissedKey(key);
        setHasDismissed(true);
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, key, onClose]);

  if (!open) return null;

  const { Icon, defaultTitle, iconWrap, title: titleColor } = toneConfig[tone];

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role={tone === 'error' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={title || defaultTitle}
        className="relative w-full max-w-md rounded-[1.75rem] bg-white p-6 text-slate-700 shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconWrap}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <p className={`text-lg font-bold ${titleColor}`}>{title || defaultTitle}</p>
            <div className="mt-2 break-words text-sm leading-6">{children}</div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
