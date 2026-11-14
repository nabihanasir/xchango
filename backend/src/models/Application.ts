import mongoose, { Document, Schema } from 'mongoose';

export enum AccommodationPreference {
  UNIVERSITY = 'UNIVERSITY',
  SELF = 'SELF',
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  PENDING_INTERVIEW = 'PENDING_INTERVIEW',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED',
  COURSE_REQUEST_ENABLED = 'COURSE_REQUEST_ENABLED',
  SHORTLISTED = 'SHORTLISTED',
  REJECTED = 'REJECTED',
  DOCUMENT_PENDING = 'DOCUMENT_PENDING',
  COURSE_SELECTION_PENDING = 'COURSE_SELECTION_PENDING',
  READY_FOR_SUBMISSION = 'READY_FOR_SUBMISSION',
  COMPLETED = 'COMPLETED',
}

export interface IApplicationDocument {
  _id?: mongoose.Types.ObjectId;
  type: string;
  fileUrl: string;
}

export interface ISelectedCourse {
  _id?: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  advisorComment: string;
}

export interface IAIRecommendation {
  _id?: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  matchScore: number;
  reason: string;
}

export interface IApplicationInterview {
  date: Date;
  location: string;
  stakeholders: string[];
  /** 30 or 60. Absent on interviews scheduled before slot booking existed. */
  durationMinutes?: number;
}

export type InterviewRequestStatus = 'requested' | 'accepted' | 'declined' | 'cancelled';

/** The student's chosen slot. Held for the advisor while 'requested' or 'accepted'. */
export interface IInterviewRequest {
  start: Date;
  durationMinutes: number;
  status: InterviewRequestStatus;
  requestedAt: Date;
  respondedAt?: Date;
  /** Advisor's note when declining. */
  note?: string;
  cancelledBy?: 'student' | 'advisor';
  cancelReason?: string;
  cancelDetails?: string;
}

export interface IInterviewDecision {
  recommended: boolean;
  notes: string;
  decidedAt: Date;
  decidedBy: mongoose.Types.ObjectId;
}

export interface IArrivalNotice {
  email: string;
  name: string;
  courses: string[];
  /** 'host' = teaches at the host university, 'home' = teaches an online course from the home university. */
  side: 'host' | 'home';
  sent: boolean;
}

export interface IArrival {
  arrivedAt: Date;
  recordedAt: Date;
  recordedBy: mongoose.Types.ObjectId;
  onlineHomeCourses: mongoose.Types.ObjectId[];
  notices: IArrivalNotice[];
}

/** The student's own "I have arrived" report. The advisor still confirms it by recording the arrival. */
export interface IArrivalReport {
  reportedAt: Date;
}

export interface IApplication extends Document {
  studentId: mongoose.Types.ObjectId;
  advisorId?: mongoose.Types.ObjectId;
  country: string;
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
  semesterEndDate?: Date;
  interviewDate?: Date;
  interview?: IApplicationInterview;
  interviewRequest?: IInterviewRequest;
  interviewDecision?: IInterviewDecision;
  arrival?: IArrival;
  arrivalReport?: IArrivalReport;
  documents: IApplicationDocument[];
  selectedCourses: ISelectedCourse[];
  aiRecommendations: IAIRecommendation[];
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
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    advisorComment: { type: String, default: '', trim: true },
  },
  { _id: true }
);

const AIRecommendationSchema = new Schema<IAIRecommendation>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    reason: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const ApplicationInterviewSchema = new Schema<IApplicationInterview>(
  {
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    stakeholders: { type: [String], default: [] },
    durationMinutes: { type: Number, enum: [30, 60], required: false },
  },
  { _id: false }
);

const InterviewRequestSchema = new Schema<IInterviewRequest>(
  {
    start: { type: Date, required: true },
    durationMinutes: { type: Number, enum: [30, 60], required: true },
    status: { type: String, enum: ['requested', 'accepted', 'declined', 'cancelled'], required: true },
    requestedAt: { type: Date, required: true },
    respondedAt: { type: Date },
    note: { type: String, trim: true },
    cancelledBy: { type: String, enum: ['student', 'advisor'] },
    cancelReason: { type: String, trim: true },
    cancelDetails: { type: String, trim: true },
  },
  { _id: false }
);

const InterviewDecisionSchema = new Schema<IInterviewDecision>(
  {
    recommended: { type: Boolean, required: true },
    notes: { type: String, default: '', trim: true },
    decidedAt: { type: Date, required: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const ArrivalNoticeSchema = new Schema<IArrivalNotice>(
  {
    email: { type: String, required: true, trim: true },
    name: { type: String, default: '', trim: true },
    courses: { type: [String], default: [] },
    side: { type: String, enum: ['host', 'home'], required: true },
    sent: { type: Boolean, default: false },
  },
  { _id: false }
);

const ArrivalSchema = new Schema<IArrival>(
  {
    arrivedAt: { type: Date, required: true },
    recordedAt: { type: Date, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    onlineHomeCourses: { type: [Schema.Types.ObjectId], ref: 'Course', default: [] },
    notices: { type: [ArrivalNoticeSchema], default: [] },
  },
  { _id: false }
);

const ArrivalReportSchema = new Schema<IArrivalReport>(
  {
    reportedAt: { type: Date, required: true },
  },
  { _id: false }
);

const ApplicationSchema = new Schema<IApplication>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    advisorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    country: {
      type: String,
      required: true,
      trim: true,
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
    semesterEndDate: { type: Date, required: false },
    interviewDate: { type: Date, required: false },
    interview: { type: ApplicationInterviewSchema, required: false },
    interviewRequest: { type: InterviewRequestSchema, required: false },
    interviewDecision: { type: InterviewDecisionSchema, required: false },
    arrival: { type: ArrivalSchema, required: false },
    arrivalReport: { type: ArrivalReportSchema, required: false },
    documents: { type: [ApplicationDocumentSchema], default: [] },
    selectedCourses: { type: [SelectedCourseSchema], default: [] },
    aiRecommendations: { type: [AIRecommendationSchema], default: [] },
  },
  { timestamps: true }
);

// Backstop for the "one open application per student" rule, so two simultaneous requests cannot both succeed.
// Rejected and completed applications are closed and are left out of the index.
ApplicationSchema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: Object.values(ApplicationStatus).filter(
          (status) => status !== ApplicationStatus.REJECTED && status !== ApplicationStatus.COMPLETED
        ),
      },
    },
  }
);

// Every status change is written to the application's timeline so the student can see the history.
const recordTimeline = (applicationId: unknown, status: unknown) =>
  mongoose
    .model('ApplicationTimeline')
    .create({ applicationId, status: String(status), timestamp: new Date() })
    .catch(() => undefined);

ApplicationSchema.pre('save', function () {
  (this as any).$locals.statusChanged = this.isNew || this.isModified('status');
});

ApplicationSchema.post('save', async function (doc) {
  if ((doc as any).$locals?.statusChanged) {
    await recordTimeline(doc._id, doc.status);
  }
});

// Updates made with findOneAndUpdate / findByIdAndUpdate bypass save(), so catch status changes there too.
ApplicationSchema.post('findOneAndUpdate', async function (doc: any) {
  const update: any = this.getUpdate() || {};
  const status = update.status ?? update.$set?.status;
  if (doc && status) {
    await recordTimeline(doc._id, status);
  }
});

export default mongoose.model<IApplication>('Application', ApplicationSchema);
