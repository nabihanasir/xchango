import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DEFAULT_PAGE_SIZE = 10;

/** Client-side paging over an already-loaded (and already-filtered) list. */
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Filtering or reloading can shrink the list below the current page.
  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, totalPages, pageItems, total: items.length, pageSize };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Returns page numbers with `null` marking a gap, e.g. 1 … 4 5 6 … 20. */
export const getPageWindow = (page: number, totalPages: number): Array<number | null> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: Array<number | null> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push(null);
    result.push(value);
  });
  return result;
};

export default function Pagination({ page, totalPages, total, pageSize, onPageChange, className = '' }: PaginationProps) {
  // Nothing to page through, so don't clutter short lists.
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const buttonBase =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row ${className}`}
    >
      <p className="text-sm text-slate-600">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${buttonBase} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPageWindow(page, totalPages).map((value, index) =>
          value === null ? (
            <span key={`gap-${index}`} className="px-1 text-slate-400" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={value}
              type="button"
              onClick={() => onPageChange(value)}
              aria-current={value === page ? 'page' : undefined}
              className={`${buttonBase} ${
                value === page
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {value}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${buttonBase} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
