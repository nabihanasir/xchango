import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  disabled?: boolean;
  hint?: string;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function FileDropzone({
  files,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  multiple = false,
  maxSizeMb = 10,
  disabled = false,
  hint = 'PDF, JPG or PNG',
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const allowedExtensions = accept.split(',').map((extension) => extension.trim().toLowerCase());

  const acceptFiles = (incoming: File[]) => {
    const valid: File[] = [];
    let message = '';

    incoming.forEach((file) => {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
      if (!allowedExtensions.includes(extension)) {
        message = `${file.name} is not a supported file type (${hint}).`;
      } else if (file.size > maxSizeMb * 1024 * 1024) {
        message = `${file.name} is larger than ${maxSizeMb} MB.`;
      } else {
        valid.push(file);
      }
    });

    setError(message);
    if (valid.length) {
      onChange(multiple ? [...files, ...valid] : [valid[0]]);
    }
  };

  const removeFile = (index: number) => onChange(files.filter((_, fileIndex) => fileIndex !== index));

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) acceptFiles(Array.from(event.dataTransfer.files));
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging
            ? 'border-dark-blue bg-dark-blue/5'
            : 'border-slate-300 bg-slate-50 hover:border-dark-blue/40 hover:bg-white'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <div className="rounded-full bg-dark-blue/10 p-3 text-dark-blue">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Drag and drop {multiple ? 'files' : 'a file'} here, or <span className="text-dark-blue underline">browse</span>
        </p>
        <p className="text-xs text-slate-500">
          {hint} · up to {maxSizeMb} MB{multiple ? ' each' : ''}
        </p>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            acceptFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {files.length ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <FileText className="h-5 w-5 flex-shrink-0 text-dark-blue" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeFile(index)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
