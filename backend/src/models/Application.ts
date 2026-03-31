import mongoose, { Document, Schema } from 'mongoose';

export enum ApplicationCountry {
  MALAYSIA = 'Malaysia',
  SOUTH_KOREA = 'South Korea',
  TURKEY = 'Turkey',
}

export enum AccommodationPreference {
  UNIVERSITY = 'UNIVERSITY',
  SELF = 'SELF',
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_INTERVIEW = 'PENDING_INTERVIEW',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  SHORTLISTED = 'SHORTLISTED',
  REJECTED = 'REJECTED',
  DOCUMENT_PENDING = 'DOCUMENT_PENDING',
  COURSE_SELECTION_PENDING = 'COURSE_SELECTION_PENDING',
  READY_FOR_SUBMISSION = 'READY_FOR_SUBMISSION',
}

export interface IApplicationDocument {
  _id?: mongoose.Types.ObjectId;
  type: string;
  fileUrl: string;
}

export interface ISelectedCourse {
  _id?: mongoose.Types.ObjectId;
  courseName: string;
}

export interface IApplicationInterview {
  date: Date;
  location: string;
  stakeholders: string[];
}

export interface IApplication extends Document {
  studentId: mongoose.Types.ObjectId;
  country: ApplicationCountry;
  university: string;
  program: string;
  travelHistory: {
    hasTravelHistory: boolean;
    details?: string;
  };
  passportValid: boolean;
  financialEligible: boolean;
  consentExtension: boolean;
  medicalCondition: {
    hasCondition: boolean;
    details?: string;
  };
  registrationNumber: string;
  accommodationPreference: AccommodationPreference;
  status: ApplicationStatus;
  interview?: IApplicationInterview;
  documents: IApplicationDocument[];
  selectedCourses: ISelectedCourse[];
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationDocumentSchema = new Schema<IApplicationDocument>(
  {
    type: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const SelectedCourseSchema = new Schema<ISelectedCourse>(
  {
    courseName: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const ApplicationInterviewSchema = new Schema<IApplicationInterview>(
  {
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    stakeholders: { type: [String], default: [] },
  },
  { _id: false }
);

const ApplicationSchema = new Schema<IApplication>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    country: {
      type: String,
      enum: Object.values(ApplicationCountry),
      required: true,
    },
    university: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    travelHistory: {
      hasTravelHistory: { type: Boolean, default: false },
      details: { type: String, default: '', trim: true },
    },
    passportValid: { type: Boolean, default: false },
    financialEligible: { type: Boolean, default: false },
    consentExtension: { type: Boolean, default: false },
    medicalCondition: {
      hasCondition: { type: Boolean, default: false },
      details: { type: String, default: '', trim: true },
    },
    registrationNumber: { type: String, default: '', trim: true },
    accommodationPreference: {
      type: String,
      enum: Object.values(AccommodationPreference),
      default: AccommodationPreference.UNIVERSITY,
    },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.DRAFT,
    },
    interview: { type: ApplicationInterviewSchema, required: false },
    documents: { type: [ApplicationDocumentSchema], default: [] },
    selectedCourses: { type: [SelectedCourseSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>('Application', ApplicationSchema);
