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
exports.ApplicationStatus = exports.AccommodationPreference = exports.ApplicationCountry = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ApplicationCountry;
(function (ApplicationCountry) {
    ApplicationCountry["MALAYSIA"] = "Malaysia";
    ApplicationCountry["SOUTH_KOREA"] = "South Korea";
    ApplicationCountry["TURKEY"] = "Turkey";
})(ApplicationCountry || (exports.ApplicationCountry = ApplicationCountry = {}));
var AccommodationPreference;
(function (AccommodationPreference) {
    AccommodationPreference["UNIVERSITY"] = "UNIVERSITY";
    AccommodationPreference["SELF"] = "SELF";
})(AccommodationPreference || (exports.AccommodationPreference = AccommodationPreference = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["DRAFT"] = "DRAFT";
    ApplicationStatus["SUBMITTED"] = "SUBMITTED";
    ApplicationStatus["PENDING_INTERVIEW"] = "PENDING_INTERVIEW";
    ApplicationStatus["INTERVIEW_SCHEDULED"] = "INTERVIEW_SCHEDULED";
    ApplicationStatus["SHORTLISTED"] = "SHORTLISTED";
    ApplicationStatus["REJECTED"] = "REJECTED";
    ApplicationStatus["DOCUMENT_PENDING"] = "DOCUMENT_PENDING";
    ApplicationStatus["COURSE_SELECTION_PENDING"] = "COURSE_SELECTION_PENDING";
    ApplicationStatus["READY_FOR_SUBMISSION"] = "READY_FOR_SUBMISSION";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
const ApplicationDocumentSchema = new mongoose_1.Schema({
    type: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
}, { _id: true });
const SelectedCourseSchema = new mongoose_1.Schema({
    courseName: { type: String, required: true, trim: true },
}, { _id: true });
const ApplicationInterviewSchema = new mongoose_1.Schema({
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    stakeholders: { type: [String], default: [] },
}, { _id: false });
const ApplicationSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    advisorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('Application', ApplicationSchema);
