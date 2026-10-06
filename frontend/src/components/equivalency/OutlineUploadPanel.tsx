import { useState } from 'react';
import { FileText, LoaderCircle, Upload } from 'lucide-react';
import type { CourseRequestItem } from '../../types/equivalency';
import { formatDisplayDate } from '../../utils/equivalency';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIN_PASTED_CHARS = 100;

interface OutlineUploadPanelProps {
  item: CourseRequestItem;
  onUpload: (outline: { file?: File | null; text?: string }) => Promise<void>;
}

/** Lets a student at the host university upload (PDF/DOCX) or paste the real outline for one course. */
export default function OutlineUploadPanel({ item, onUpload }: OutlineUploadPanelProps) {
  const [isOpen, setIsOpen] = useState(!item.uploadedOutline);
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isMatching = item.outlineMatchStatus === 'in_progress';

  const handleSubmit = async () => {
    if (mode === 'file' && !file) {
      setError('Choose a PDF or Word file first.');
      return;
    }
    if (mode === 'file' && file && file.size > MAX_FILE_BYTES) {
      setError('The file is larger than 10 MB.');
      return;
    }
    if (mode === 'text' && text.trim().length < MIN_PASTED_CHARS) {
      setError(`Paste the full course outline (at least ${MIN_PASTED_CHARS} characters).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onUpload(mode === 'file' ? { file } : { text: text.trim() });
      setFile(null);
      setText('');
      setIsOpen(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload the outline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
          <FileText className="h-4 w-4" />
          Course outline from the host university
        </p>
        {item.uploadedOutline && !isMatching ? (
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
          >
            {isOpen ? 'Cancel' : 'Replace outline'}
          </button>
        ) : null}
      </div>

      {item.uploadedOutline ? (
        <p className="mt-2 text-sm font-medium text-slate-600">
          {item.uploadedOutline.fileName || 'Pasted text'} · uploaded {formatDisplayDate(item.uploadedOutline.uploadedAt)}
          {isMatching ? (
            <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Matching…
            </span>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm font-medium text-slate-500">
          Upload the outline you received for this course so your advisor can confirm the match against its real content.
        </p>
      )}

      {item.outlineMatchStatus === 'failed' ? (
        <p className="mt-2 text-xs font-medium text-red-700">
          Matching this outline failed: {item.outlineMatchError || 'unknown error'}. Your advisor can re-run it.
        </p>
      ) : null}

      {isOpen && !isMatching ? (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            {(['file', 'text'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  setError('');
                }}
                className={`rounded-[1rem] px-3 py-2 text-xs font-bold transition ${
                  mode === option ? 'bg-dark-blue text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {option === 'file' ? 'Upload file' : 'Paste text'}
              </button>
            ))}
          </div>

          {mode === 'file' ? (
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full text-sm font-medium text-slate-600 file:mr-3 file:rounded-[1rem] file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-700"
            />
          ) : (
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              placeholder="Paste the course outline: weekly topics, learning outcomes, assessment…"
              className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
            />
          )}

          <p className="text-xs font-medium text-slate-400">PDF or Word (.docx), up to 10 MB. Scanned PDFs can't be read, so paste the text instead.</p>

          {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-[1.25rem] bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload outline
          </button>
        </div>
      ) : null}
    </div>
  );
}
