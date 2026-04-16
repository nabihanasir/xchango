import { CheckCircle2, Clock3, Eye, Trash2, XCircle } from 'lucide-react';
import { resolveUploadUrl } from '../lib/documentApi';
import type { DocumentStatus, StudentDocument } from '../types/document';

const statusTone: Record<DocumentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

interface DocumentListProps {
  documents: StudentDocument[];
  deletingId?: string | null;
  updatingId?: string | null;
  emptyMessage?: string;
  onDelete?: (documentId: string) => Promise<void>;
  onUpdateStatus?: (documentId: string, status: Exclude<DocumentStatus, 'pending'>) => Promise<void>;
}

export default function DocumentList({
  documents,
  deletingId,
  updatingId,
  emptyMessage = 'No documents uploaded yet.',
  onDelete,
  onUpdateStatus,
}: DocumentListProps) {
  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 px-5 py-6 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : null}

      {documents.map((document) => (
        <article
          key={document._id}
          className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-dark-blue">
              {document.type}
            </p>
            <p className="text-sm text-slate-500">
              {document.fileName} · Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${statusTone[document.status]}`}
            >
              {document.status === 'pending' ? (
                <Clock3 className="h-3.5 w-3.5" />
              ) : document.status === 'approved' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {document.status}
            </span>

            <a
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
              href={resolveUploadUrl(document.fileUrl)}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="h-4 w-4" />
              Open
            </a>

            {onUpdateStatus ? (
              <>
                <button
                  type="button"
                  disabled={updatingId === document._id}
                  onClick={() => void onUpdateStatus(document._id, 'approved')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {updatingId === document._id ? 'Saving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={updatingId === document._id}
                  onClick={() => void onUpdateStatus(document._id, 'rejected')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  {updatingId === document._id ? 'Saving...' : 'Reject'}
                </button>
              </>
            ) : null}

            {onDelete ? (
              <button
                type="button"
                disabled={deletingId === document._id}
                onClick={() => void onDelete(document._id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === document._id ? 'Deleting...' : 'Delete'}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
