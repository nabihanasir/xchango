import { useRef, useState } from 'react';
import { Check, UploadCloud } from 'lucide-react';
import type { StudentDocument } from '../types/document';

const documentSteps = [
  { value: 'transcript', label: 'Transcript', required: true },
  { value: 'cv', label: 'CV', required: true },
  { value: 'passport', label: 'Passport', required: true },
  { value: 'other', label: 'Other (optional)', required: false },
];

const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
const maxSizeMb = 10;

interface DocumentUploadFormProps {
  documents: StudentDocument[];
  uploading: boolean;
  onUpload: (type: string, file: File) => Promise<void>;
}

export default function DocumentUploadForm({ documents, uploading, onUpload }: DocumentUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeType, setActiveType] = useState('transcript');
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');

  const uploadedTypes = new Set(documents.map((document) => document.type));
  const requiredSteps = documentSteps.filter((step) => step.required);
  const completedCount = requiredSteps.filter((step) => uploadedTypes.has(step.value)).length;
  const progress = Math.round((completedCount / requiredSteps.length) * 100);
  const activeStep = documentSteps.find((step) => step.value === activeType) ?? documentSteps[0];

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) {
      return;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!allowedExtensions.includes(extension)) {
      setFileError(`${file.name} is not supported. Use PDF, JPG or PNG.`);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setFileError(`${file.name} is larger than ${maxSizeMb} MB.`);
      return;
    }

    setFileError('');
    await onUpload(activeStep.value, file);

    // Move on to the next document that is still missing.
    const next = documentSteps.find(
      (step) => step.value !== activeStep.value && !uploadedTypes.has(step.value)
    );
    if (next) {
      setActiveType(next.value);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
          <span>Required documents</span>
          <span>
            {completedCount} of {requiredSteps.length} uploaded
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr]">
        <ol className="relative">
          {documentSteps.map((step, index) => {
            const done = uploadedTypes.has(step.value);
            const active = step.value === activeStep.value;
            const isLast = index === documentSteps.length - 1;

            return (
              <li key={step.value} className="relative pb-6 last:pb-0">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${
                      done ? 'bg-slate-300' : 'bg-slate-200'
                    }`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveType(step.value)}
                  aria-current={active ? 'step' : undefined}
                  className="flex items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                      done
                        ? 'border-slate-300 bg-slate-300 text-white'
                        : active
                          ? 'border-dark-blue bg-white text-dark-blue'
                          : 'border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      done ? 'text-slate-400' : active ? 'text-dark-blue' : 'text-slate-700'
                    }`}
                  >
                    {step.label}
                    {done ? <span className="ml-2 text-xs font-medium">Uploaded</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFile(event.dataTransfer.files[0]);
          }}
          className={`flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? 'border-dark-blue bg-dark-blue/5' : 'border-slate-300 bg-slate-50'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
            {activeStep.label.replace(' (optional)', '')}
          </p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-dark-blue px-8 py-3 text-base font-bold text-white transition hover:bg-[#0e1550] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud className="h-5 w-5" />
            {uploading ? 'Uploading...' : uploadedTypes.has(activeStep.value) ? 'Upload another' : 'Upload document'}
          </button>
          <p className="text-lg font-semibold text-slate-600">or drop a file</p>
          <p className="text-xs text-slate-500">PDF, JPG or PNG · up to {maxSizeMb} MB</p>
          {fileError ? <p className="text-sm font-medium text-red-600">{fileError}</p> : null}
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept={allowedExtensions.join(',')}
            disabled={uploading}
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}
