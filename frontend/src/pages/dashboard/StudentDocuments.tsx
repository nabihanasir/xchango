import { startTransition, useEffect, useState } from 'react';
import StudentDocumentChecklist from '../../components/student/StudentDocumentChecklist';
import { useAuth } from '../../context/AuthContext';
import { documentApi } from '../../lib/documentApi';
import type { StudentDocument } from '../../types/document';
import Notice from '../../components/Notice';

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
      <div>
        <h1 className="text-3xl font-bold text-dark-blue">My documents</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload the documents below so your advisor can review your application.
        </p>
      </div>

      <StudentDocumentChecklist
        documents={loading ? [] : documents}
        uploading={uploading}
        deletingId={deletingId}
        onUpload={handleUpload}
        onDelete={handleDelete}
      />

      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      {successMessage ? <Notice tone="success">{successMessage}</Notice> : null}
    </div>
  );
}
