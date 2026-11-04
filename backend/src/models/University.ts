import mongoose, { Schema, Document } from 'mongoose';

export type UniversityStatus = 'draft' | 'published';

export interface IUniversityFact {
  label: string;
  value: string;
}

export interface IUniversityProgramme {
  name: string;
  level: string;
  duration: string;
  language: string;
  credits: string;
  description: string;
}

export interface IIntakeMilestone {
  title: string;
  date: string;
  description: string;
  owner: string;
}

export interface IUniversityIntake {
  id: string;
  label: string;
  season: 'Spring' | 'Fall';
  startDate: string;
  applicationDeadline: string;
  seatsTotal: number;
  seatsTaken: number;
  milestones: IIntakeMilestone[];
}

export interface IUniversityCost {
  label: string;
  amount: string;
  note: string;
}

export interface IUniversityFacility {
  title: string;
  description: string;
  icon: string;
}

export interface IUniversityFaq {
  question: string;
  answer: string;
}

export interface IUniversity extends Document {
  name: string;
  /** Short code students' applications store as `university` (e.g. "MMU"). Unique per country. */
  shortName?: string;
  slug?: string;
  countryId: mongoose.Types.ObjectId;
  website: string;
  seatLimit: number;
  status: UniversityStatus;
  city?: string;
  region?: string;
  tagline?: string;
  image?: string;
  about: string[];
  facts: IUniversityFact[];
  highlights: string[];
  programmes: IUniversityProgramme[];
  intakes: IUniversityIntake[];
  costs: IUniversityCost[];
  facilities: IUniversityFacility[];
  accommodation: IUniversityFact[];
  requirements: string[];
  scholarships: IUniversityCost[];
  visa: { title: string; summary: string; steps: string[] };
  livingTips: IUniversityFact[];
  faqs: IUniversityFaq[];
  contact: { email: string; phone: string; address: string; website: string };
}

const factSchema = new Schema({ label: String, value: String }, { _id: false });
const costSchema = new Schema({ label: String, amount: String, note: String }, { _id: false });

const UniversitySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    website: { type: String },
    seatLimit: { type: Number, required: true },
    // Legacy documents have no status; the catalog treats anything other than "draft" as visible.
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    city: { type: String, default: '' },
    region: { type: String, default: '' },
    tagline: { type: String, default: '' },
    image: { type: String, default: '' },
    about: { type: [String], default: [] },
    facts: { type: [factSchema], default: [] },
    highlights: { type: [String], default: [] },
    programmes: {
      type: [
        new Schema(
          { name: String, level: String, duration: String, language: String, credits: String, description: String },
          { _id: false }
        ),
      ],
      default: [],
    },
    intakes: {
      type: [
        new Schema(
          {
            id: String,
            label: String,
            season: { type: String, enum: ['Spring', 'Fall'] },
            startDate: String,
            applicationDeadline: String,
            seatsTotal: Number,
            seatsTaken: { type: Number, default: 0 },
            milestones: {
              type: [new Schema({ title: String, date: String, description: String, owner: String }, { _id: false })],
              default: [],
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    costs: { type: [costSchema], default: [] },
    facilities: {
      type: [new Schema({ title: String, description: String, icon: String }, { _id: false })],
      default: [],
    },
    accommodation: { type: [factSchema], default: [] },
    requirements: { type: [String], default: [] },
    scholarships: { type: [costSchema], default: [] },
    visa: {
      title: { type: String, default: '' },
      summary: { type: String, default: '' },
      steps: { type: [String], default: [] },
    },
    livingTips: { type: [factSchema], default: [] },
    faqs: {
      type: [new Schema({ question: String, answer: String }, { _id: false })],
      default: [],
    },
    contact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      website: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUniversity>('University', UniversitySchema);
