import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseMatchReasoning {
  overlappingTopics: string[];
  missingTopics: string[];
  additionalTopics: string[];
  creditHourAssessment: string;
  summary: string;
}

export enum MatchSource {
  LLM = 'llm',
  HEURISTIC = 'heuristic',
}

/** A home course the matcher scored for this host course; the best one is paired on the request item. */
export interface ICourseMatchCandidate {
  homeCourseId: mongoose.Types.ObjectId;
  matchScore: number;
  reasoning: ICourseMatchReasoning;
}

/** A complete match of one host course against the home catalogue, from one source of host course text. */
export interface ICourseMatchSnapshot {
  homeCourseId: mongoose.Types.ObjectId;
  matchScore: number;
  reasoning: ICourseMatchReasoning;
  matchedBy: MatchSource;
  candidates: ICourseMatchCandidate[];
}

/**
 * The top-level match fields hold the preliminary match made from the host course's catalogue description.
 * `outlineMatch` holds the final match made from the outline the student uploads at the host university.
 */
export interface ICourseMatchResult extends Document {
  courseRequestId: mongoose.Types.ObjectId;
  courseRequestItemId: mongoose.Types.ObjectId;
  hostCourseId: mongoose.Types.ObjectId;
  homeCourseId: mongoose.Types.ObjectId;
  matchScore: number;
  reasoning: ICourseMatchReasoning;
  matchedBy: MatchSource;
  candidates: ICourseMatchCandidate[];
  outlineMatch?: ICourseMatchSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
}

const CourseMatchReasoningSchema = new Schema<ICourseMatchReasoning>(
  {
    overlappingTopics: [{ type: String }],
    missingTopics: [{ type: String }],
    additionalTopics: [{ type: String }],
    creditHourAssessment: { type: String, required: true },
    summary: { type: String, required: true },
  },
  { _id: false }
);

const CourseMatchCandidateSchema = new Schema<ICourseMatchCandidate>(
  {
    homeCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    reasoning: { type: CourseMatchReasoningSchema, required: true },
  },
  { _id: false }
);

const CourseMatchSnapshotSchema = new Schema<ICourseMatchSnapshot>(
  {
    homeCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    reasoning: { type: CourseMatchReasoningSchema, required: true },
    matchedBy: { type: String, enum: Object.values(MatchSource), required: true },
    candidates: { type: [CourseMatchCandidateSchema], default: [] },
  },
  { _id: false }
);

const CourseMatchResultSchema = new Schema<ICourseMatchResult>(
  {
    courseRequestId: { type: Schema.Types.ObjectId, ref: 'CourseRequest', required: true },
    courseRequestItemId: { type: Schema.Types.ObjectId, required: true, unique: true },
    hostCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    homeCourseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    matchScore: { type: Number, min: 0, max: 100 },
    reasoning: { type: CourseMatchReasoningSchema },
    matchedBy: { type: String, enum: Object.values(MatchSource), default: MatchSource.LLM },
    candidates: { type: [CourseMatchCandidateSchema], default: [] },
    outlineMatch: { type: CourseMatchSnapshotSchema, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<ICourseMatchResult>('CourseMatchResult', CourseMatchResultSchema);
