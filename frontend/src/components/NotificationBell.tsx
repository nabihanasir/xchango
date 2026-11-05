import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi, type AppNotification } from '../lib/api';

const POLL_MS = 60_000;

const timeAgo = (value: string) => {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
};

/** Links are stored as absolute app URLs (for emails); inside the app only the path is needed. */
const toPath = (link?: string) => {
  if (!link) return '';
  try {
    const url = new URL(link);
    return `${url.pathname}${url.search}`;
  } catch {
    return link.startsWith('/') ? link : '';
  }
};

interface NotificationBellProps {
  /** Tailwind classes for the button, so each role keeps its themed hover colour. */
  buttonClassName: string;
}

export default function NotificationBell({ buttonClassName }: NotificationBellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await notificationsApi.list(user.token);
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      // The bell is secondary UI: a failed refresh should never interrupt the page.
    }
  }, [user?.token]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((current) => !current);
    if (!open) void load();
  };

  const openItem = async (item: AppNotification) => {
    if (!user?.token) return;
    if (!item.isRead) {
      setItems((current) => current.map((entry) => (entry._id === item._id ? { ...entry, isRead: true } : entry)));
      setUnread((count) => Math.max(0, count - 1));
      void notificationsApi.markRead(user.token, item._id).catch(() => undefined);
    }
    const path = toPath(item.link);
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  const markAll = async () => {
    if (!user?.token || !unread) return;
    setItems((current) => current.map((entry) => ({ ...entry, isRead: true })));
    setUnread(0);
    await notificationsApi.markAllRead(user.token).catch(() => undefined);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className={buttonClassName}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-800">Notifications</p>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={!unread}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length ? (
              items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    item.isRead ? '' : 'bg-sky-50/60'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-red-500'}`}
                  />
                  <span className="min-w-0">
                    {item.subject ? <span className="block text-sm font-bold text-slate-800">{item.subject}</span> : null}
                    <span className="mt-0.5 line-clamp-3 block text-xs font-medium leading-5 text-slate-600">
                      {item.message}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {timeAgo(item.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm font-medium text-slate-500">You're all caught up.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
