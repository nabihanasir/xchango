"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const TranscriptCourseSchema = new mongoose_1.Schema({
    courseName: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    creditHours: { type: Number, required: true, min: 0 },
    gradePoints: { type: Number, required: true, min: 0 },
}, { _id: false });
const TranscriptSemesterSchema = new mongoose_1.Schema({
    semester: { type: Number, required: true, min: 0 },
    sgpa: { type: Number, default: 0, min: 0 },
    courses: { type: [TranscriptCourseSchema], default: [] },
}, { _id: false });
const StudentProfileSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    registrationNumber: { type: String, default: '', trim: true },
    program: { type: String, default: '', trim: true },
    semester: { type: String, default: '', trim: true },
    cgpa: { type: Number, default: 0, min: 0 },
    isProfileComplete: { type: Boolean, default: false },
    profileCompletionIssues: { type: [String], default: [] },
    basicInfo: {
        fullName: { type: String, default: '', trim: true },
        cmsId: { type: String, default: '', trim: true },
        email: { type: String, default: '', trim: true },
        phone: { type: String, default: '', trim: true },
        department: { type: String, default: '', trim: true },
        semester: { type: Number, default: 1, min: 0 },
    },
    preferences: {
        preferredCountries: { type: [String], default: [] },
        degreeLevel: { type: String, default: '', trim: true },
        fieldOfInterest: { type: String, default: '', trim: true },
        intake: { type: String, default: '', trim: true },
    },
    transcript: {
        fileUrl: { type: String, default: '', trim: true },
        cgpa: { type: Number, default: 0, min: 0 },
        totalCredits: { type: Number, default: 0, min: 0 },
        semesters: { type: [TranscriptSemesterSchema], default: [] },
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model('StudentProfile', StudentProfileSchema);
