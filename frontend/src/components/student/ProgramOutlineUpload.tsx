import { useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { ProgramOutline } from '../../types/equivalency';
import Notice from '../Notice';

interface ProgramOutlineUploadProps {
  outline: ProgramOutline | null;
  uploading: boolean;
  errorMessage?: string;
  onUpload: (file: File) => Promise<void>;
}

export default function ProgramOutlineUpload({ outline, uploading, errorMessage, onUpload }: ProgramOutlineUploadProps) {
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
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent-yellow">Program outline</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Upload Your Program Outline</h2>
          <p className="mt-2 text-sm text-slate-500">
            Upload the semester-wise course plan of your degree (PDF) together with your transcript. Your advisor uses
            both to check which semester you are in, how many credit hours you may take, and which courses fit your plan.
          </p>
        </div>

        {outline?.fileUrl ? (
          <a
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
            href={resolveUploadUrl(outline.fileUrl)}
            target="_blank"
            rel="noreferrer"
          >
            <FileText className="h-4 w-4" />
            View uploaded file
          </a>
        ) : null}
      </div>

      {outline ? (
        <Notice tone="success">
          {outline.programName || 'Program outline'} read: {outline.semesters.length} semesters,{' '}
            {outline.totalCredits} credit hours. Your advisor will review the course types.
        </Notice>
      ) : null}

      <form className="mt-6 flex flex-col gap-4 md:flex-row" onSubmit={handleSubmit}>
        <label className="flex-1 cursor-pointer rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 transition hover:border-dark-blue/40 hover:bg-white">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-dark-blue p-3 text-white">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {selectedFile ? selectedFile.name : outline ? 'Choose a new program outline' : 'Choose program outline file'}
              </p>
              <p className="text-sm text-slate-500">Accepted: `.pdf` (a text-based PDF, not a scan)</p>
            </div>
          </div>
          <input
            className="hidden"
            type="file"
            accept=".pdf"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="rounded-[1.75rem] bg-accent-yellow px-6 py-4 text-sm font-bold text-dark-blue transition hover:bg-yellow-default disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? 'Reading outline...' : outline ? 'Replace outline' : 'Upload outline'}
        </button>
      </form>

      {errorMessage ? (
        <Notice tone="error">{errorMessage}</Notice>
      ) : null}
    </section>
  );
}
