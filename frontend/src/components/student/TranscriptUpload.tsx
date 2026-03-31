import { useState } from 'react';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import { resolveUploadUrl } from '../../lib/studentProfileApi';

interface TranscriptUploadProps {
  uploading: boolean;
  currentFileUrl?: string;
  errorMessage?: string;
  onUpload: (file: File) => Promise<void>;
}

export default function TranscriptUpload({
  uploading,
  currentFileUrl,
  errorMessage,
  onUpload,
}: TranscriptUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    await onUpload(selectedFile);
    setSelectedFile(null);
  };

  return (
    <section className="glass-card rounded-[2rem] p-7 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">Transcript</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Upload and Parse Excel Transcript</h2>
          <p className="mt-2 text-sm text-slate-500">
            Supports semi-structured sheets and automatically groups courses semester-wise.
          </p>
        </div>

        {currentFileUrl ? (
          <a
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
            href={resolveUploadUrl(currentFileUrl)}
            target="_blank"
            rel="noreferrer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            View uploaded file
          </a>
        ) : null}
      </div>

      <form className="mt-8 flex flex-col gap-4 md:flex-row" onSubmit={handleSubmit}>
        <label className="flex-1 cursor-pointer rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 transition hover:border-dark-blue/40 hover:bg-white">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-dark-blue p-3 text-white">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {selectedFile ? selectedFile.name : 'Choose transcript file'}
              </p>
              <p className="text-sm text-slate-500">Accepted: `.xlsx`, `.xls`, `.csv`</p>
            </div>
          </div>
          <input
            className="hidden"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="rounded-[1.75rem] bg-accent-yellow px-6 py-4 text-sm font-black text-dark-blue transition hover:bg-yellow-default disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Upload transcript'}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
