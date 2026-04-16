"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTranscript = exports.saveTranscript = exports.updateStudentProfile = exports.getStudentProfile = exports.ensureStudentProfile = exports.checkProfileCompletion = void 0;
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../errors/AppError");
const buildDefaultProfile = (user) => ({
    userId: user._id,
    registrationNumber: user.sapId || '',
    program: '',
    semester: '1',
    cgpa: 0,
    isProfileComplete: false,
    profileCompletionIssues: [],
    basicInfo: {
        fullName: user.name || '',
        cmsId: user.sapId || '',
        email: user.email || '',
        phone: user.phone || '',
        department: '',
        semester: 1,
    },
    preferences: {
        preferredCountries: [],
        degreeLevel: '',
        fieldOfInterest: '',
        intake: '',
    },
    transcript: {
        fileUrl: '',
        cgpa: 0,
        totalCredits: 0,
        semesters: [],
    },
});
const ensureProfileShape = (profile) => {
    const basicInfo = profile.basicInfo;
    profile.basicInfo = {
        fullName: basicInfo?.fullName ?? '',
        cmsId: basicInfo?.cmsId ?? '',
        email: basicInfo?.email ?? '',
        phone: basicInfo?.phone ?? '',
        department: basicInfo?.department ?? '',
        semester: basicInfo?.semester ?? 1,
    };
    const preferences = profile.preferences;
    profile.preferences = {
        preferredCountries: preferences?.preferredCountries ?? [],
        degreeLevel: preferences?.degreeLevel ?? '',
        fieldOfInterest: preferences?.fieldOfInterest ?? '',
        intake: preferences?.intake ?? '',
    };
    const transcript = profile.transcript;
    profile.transcript = {
        fileUrl: transcript?.fileUrl ?? '',
        cgpa: transcript?.cgpa ?? 0,
        totalCredits: transcript?.totalCredits ?? 0,
        semesters: transcript?.semesters ?? [],
    };
};
const syncProfileWithLegacyFields = (profile) => {
    ensureProfileShape(profile);
    profile.registrationNumber = profile.basicInfo.cmsId || profile.registrationNumber || '';
    profile.program = profile.basicInfo.department || profile.program || '';
    profile.semester = profile.basicInfo.semester ? String(profile.basicInfo.semester) : profile.semester || '';
    profile.cgpa = profile.transcript.cgpa || 0;
};
const checkProfileCompletion = (profile) => {
    ensureProfileShape(profile);
    const missingFields = [];
    if (!profile.basicInfo.fullName.trim())
        missingFields.push('name');
    if (!profile.basicInfo.email.trim())
        missingFields.push('email');
    if (!profile.basicInfo.phone.trim())
        missingFields.push('phone');
    if (!profile.basicInfo.cmsId.trim())
        missingFields.push('registration number');
    if (!profile.basicInfo.department.trim())
        missingFields.push('program');
    if (!profile.preferences.degreeLevel.trim())
        missingFields.push('degree level');
    if (!profile.preferences.fieldOfInterest.trim())
        missingFields.push('field of interest');
    if (!profile.preferences.intake.trim())
        missingFields.push('intake');
    if (!profile.preferences.preferredCountries.length)
        missingFields.push('preferred countries');
    if (!profile.transcript.fileUrl.trim())
        missingFields.push('transcript');
    if ((profile.transcript.cgpa || 0) <= 0)
        missingFields.push('CGPA');
    return {
        isComplete: missingFields.length === 0,
        missingFields,
    };
};
exports.checkProfileCompletion = checkProfileCompletion;
const applyProfileCompletion = (profile) => {
    const completion = (0, exports.checkProfileCompletion)(profile);
    profile.isProfileComplete = completion.isComplete;
    profile.profileCompletionIssues = completion.missingFields;
};
const hydrateProfileFromUser = (profile, user) => {
    ensureProfileShape(profile);
    profile.basicInfo.fullName = profile.basicInfo.fullName || user.name || '';
    profile.basicInfo.email = profile.basicInfo.email || user.email || '';
    profile.basicInfo.phone = profile.basicInfo.phone || user.phone || '';
    profile.basicInfo.cmsId = profile.basicInfo.cmsId || user.sapId || '';
    syncProfileWithLegacyFields(profile);
};
const ensureStudentProfile = async (userId) => {
    const user = await User_1.default.findById(userId).select('-password');
    if (!user) {
        throw new AppError_1.NotFoundError('Student not found.', 'No student account exists for the requested profile.', 'Verify the student account and try again.', 'STUDENT_NOT_FOUND');
    }
    let profile = await StudentProfile_1.default.findOne({ userId });
    if (!profile) {
        profile = await StudentProfile_1.default.create(buildDefaultProfile(user));
        applyProfileCompletion(profile);
        await profile.save();
    }
    else {
        hydrateProfileFromUser(profile, user);
        applyProfileCompletion(profile);
        await profile.save();
    }
    return profile;
};
exports.ensureStudentProfile = ensureStudentProfile;
const getStudentProfile = async (userId) => (0, exports.ensureStudentProfile)(userId);
exports.getStudentProfile = getStudentProfile;
const updateStudentProfile = async (userId, profileData) => {
    const profile = await (0, exports.ensureStudentProfile)(userId);
    if (profileData.basicInfo) {
        profile.basicInfo = {
            ...profile.basicInfo,
            ...profileData.basicInfo,
        };
    }
    if (profileData.preferences) {
        profile.preferences = {
            ...profile.preferences,
            ...profileData.preferences,
        };
    }
    syncProfileWithLegacyFields(profile);
    applyProfileCompletion(profile);
    await profile.save();
    return profile;
};
exports.updateStudentProfile = updateStudentProfile;
const saveTranscript = async (userId, transcriptData) => {
    const profile = await (0, exports.ensureStudentProfile)(userId);
    profile.transcript = transcriptData;
    syncProfileWithLegacyFields(profile);
    applyProfileCompletion(profile);
    await profile.save();
    return profile.transcript;
};
exports.saveTranscript = saveTranscript;
const getTranscript = async (userId) => {
    const profile = await (0, exports.ensureStudentProfile)(userId);
    return profile.transcript;
};
exports.getTranscript = getTranscript;
