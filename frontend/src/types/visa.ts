export type VisaStatus =
  | 'not_started'
  | 'documents_required'
  | 'documents_submitted'
  | 'application_submitted'
  | 'under_review'
  | 'appointment_scheduled'
  | 'approved'
  | 'rejected';

export interface VisaHistoryEntry {
  _id: string;
  status: VisaStatus;
  remarks: string;
  updatedAt: string;
}

/** What a student sees of their own visa record. */
export interface StudentVisaProcess {
  _id: string;
  status: VisaStatus;
  remarks: string;
  history: VisaHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminVisaRow {
  student: {
    _id: string;
    name: string;
    email: string;
    sapId?: string;
  };
  application: {
    _id: string;
    country: string;
    university: string;
    program: string;
    status: string;
  };
  /** `null` until the office first updates this student's visa. */
  visa: (StudentVisaProcess & { updatedBy?: { name?: string } | null }) | null;
}

export interface VisaUpdatePayload {
  status: VisaStatus;
  remarks: string;
}
