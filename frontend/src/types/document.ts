export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface StudentDocument {
  _id: string;
  studentId: string;
  type: string;
  fileUrl: string;
  fileName: string;
  status: DocumentStatus;
  uploadedAt: string;
  createdAt?: string;
  updatedAt?: string;
}
