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

export interface ICourseMatchResult extends Document {
  courseRequestId: mongoose.Types.ObjectId;
  courseRequestItemId: mongoose.Types.ObjectId;
  hostCourseId: mongoose.Types.ObjectId;
  homeCourseId: mongoose.Types.ObjectId;
  matchScore: number;
  reasoning: ICourseMatchReasoning;
  matchedBy: MatchSource;
  candidates: ICourseMatchCandidate[];
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

const CourseMatchResultSchema = new Schema<ICourseMatchResult>(
  {
    courseRequestId: { type: Schema.Types.ObjectId, ref: 'CourseRequest', required: true },
    courseRequestItemId: { type: Schema.Types.ObjectId, required: true, unique: true },
    hostCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    homeCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    reasoning: { type: CourseMatchReasoningSchema, required: true },
    matchedBy: { type: String, enum: Object.values(MatchSource), default: MatchSource.LLM },
    candidates: { type: [CourseMatchCandidateSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<ICourseMatchResult>('CourseMatchResult', CourseMatchResultSchema);
