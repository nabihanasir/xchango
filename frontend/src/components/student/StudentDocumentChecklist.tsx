import { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { resolveUploadUrl } from '../../lib/documentApi';
import type { StudentDocument } from '../../types/document';

interface DocumentKind {
  value: string;
  label: string;
  short: string;
  help: string;
  required: boolean;
}

const documentKinds: DocumentKind[] = [
  {
    value: 'transcript',
    label: 'Academic transcript',
    short: 'Transcript',
    help: 'Your latest official transcript, showing your courses and grades.',
    required: true,
  },
  {
    value: 'cv',
    label: 'CV',
    short: 'CV',
    help: 'Your current CV with your education and experience.',
    required: false,
  },
  {
    value: 'passport',
    label: 'Passport',
    short: 'Passport',
    help: 'A clear scan of the page with your photo and details.',
    required: false,
  },
  {
    value: 'other',
    label: 'Other documents',
    short: 'Other',
    help: 'Anything else your advisor asks for, such as a recommendation letter.',
    required: false,
  },
];

const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
const maxSizeMb = 10;

const byNewest = (a: StudentDocument, b: StudentDocument) =>
  new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();

type KindState = 'missing' | 'pending' | 'approved' | 'rejected';

const stateStyles: Record<KindState, { label: string; chip: string; icon: typeof Clock3 }> = {
  missing: { label: 'Not uploaded yet', chip: 'bg-slate-100 text-slate-600', icon: FileText },
  pending: { label: 'Uploaded, waiting for advisor review', chip: 'bg-amber-50 text-amber-700', icon: Clock3 },
  approved: { label: 'Approved', chip: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected, please upload a corrected file', chip: 'bg-red-50 text-red-700', icon: AlertCircle },
};

interface StudentDocumentChecklistProps {
  documents: StudentDocument[];
  uploading: boolean;
  deletingId: string | null;
  onUpload: (type: string, file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}

/**
 * One plain row per document the student has to provide. Each row says what the document is, whether it has
 * been uploaded and reviewed, and has its own Upload button, so there is nothing to select first.
 */
export default function StudentDocumentChecklist({
  documents,
  uploading,
  deletingId,
  onUpload,
  onDelete,
}: StudentDocumentChecklistProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingKind = useRef<string>('transcript');
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<string | null>(null);
  const [fileError, setFileError] = useState<{ kind: string; message: string } | null>(null);

  const knownKinds = new Set(documentKinds.map((kind) => kind.value));
  const docsFor = (kind: string) =>
    documents
      .filter((document) => (kind === 'other' ? !knownKinds.has(document.type) || document.type === 'other' : document.type === kind))
      .sort(byNewest);

  const stateFor = (kind: DocumentKind): KindState => {
    const latest = docsFor(kind.value)[0];
    return latest ? latest.status : 'missing';
  };

  const nextMissing = documentKinds.find((kind) => kind.required && docsFor(kind.value).length === 0);

  const handleFile = async (kind: string, file: File | undefined) => {
    if (!file || uploading) return;

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!allowedExtensions.includes(extension)) {
      setFileError({ kind, message: `${file.name} is not supported. Please use a PDF, JPG or PNG file.` });
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setFileError({ kind, message: `${file.name} is larger than ${maxSizeMb} MB. Please choose a smaller file.` });
      return;
    }

    setFileError(null);
    setBusyKind(kind);
    try {
      await onUpload(kind, file);
    } finally {
      setBusyKind(null);
    }
  };

  const openPicker = (kind: string) => {
    pendingKind.current = kind;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          {nextMissing ? `Next step: upload your ${nextMissing.short.toLowerCase()}` : 'Your required document is uploaded'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {nextMissing
            ? 'Your advisor needs this document to review your application.'
            : 'A CV and passport are optional, but they help your advisor.'}
        </p>

        <ol className="mt-6 grid grid-cols-4">
          {documentKinds.map((kind, index) => {
            const done = docsFor(kind.value).length > 0;
            const current = nextMissing?.value === kind.value;
            const isLast = index === documentKinds.length - 1;

            return (
              <li key={kind.value} className="relative flex flex-col items-center text-center">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-4 h-0.5 w-full ${done ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  />
                ) : null}
                <span
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                    done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : current
                        ? 'border-dark-blue bg-white'
                        : 'border-slate-300 bg-white'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                </span>
                <span className={`mt-2 text-sm font-semibold ${done || current ? 'text-slate-900' : 'text-slate-600'}`}>
                  {kind.short}
                </span>
                <span className="text-[11px] text-slate-400">{kind.required ? 'Required' : 'Optional'}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <ul className="space-y-3">
        {documentKinds.map((kind) => {
          const state = stateFor(kind);
          const style = stateStyles[state];
          const StateIcon = style.icon;
          const files = docsFor(kind.value);
          const isBusy = busyKind === kind.value;
          const isDragging = dragKind === kind.value;
          const buttonLabel = isBusy
            ? 'Uploading...'
            : state === 'missing'
              ? 'Upload'
              : state === 'rejected'
                ? 'Upload again'
                : kind.value === 'other'
                  ? 'Add another'
                  : 'Replace file';

          return (
            <li
              key={kind.value}
              onDragOver={(event) => {
                event.preventDefault();
                if (!uploading) setDragKind(kind.value);
              }}
              onDragLeave={() => setDragKind(null)}
              onDrop={(event) => {
                event.preventDefault();
                setDragKind(null);
                void handleFile(kind.value, event.dataTransfer.files[0]);
              }}
              className={`rounded-[1.5rem] border bg-white p-5 transition ${
                isDragging ? 'border-dark-blue bg-dark-blue/5' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{kind.label}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        kind.required ? 'bg-dark-blue text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {kind.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{kind.help}</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.chip}`}>
                    <StateIcon className="h-3.5 w-3.5" />
                    {style.label}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => openPicker(kind.value)}
                  className={`inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    state === 'missing' || state === 'rejected'
                      ? 'bg-dark-blue text-white hover:bg-navy-hover'
                      : 'border border-slate-300 bg-white text-dark-blue hover:border-dark-blue'
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  {buttonLabel}
                </button>
              </div>

              {isDragging ? <p className="mt-3 text-sm font-semibold text-dark-blue">Drop the file here to upload it.</p> : null}
              {fileError?.kind === kind.value ? <p className="mt-3 text-sm font-medium text-red-600">{fileError.message}</p> : null}

              {files.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4">
                  {files.map((document) => (
                    <li key={document._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{document.fileName}</p>
                        <p className="text-xs text-slate-500">
                          Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
                          {document.status === 'approved' ? ' · Approved' : document.status === 'rejected' ? ' · Rejected' : ' · Waiting for review'}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <a
                          href={resolveUploadUrl(document.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </a>
                        <button
                          type="button"
                          disabled={deletingId === document._id}
                          onClick={() => void onDelete(document._id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === document._id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-slate-500">
        Accepted files: PDF, JPG or PNG, up to {maxSizeMb} MB each. You can also drag a file onto any document above.
      </p>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={allowedExtensions.join(',')}
        disabled={uploading}
        onChange={(event) => {
          void handleFile(pendingKind.current, event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
