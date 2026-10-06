import { useState } from 'react';
import { FileUp } from 'lucide-react';
import DocumentTypePicker from './DocumentTypePicker';
import FileDropzone from './FileDropzone';

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
  const [files, setFiles] = useState<File[]>([]);
  const selectedFile = files[0] ?? null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    await onUpload(documentType, selectedFile);
    setFiles([]);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <DocumentTypePicker options={documentTypes} value={documentType} onChange={setDocumentType} />

      <FileDropzone files={files} onChange={setFiles} disabled={uploading} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileUp className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload document'}
        </button>
      </div>
    </form>
  );
}
