import { useState } from 'react';
import { ExternalLink, UploadCloud } from 'lucide-react';
import { resolveApplicationFileUrl } from '../lib/applicationApi';
import type { WorkflowApplicationDocument } from '../types/application';

interface DocumentUploadProps {
  documents: WorkflowApplicationDocument[];
  uploading: boolean;
  errorMessage?: string;
  onUpload: (type: string, files: File[]) => Promise<void>;
}

export default function DocumentUpload({
  documents,
  uploading,
  errorMessage,
  onUpload,
}: DocumentUploadProps) {
  const [type, setType] = useState('passport');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files.length) {
      return;
    }

    await onUpload(type, files);
    setFiles([]);
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black text-slate-900">Post-Shortlist Document Upload</h3>
      <form className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
        <select className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="passport">Passport</option>
          <option value="medical">Medical</option>
          <option value="financial">Financial</option>
          <option value="other">Other</option>
        </select>
        <label className="cursor-pointer rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
          {files.length ? `${files.length} file(s) selected` : 'Choose document files'}
          <input
            className="hidden"
            type="file"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
        </label>
        <button
          type="submit"
          disabled={!files.length || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <UploadCloud className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <div className="mt-5 space-y-3">
        {documents.map((document) => (
          <a
            key={`${document.type}-${document.fileUrl}`}
            href={resolveApplicationFileUrl(document.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-dark-blue"
          >
            <span>{document.type}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </div>
    </section>
  );
}
