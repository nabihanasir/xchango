import { useState } from 'react';
import { ExternalLink, FileUp, Trash2 } from 'lucide-react';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { StudentDocument } from '../../types/studentProfile';

interface DocumentsProps {
  documents: StudentDocument[];
  uploading: boolean;
  deletingId?: string | null;
  errorMessage?: string;
  onUpload: (type: string, file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}

const documentTypes = ['transcript', 'passport', 'cv', 'recommendation', 'other'];

export default function Documents({
  documents,
  uploading,
  deletingId,
  errorMessage,
  onUpload,
  onDelete,
}: DocumentsProps) {
  const [documentType, setDocumentType] = useState('passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    await onUpload(documentType, selectedFile);
    setSelectedFile(null);
  };

  return (
    <section className="glass-card rounded-[2rem] p-7 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">Documents</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Upload and Manage Files</h2>
        </div>
      </div>

      <form className="mt-6 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
        <select
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
          value={documentType}
          onChange={(event) => setDocumentType(event.target.value)}
        >
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label className="cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-dark-blue/40">
          {selectedFile ? selectedFile.name : 'Choose document'}
          <input
            className="hidden"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileUp className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {documents.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 px-5 py-6 text-sm text-slate-500">
            No documents uploaded yet.
          </div>
        ) : null}

        {documents.map((document) => (
          <div
            key={document._id}
            className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-dark-blue">{document.type}</p>
              <p className="mt-1 text-sm text-slate-500">
                Status: <span className="font-semibold text-slate-700">{document.status}</span> · Uploaded{' '}
                {new Date(document.uploadedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
                href={resolveUploadUrl(document.fileUrl)}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
              <button
                type="button"
                disabled={deletingId === document._id}
                onClick={() => void onDelete(document._id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === document._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
