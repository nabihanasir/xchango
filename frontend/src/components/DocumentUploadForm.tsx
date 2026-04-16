import { useState } from 'react';
import { FileUp } from 'lucide-react';

const documentTypes = [
  { value: 'transcript', label: 'Transcript' },
  { value: 'cv', label: 'CV' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
];

interface DocumentUploadFormProps {
  uploading: boolean;
  onUpload: (type: string, file: File) => Promise<void>;
}

export default function DocumentUploadForm({ uploading, onUpload }: DocumentUploadFormProps) {
  const [documentType, setDocumentType] = useState('transcript');
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
    <form className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
      <select
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
        value={documentType}
        onChange={(event) => setDocumentType(event.target.value)}
      >
        {documentTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      <label className="cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-dark-blue/40">
        {selectedFile ? selectedFile.name : 'Choose document'}
        <input
          className="hidden"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
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
  );
}
