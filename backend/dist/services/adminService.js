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
exports.getAllMappings = exports.createMapping = exports.updateApplicationOfferLetter = exports.createUser = exports.getAllApplications = exports.getAllUsers = exports.createCourse = exports.createUniversity = exports.getAllStats = void 0;
const University_1 = __importDefault(require("../models/University"));
const Course_1 = __importDefault(require("../models/Course"));
const Application_1 = __importStar(require("../models/Application"));
const User_1 = __importStar(require("../models/User"));
const Country_1 = __importDefault(require("../models/Country"));
const CourseMapping_1 = __importDefault(require("../models/CourseMapping"));
const AdvisorProfile_1 = __importDefault(require("../models/AdvisorProfile"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const populateApplications = (query) => query
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
const getAllStats = async () => {
    const studentCount = await User_1.default.countDocuments({ role: 'student' });
    const applicationCount = await Application_1.default.countDocuments();
    const approvedCount = await Application_1.default.countDocuments({ status: Application_1.ApplicationStatus.SHORTLISTED });
    const pendingCount = await Application_1.default.countDocuments({ status: Application_1.ApplicationStatus.PENDING_INTERVIEW });
    // Dashboard Stats matching frontend adminStats
    const adminStats = [
        { title: 'Total Users', value: studentCount.toString(), icon: 'users', trend: '+0%', color: 'blue' },
        { title: 'Total Applications', value: applicationCount.toString(), icon: 'file-text', trend: '+0%', color: 'yellow' },
        { title: 'Approved', value: approvedCount.toString(), icon: 'check-circle', trend: '+0%', color: 'green' },
        { title: 'Pending', value: pendingCount.toString(), icon: 'clock', trend: '+0%', color: 'purple' },
    ];
    // Applications per Country matching frontend countryData
    const countries = await Country_1.default.find();
    const countryData = await Promise.all(countries.map(async (c) => {
        const apps = await Application_1.default.countDocuments({ country: c.name });
        return { name: c.name, applications: apps };
    }));
    // Monthly Trend matching frontend monthlyTrend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const monthlyTrend = months.map((month) => ({ month, apps: 0 }));
    return {
        adminStats,
        countryData,
        monthlyTrend,
    };
};
exports.getAllStats = getAllStats;
const createUniversity = async (universityData) => {
    return await University_1.default.create(universityData);
};
exports.createUniversity = createUniversity;
const createCourse = async (courseData) => {
    return await Course_1.default.create(courseData);
};
exports.createCourse = createCourse;
const getAllUsers = async () => {
    return await User_1.default.find().select('-password');
};
exports.getAllUsers = getAllUsers;
const getAllApplications = async () => populateApplications(Application_1.default.find().sort({ createdAt: -1 }));
exports.getAllApplications = getAllApplications;
const generateTemporaryPassword = () => {
    return crypto_1.default.randomBytes(6).toString('base64url');
};
const createUser = async (userData) => {
    const { name, email, password, role, phone, sapId, designation, department, experience, } = userData;
    if (!name?.trim() || !email?.trim() || !role) {
        throw new Error('Name, email, and role are required.');
    }
    const normalizedRole = role;
    const existingUser = await User_1.default.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
        throw new Error('User already exists.');
    }
    if (normalizedRole === User_1.UserRole.ADVISOR) {
        if (!designation?.trim() || !department?.trim()) {
            throw new Error('Designation and department are required for advisors.');
        }
    }
    if (normalizedRole === User_1.UserRole.STUDENT && (!phone?.trim() || !sapId?.trim())) {
        throw new Error('Phone and SAP ID are required for student accounts.');
    }
    const plainPassword = password?.trim() || generateTemporaryPassword();
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(plainPassword, salt);
    const user = await User_1.default.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: normalizedRole,
        phone: phone?.trim() || undefined,
        sapId: sapId?.trim() || undefined,
    });
    try {
        if (normalizedRole === User_1.UserRole.ADVISOR) {
            await AdvisorProfile_1.default.create({
                userId: user._id,
                designation: designation.trim(),
                department: department.trim(),
                assignedStudents: [],
                experience: typeof experience === 'number' ? experience : 0,
            });
        }
    }
    catch (error) {
        await User_1.default.findByIdAndDelete(user._id);
        throw error;
    }
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        sapId: user.sapId,
        designation: normalizedRole === User_1.UserRole.ADVISOR ? designation?.trim() : undefined,
        department: normalizedRole === User_1.UserRole.ADVISOR ? department?.trim() : undefined,
        ...(password?.trim() ? {} : { password: plainPassword }),
    };
};
exports.createUser = createUser;
const updateApplicationOfferLetter = async (applicationId, offerLetterUrl) => {
    // In the new schema, we have a separate OfferLetter model
    const OfferLetter = require('../models/OfferLetter').default;
    const application = await Application_1.default.findById(applicationId);
    if (!application)
        throw new Error('Application not found');
    const offerLetter = await OfferLetter.create({
        applicationId,
        fileUrl: offerLetterUrl,
        issuedBy: application.studentId, // Placeholder, usually an admin
    });
    await Application_1.default.findByIdAndUpdate(applicationId, { status: Application_1.ApplicationStatus.READY_FOR_SUBMISSION });
    return offerLetter;
};
exports.updateApplicationOfferLetter = updateApplicationOfferLetter;
const createMapping = async (homeCourseId, hostCourseId, applicationId) => {
    const homeCourse = await Course_1.default.findById(homeCourseId);
    const hostCourse = await Course_1.default.findById(hostCourseId);
    if (!homeCourse || !hostCourse)
        throw new Error('Course not found');
    const { calculateSimilarity } = require('../utils/similarity');
    const similarityScore = calculateSimilarity(homeCourse.name, hostCourse.name);
    return await CourseMapping_1.default.create({
        applicationId,
        homeCourseId,
        hostCourseId,
        similarityScore,
    });
};
exports.createMapping = createMapping;
const getAllMappings = async () => {
    return await CourseMapping_1.default.find().populate('homeCourseId hostCourseId');
};
exports.getAllMappings = getAllMappings;
