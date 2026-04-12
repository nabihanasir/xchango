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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisorCanAccessStudent = exports.updateCourseDecision = exports.getAiRecommendations = exports.generateAiRecommendations = exports.selectCourses = exports.listAvailableCourses = exports.uploadDocuments = exports.updateStatus = exports.scheduleInterview = exports.assignAdvisor = exports.submitApplication = exports.getAdvisorApplications = exports.getStudentApplications = exports.getApplicationById = exports.updateApplicationStep = exports.createApplication = exports.applicationOptions = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Application_1 = __importStar(require("../models/Application"));
const User_1 = __importStar(require("../models/User"));
const AdvisorProfile_1 = __importDefault(require("../models/AdvisorProfile"));
const Course_1 = __importStar(require("../models/Course"));
const University_1 = __importDefault(require("../models/University"));
const studentService_1 = require("./studentService");
const aiRecommendation_service_1 = require("./aiRecommendation.service");
exports.applicationOptions = {
    [Application_1.ApplicationCountry.MALAYSIA]: ['MMU', 'UTHM'],
    [Application_1.ApplicationCountry.SOUTH_KOREA]: ['KDU'],
    [Application_1.ApplicationCountry.TURKEY]: ['GTU'],
};
const accessibleStatusesForCourseWork = [
    Application_1.ApplicationStatus.SHORTLISTED,
    Application_1.ApplicationStatus.DOCUMENT_PENDING,
    Application_1.ApplicationStatus.COURSE_SELECTION_PENDING,
    Application_1.ApplicationStatus.READY_FOR_SUBMISSION,
];
const normalizeText = (value) => value?.trim().toLowerCase() || '';
const ensureObjectId = (value, message) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
        throw new Error(message);
    }
};
const ensureApplicationAccess = (application, studentId) => {
    if (!application) {
        throw new Error('Application not found.');
    }
    if (application.studentId.toString() !== studentId) {
        throw new Error('You are not authorized to access this application.');
    }
    return application;
};
const ensureApplicationExists = (application) => {
    if (!application) {
        throw new Error('Application not found.');
    }
    return application;
};
const ensureAdvisorOwnsApplication = (application, advisorId) => {
    if (!application.advisorId || application.advisorId.toString() !== advisorId) {
        throw new Error('You are not authorized to access this application.');
    }
    return application;
};
const ensureCourseWorkStatus = (application) => {
    if (!accessibleStatusesForCourseWork.includes(application.status)) {
        throw new Error('Course decisions are only available after the application has been shortlisted.');
    }
    return application;
};
const populateApplication = (query) => {
    return query
        .populate('studentId', 'name email sapId phone role')
        .populate('advisorId', 'name email role')
        .populate({
        path: 'selectedCourses.course',
        select: 'name code description outlineText creditHours type universityId',
        populate: {
            path: 'universityId',
            select: 'name',
        },
    })
        .populate({
        path: 'aiRecommendations.course',
        select: 'name code description outlineText creditHours type universityId',
        populate: {
            path: 'universityId',
            select: 'name',
        },
    });
};
const validateUniversitySelection = (country, university) => {
    const supportedUniversities = exports.applicationOptions[country];
    if (!supportedUniversities) {
        throw new Error('Selected country is not supported.');
    }
    if (!supportedUniversities.includes(university)) {
        throw new Error('Selected university is not available for the chosen country.');
    }
};
const validateMedicalCondition = (input) => {
    if (input?.hasCondition && !input.details?.trim()) {
        throw new Error('Medical condition details are required.');
    }
};
const validateTravelHistory = (input) => {
    if (input?.hasTravelHistory && !input.details?.trim()) {
        throw new Error('Travel history details are required.');
    }
};
const calculatePostShortlistStatus = (application) => {
    const hasDocuments = application.documents.length > 0;
    const hasSelectedCourses = application.selectedCourses.length > 0;
    if (hasDocuments && hasSelectedCourses) {
        return Application_1.ApplicationStatus.READY_FOR_SUBMISSION;
    }
    if (hasDocuments) {
        return Application_1.ApplicationStatus.DOCUMENT_PENDING;
    }
    if (hasSelectedCourses) {
        return Application_1.ApplicationStatus.COURSE_SELECTION_PENDING;
    }
    return Application_1.ApplicationStatus.SHORTLISTED;
};
const applyStepInput = (application, input) => {
    if (input.country) {
        application.country = input.country;
    }
    if (input.university) {
        const country = input.country || application.country;
        validateUniversitySelection(country, input.university);
        application.university = input.university;
    }
    if (input.program) {
        application.program = input.program;
    }
    if (input.travelHistory) {
        validateTravelHistory(input.travelHistory);
        application.travelHistory = {
            hasTravelHistory: input.travelHistory.hasTravelHistory,
            details: input.travelHistory.details?.trim() || '',
        };
    }
    if (typeof input.passportValid === 'boolean') {
        application.passportValid = input.passportValid;
    }
    if (typeof input.financialEligible === 'boolean') {
        application.financialEligible = input.financialEligible;
    }
    if (typeof input.consentExtension === 'boolean') {
        application.consentExtension = input.consentExtension;
    }
    if (input.medicalCondition) {
        validateMedicalCondition(input.medicalCondition);
        application.medicalCondition = {
            hasCondition: input.medicalCondition.hasCondition,
            details: input.medicalCondition.details?.trim() || '',
        };
    }
    if (typeof input.registrationNumber === 'string') {
        application.registrationNumber = input.registrationNumber.trim();
    }
    if (input.accommodationPreference) {
        application.accommodationPreference = input.accommodationPreference;
    }
};
const validateSubmission = (application) => {
    if (!application.country || !application.university || !application.program) {
        throw new Error('Country, university, and program are required before submission.');
    }
    validateUniversitySelection(application.country, application.university);
    validateTravelHistory(application.travelHistory);
    validateMedicalCondition(application.medicalCondition);
    if (!application.registrationNumber.trim()) {
        throw new Error('Registration number is required before submission.');
    }
    if (!application.passportValid) {
        throw new Error('A valid passport is required before submission.');
    }
};
const buildSubmissionWarnings = (application) => {
    const warnings = [];
    if (!application.financialEligible) {
        warnings.push('Financial eligibility is flagged for advisor review.');
    }
    return warnings;
};
const buildRecommendationStudentProfile = async (application) => {
    const profile = await (0, studentService_1.ensureStudentProfile)(application.studentId.toString());
    const transcriptCourseNames = profile.transcript.semesters.flatMap((semester) => semester.courses.map((course) => course.courseName));
    return {
        degreeLevel: profile.preferences.degreeLevel,
        background: [
            profile.program,
            profile.basicInfo.department,
            application.program,
            profile.registrationNumber ? `Registration ${profile.registrationNumber}` : '',
        ]
            .filter(Boolean)
            .join(' '),
        gpa: profile.cgpa || profile.transcript.cgpa || 0,
        interests: [
            profile.preferences.fieldOfInterest,
            ...profile.preferences.preferredCountries,
            application.program,
        ].filter(Boolean),
        transcriptCourses: transcriptCourseNames,
        targetProgram: application.program,
    };
};
const getAvailableCoursesForApplication = async (application) => {
    const applicationUniversity = normalizeText(application.university);
    const universities = await University_1.default.find().populate('countryId', 'name');
    const exactUniversityIds = universities
        .filter((university) => normalizeText(university.name) === applicationUniversity)
        .map((university) => university._id);
    const countryUniversityIds = universities
        .filter((university) => normalizeText(university.countryId?.name) === normalizeText(application.country))
        .map((university) => university._id);
    const preferredUniversityIds = exactUniversityIds.length ? exactUniversityIds : countryUniversityIds;
    const preferredCourses = await Course_1.default.find({
        type: Course_1.CourseType.HOST,
        ...(preferredUniversityIds.length ? { universityId: { $in: preferredUniversityIds } } : {}),
    })
        .populate('universityId', 'name')
        .sort({ code: 1, name: 1 });
    if (preferredCourses.length) {
        return preferredCourses;
    }
    return Course_1.default.find({ type: Course_1.CourseType.HOST })
        .populate('universityId', 'name')
        .sort({ code: 1, name: 1 });
};
const createApplication = async (studentId, payload) => {
    if (!payload.country || !payload.university || !payload.program) {
        throw new Error('country, university, and program are required.');
    }
    validateUniversitySelection(payload.country, payload.university);
    validateTravelHistory(payload.travelHistory);
    validateMedicalCondition(payload.medicalCondition);
    return Application_1.default.create({
        studentId,
        country: payload.country,
        university: payload.university,
        program: payload.program,
        travelHistory: {
            hasTravelHistory: payload.travelHistory?.hasTravelHistory || false,
            details: payload.travelHistory?.details?.trim() || '',
        },
        passportValid: payload.passportValid || false,
        financialEligible: payload.financialEligible || false,
        consentExtension: payload.consentExtension || false,
        medicalCondition: {
            hasCondition: payload.medicalCondition?.hasCondition || false,
            details: payload.medicalCondition?.details?.trim() || '',
        },
        registrationNumber: payload.registrationNumber?.trim() || '',
        accommodationPreference: payload.accommodationPreference || Application_1.AccommodationPreference.UNIVERSITY,
        status: Application_1.ApplicationStatus.DRAFT,
        documents: [],
        selectedCourses: [],
        aiRecommendations: [],
    });
};
exports.createApplication = createApplication;
const updateApplicationStep = async (applicationId, studentId, payload) => {
    const application = ensureApplicationAccess(await Application_1.default.findById(applicationId), studentId);
    if (application.status === Application_1.ApplicationStatus.REJECTED) {
        throw new Error('Rejected applications cannot be modified.');
    }
    applyStepInput(application, payload);
    await application.save();
    return application;
};
exports.updateApplicationStep = updateApplicationStep;
const getApplicationById = async (applicationId, actor) => {
    const application = ensureApplicationExists(await populateApplication(Application_1.default.findById(applicationId)));
    if (actor.role === User_1.UserRole.ADMIN) {
        return application;
    }
    if (actor.role === User_1.UserRole.STUDENT) {
        return ensureApplicationAccess(application, actor._id);
    }
    if (actor.role === User_1.UserRole.ADVISOR) {
        return ensureAdvisorOwnsApplication(application, actor._id);
    }
    throw new Error('You are not authorized to access this application.');
};
exports.getApplicationById = getApplicationById;
const getStudentApplications = async (studentId) => populateApplication(Application_1.default.find({ studentId }).sort({ createdAt: -1 }));
exports.getStudentApplications = getStudentApplications;
const getAdvisorApplications = async (advisorId) => populateApplication(Application_1.default.find({ advisorId }).sort({ createdAt: -1 }));
exports.getAdvisorApplications = getAdvisorApplications;
const submitApplication = async (applicationId, studentId) => {
    const application = ensureApplicationAccess(await Application_1.default.findById(applicationId), studentId);
    validateSubmission(application);
    application.status = Application_1.ApplicationStatus.PENDING_INTERVIEW;
    await application.save();
    return {
        application,
        warnings: buildSubmissionWarnings(application),
    };
};
exports.submitApplication = submitApplication;
const assignAdvisor = async (applicationId, advisorId) => {
    const application = ensureApplicationExists(await Application_1.default.findById(applicationId));
    const advisor = await User_1.default.findById(advisorId);
    if (!advisor || advisor.role !== User_1.UserRole.ADVISOR) {
        throw new Error('Advisor not found.');
    }
    application.advisorId = advisor._id;
    application.status = Application_1.ApplicationStatus.PENDING_INTERVIEW;
    await application.save();
    const assignedStudentIds = await Application_1.default.distinct('studentId', { advisorId });
    await AdvisorProfile_1.default.findOneAndUpdate({ userId: advisorId }, { assignedStudents: assignedStudentIds });
    return (0, exports.getApplicationById)(applicationId, { _id: advisorId, role: User_1.UserRole.ADVISOR });
};
exports.assignAdvisor = assignAdvisor;
const scheduleInterview = async (applicationId, advisorId, interview) => {
    const application = ensureAdvisorOwnsApplication(ensureApplicationExists(await Application_1.default.findById(applicationId)), advisorId);
    if (![Application_1.ApplicationStatus.PENDING_INTERVIEW, Application_1.ApplicationStatus.INTERVIEW_SCHEDULED].includes(application.status)) {
        throw new Error('Only applications pending interview can be scheduled.');
    }
    application.interview = interview;
    application.status = Application_1.ApplicationStatus.INTERVIEW_SCHEDULED;
    await application.save();
    return (0, exports.getApplicationById)(applicationId, { _id: advisorId, role: User_1.UserRole.ADVISOR });
};
exports.scheduleInterview = scheduleInterview;
const updateStatus = async (applicationId, advisorId, status) => {
    const application = ensureAdvisorOwnsApplication(ensureApplicationExists(await Application_1.default.findById(applicationId)), advisorId);
    if (![Application_1.ApplicationStatus.SHORTLISTED, Application_1.ApplicationStatus.REJECTED].includes(status)) {
        throw new Error('Only shortlist or reject decisions are supported here.');
    }
    if (![Application_1.ApplicationStatus.PENDING_INTERVIEW, Application_1.ApplicationStatus.INTERVIEW_SCHEDULED].includes(application.status)) {
        throw new Error('The application is not ready for an advisor decision.');
    }
    application.status = status;
    await application.save();
    return (0, exports.getApplicationById)(applicationId, { _id: advisorId, role: User_1.UserRole.ADVISOR });
};
exports.updateStatus = updateStatus;
const uploadDocuments = async (applicationId, studentId, documents) => {
    const application = ensureApplicationAccess(await Application_1.default.findById(applicationId), studentId);
    if (!accessibleStatusesForCourseWork.includes(application.status)) {
        throw new Error('Documents can only be uploaded after shortlisting.');
    }
    application.documents.push(...documents);
    application.status = calculatePostShortlistStatus(application);
    await application.save();
    return (0, exports.getApplicationById)(applicationId, { _id: studentId, role: User_1.UserRole.STUDENT });
};
exports.uploadDocuments = uploadDocuments;
const listAvailableCourses = async (applicationId, actor) => {
    const application = await (0, exports.getApplicationById)(applicationId, actor);
    return getAvailableCoursesForApplication(application);
};
exports.listAvailableCourses = listAvailableCourses;
const selectCourses = async (applicationId, studentId, courseIds) => {
    const application = ensureApplicationAccess(await Application_1.default.findById(applicationId), studentId);
    if (!accessibleStatusesForCourseWork.includes(application.status)) {
        throw new Error('Courses can only be selected after shortlisting.');
    }
    const normalizedIds = Array.from(new Set(courseIds
        .map((courseId) => courseId?.trim())
        .filter(Boolean)));
    normalizedIds.forEach((courseId) => ensureObjectId(courseId, 'One or more selected course IDs are invalid.'));
    const availableCourses = await getAvailableCoursesForApplication(application);
    const availableCourseIds = new Set(availableCourses.map((course) => course._id.toString()));
    normalizedIds.forEach((courseId) => {
        if (!availableCourseIds.has(courseId)) {
            throw new Error('One or more selected courses are not available for this application.');
        }
    });
    application.selectedCourses = normalizedIds.map((courseId) => ({
        course: new mongoose_1.default.Types.ObjectId(courseId),
        status: 'pending',
        advisorComment: '',
    }));
    application.status = calculatePostShortlistStatus(application);
    await application.save();
    return (0, exports.getApplicationById)(applicationId, { _id: studentId, role: User_1.UserRole.STUDENT });
};
exports.selectCourses = selectCourses;
const generateAiRecommendations = async (applicationId, advisorId) => {
    const application = ensureCourseWorkStatus(ensureAdvisorOwnsApplication(ensureApplicationExists(await Application_1.default.findById(applicationId)), advisorId));
    const [studentProfile, availableCourses] = await Promise.all([
        buildRecommendationStudentProfile(application),
        getAvailableCoursesForApplication(application),
    ]);
    const recommendations = (0, aiRecommendation_service_1.getCourseRecommendations)(studentProfile, availableCourses);
    application.aiRecommendations = recommendations.map((recommendation) => ({
        course: recommendation.courseId,
        matchScore: recommendation.matchScore,
        reason: recommendation.reason,
    }));
    await application.save();
    return (0, exports.getApplicationById)(applicationId, { _id: advisorId, role: User_1.UserRole.ADVISOR });
};
exports.generateAiRecommendations = generateAiRecommendations;
const getAiRecommendations = async (applicationId, advisorId) => {
    const application = ensureAdvisorOwnsApplication(ensureApplicationExists(await populateApplication(Application_1.default.findById(applicationId))), advisorId);
    return application.aiRecommendations;
};
exports.getAiRecommendations = getAiRecommendations;
const updateCourseDecision = async (applicationId, advisorId, payload) => {
    ensureObjectId(payload.courseId, 'Invalid course ID.');
    const application = ensureCourseWorkStatus(ensureAdvisorOwnsApplication(ensureApplicationExists(await Application_1.default.findById(applicationId)), advisorId));
    const selectedCourse = application.selectedCourses.find((courseItem) => courseItem.course.toString() === payload.courseId);
    if (!selectedCourse) {
        throw new Error('The selected course was not found on this application.');
    }
    selectedCourse.status = payload.status;
    selectedCourse.advisorComment = payload.advisorComment?.trim() || '';
    await application.save();
    return (0, exports.getApplicationById)(applicationId, { _id: advisorId, role: User_1.UserRole.ADVISOR });
};
exports.updateCourseDecision = updateCourseDecision;
const advisorCanAccessStudent = async (advisorId, studentId) => {
    const application = await Application_1.default.exists({ advisorId, studentId });
    return Boolean(application);
};
exports.advisorCanAccessStudent = advisorCanAccessStudent;
