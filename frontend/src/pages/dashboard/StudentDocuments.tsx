import { startTransition, useEffect, useState } from 'react';
import { FileCheck2, FileText, UploadCloud } from 'lucide-react';
import DocumentList from '../../components/DocumentList';
import DocumentUploadForm from '../../components/DocumentUploadForm';
import { useAuth } from '../../context/AuthContext';
import { documentApi } from '../../lib/documentApi';
import type { StudentDocument } from '../../types/document';

export default function StudentDocuments() {
  const { user } = useAuth();
  const studentId = user?._id ?? '';

  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDocuments = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await documentApi.getStudentDocuments(studentId);
        if (!cancelled) {
          startTransition(() => {
            setDocuments(data);
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load documents.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const handleUpload = async (type: string, file: File) => {
    if (!studentId) {
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const uploadedDocument = await documentApi.uploadDocument(studentId, type, file);
      startTransition(() => {
        setDocuments((current) => [uploadedDocument, ...current]);
      });
      setSuccessMessage('Document uploaded successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await documentApi.deleteDocument(documentId);
      startTransition(() => {
        setDocuments((current) => current.filter((document) => document._id !== documentId));
      });
      setSuccessMessage('Document deleted successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Sign in as a student to manage document submissions.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#081028] via-[#102b52] to-[#19648b] p-8 text-white shadow-2xl shadow-sky-950/10 md:p-10">
        <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-cyan-300/15 blur-[80px]" />
        <div className="relative z-10 max-w-4xl">
          <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">
            Student Documents
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Submit and manage your supporting documents
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
            Upload transcripts, passports, and supporting files in one dedicated module. Advisors can review and approve submissions separately.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-[2rem] p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Uploaded Files</p>
          <p className="mt-3 text-4xl font-black text-dark-blue">{documents.length}</p>
        </div>
        <div className="glass-card rounded-[2rem] p-6">
          <div className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500">Status updates are handled separately by advisors and admins.</p>
        </div>
        <div className="glass-card rounded-[2rem] p-6">
          <div className="inline-flex rounded-2xl bg-accent-yellow/20 p-3 text-dark-blue">
            <FileText className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500">Accepted files: PDF, JPG, and PNG.</p>
        </div>
      </div>

      <section className="glass-card rounded-[2rem] p-7 md:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">Upload Documents</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Submit supporting files</h2>
            <p className="mt-2 text-sm text-slate-500">
              Choose a document type and upload the matching file. Uploaded files are stored securely and listed below.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <UploadCloud className="h-4 w-4" />
            Separate from student profile
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <DocumentUploadForm uploading={uploading} onUpload={handleUpload} />

          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-[1.75rem] bg-slate-100" />
              ))}
            </div>
          ) : (
          <DocumentList
            documents={documents}
            deletingId={deletingId}
            emptyMessage="No documents uploaded yet."
            onDelete={handleDelete}
            />
          )}
        </div>
      </section>
    </div>
  );
}
