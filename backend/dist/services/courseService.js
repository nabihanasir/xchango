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
exports.seedDemoHomeCoursesIfNeeded = exports.deleteHomeCourse = exports.updateHomeCourse = exports.createHomeCourse = exports.getCourseById = exports.listHomeCourses = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Course_1 = __importStar(require("../models/Course"));
const User_1 = __importStar(require("../models/User"));
const AppError_1 = require("../errors/AppError");
const DEMO_ADMIN_EMAIL = 'admin@xchango.com';
const DEMO_ADMIN_PASSWORD = 'Admin@123';
const DEMO_HOME_COURSES = [
    {
        title: 'Data Structures',
        description: 'Introduction to arrays, linked lists, trees, heaps, hashing, and graph fundamentals.',
        creditHours: 3,
    },
    {
        title: 'Database Systems',
        description: 'Relational design, SQL, transactions, normalization, indexing, and query optimization.',
        creditHours: 3,
    },
    {
        title: 'Operating Systems',
        description: 'Processes, threads, memory management, synchronization, scheduling, and file systems.',
        creditHours: 4,
    },
    {
        title: 'Artificial Intelligence',
        description: 'Search, knowledge representation, basic machine learning, and intelligent systems.',
        creditHours: 3,
    },
    {
        title: 'Software Engineering',
        description: 'Requirements, design, testing, version control, and team-based software delivery.',
        creditHours: 3,
    },
    {
        title: 'Computer Networks',
        description: 'Network models, routing, protocols, transport, and practical internet architecture.',
        creditHours: 3,
    },
    {
        title: 'Human Computer Interaction',
        description: 'User-centered design, usability, accessibility, and interface evaluation.',
        creditHours: 3,
    },
];
const normalizeTitle = (value) => value?.trim() || '';
const validateCourseInput = (payload) => {
    const title = normalizeTitle(payload.title);
    const creditHours = Number(payload.creditHours);
    if (!title) {
        throw new AppError_1.ValidationError('Title is required.', 'The course title was not provided.', 'Enter a course title and try again.', 'COURSE_TITLE_REQUIRED');
    }
    if (!Number.isFinite(creditHours) || creditHours <= 0) {
        throw new AppError_1.ValidationError('Credit hours must be greater than zero.', 'The course credit hours value is invalid.', 'Enter a positive credit hour value and try again.', 'COURSE_CREDIT_HOURS_INVALID');
    }
    return { title, creditHours };
};
const populateCourse = (query) => query.populate('createdBy', 'name email role');
const ensureAdminUser = async () => {
    const existingAdmin = await User_1.default.findOne({ role: User_1.UserRole.ADMIN }).sort({ createdAt: 1 });
    if (existingAdmin) {
        return existingAdmin;
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const password = await bcryptjs_1.default.hash(DEMO_ADMIN_PASSWORD, salt);
    return User_1.default.create({
        name: 'System Admin',
        email: DEMO_ADMIN_EMAIL,
        password,
        role: User_1.UserRole.ADMIN,
        phone: '+92-300-0000001',
        sapId: 'ADM0001',
        isActive: true,
    });
};
const listHomeCourses = async () => populateCourse(Course_1.default.find({ $or: [{ isHomeCourse: true }, { type: Course_1.CourseType.HOME }] }).sort({ title: 1, name: 1 }));
exports.listHomeCourses = listHomeCourses;
const getCourseById = async (courseId) => {
    const course = await populateCourse(Course_1.default.findById(courseId));
    if (!course) {
        throw new AppError_1.NotFoundError('Course not found.', 'No course exists for the provided identifier.', 'Verify the course id and try again.', 'COURSE_NOT_FOUND');
    }
    return course;
};
exports.getCourseById = getCourseById;
const createHomeCourse = async (adminId, payload) => {
    const admin = await User_1.default.findById(adminId);
    if (!admin || admin.role !== User_1.UserRole.ADMIN) {
        throw new AppError_1.ForbiddenError('Access denied.', 'Only administrators can create home courses.', 'Sign in with an administrator account and try again.', 'ROLE_NOT_ALLOWED');
    }
    const { title, creditHours } = validateCourseInput(payload);
    const course = await Course_1.default.create({
        title,
        name: title,
        description: payload.description?.trim() || '',
        creditHours,
        code: '',
        universityId: null,
        type: Course_1.CourseType.HOME,
        isHomeCourse: true,
        createdBy: admin._id,
    });
    return (0, exports.getCourseById)(course._id.toString());
};
exports.createHomeCourse = createHomeCourse;
const updateHomeCourse = async (courseId, payload) => {
    const { title, creditHours } = validateCourseInput(payload);
    const course = await Course_1.default.findOne({
        _id: courseId,
        $or: [{ isHomeCourse: true }, { type: Course_1.CourseType.HOME }],
    });
    if (!course) {
        throw new AppError_1.NotFoundError('Course not found.', 'The requested home course could not be located.', 'Refresh the list and try again.', 'COURSE_NOT_FOUND');
    }
    course.title = title;
    course.name = title;
    course.description = payload.description?.trim() || '';
    course.creditHours = creditHours;
    course.isHomeCourse = true;
    course.type = Course_1.CourseType.HOME;
    await course.save();
    return (0, exports.getCourseById)(courseId);
};
exports.updateHomeCourse = updateHomeCourse;
const deleteHomeCourse = async (courseId) => {
    const deleted = await Course_1.default.findOneAndDelete({
        _id: courseId,
        $or: [{ isHomeCourse: true }, { type: Course_1.CourseType.HOME }],
    });
    if (!deleted) {
        throw new AppError_1.NotFoundError('Course not found.', 'The requested home course could not be located.', 'Refresh the list and try again.', 'COURSE_NOT_FOUND');
    }
    return deleted;
};
exports.deleteHomeCourse = deleteHomeCourse;
const seedDemoHomeCoursesIfNeeded = async () => {
    const existingCourses = await Course_1.default.countDocuments();
    if (existingCourses > 0) {
        return false;
    }
    const admin = await ensureAdminUser();
    const coursesToCreate = DEMO_HOME_COURSES.map((course) => ({
        title: course.title,
        name: course.title,
        description: course.description || '',
        creditHours: course.creditHours,
        code: '',
        universityId: null,
        type: Course_1.CourseType.HOME,
        isHomeCourse: true,
        createdBy: admin._id,
    }));
    await Course_1.default.insertMany(coursesToCreate);
    return true;
};
exports.seedDemoHomeCoursesIfNeeded = seedDemoHomeCoursesIfNeeded;
