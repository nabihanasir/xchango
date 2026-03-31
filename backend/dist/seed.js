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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importStar(require("./models/User"));
const Country_1 = __importDefault(require("./models/Country"));
const University_1 = __importDefault(require("./models/University"));
const Application_1 = __importStar(require("./models/Application"));
const StudentProfile_1 = __importDefault(require("./models/StudentProfile"));
const Course_1 = __importStar(require("./models/Course"));
const CourseRequest_1 = __importDefault(require("./models/CourseRequest"));
const CourseMatchResult_1 = __importDefault(require("./models/CourseMatchResult"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
dotenv_1.default.config();
const seed = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
        console.log('Connected to MongoDB for seeding...');
        // Clear existing data
        await User_1.default.deleteMany({});
        await Country_1.default.deleteMany({});
        await University_1.default.deleteMany({});
        await Application_1.default.deleteMany({});
        await StudentProfile_1.default.deleteMany({});
        await Course_1.default.deleteMany({});
        await CourseRequest_1.default.deleteMany({});
        await CourseMatchResult_1.default.deleteMany({});
        const salt = await bcryptjs_1.default.genSalt(10);
        const password = await bcryptjs_1.default.hash('password123', salt);
        // Create Admin
        const admin = await User_1.default.create({
            name: 'Admin User',
            email: 'admin@xchango.com',
            password,
            phone: '+92-300-0000001',
            sapId: '70000001',
            role: User_1.UserRole.ADMIN,
            isActive: true,
        });
        // Create Advisor
        const advisor = await User_1.default.create({
            name: 'Advisor One',
            email: 'advisor@xchango.com',
            password,
            phone: '+92-300-0000002',
            sapId: '70000002',
            role: User_1.UserRole.ADVISOR,
            isActive: true,
        });
        // Create Students
        const student1 = await User_1.default.create({
            name: 'Nabiha Nasir',
            email: 'student@xchango.com',
            password,
            phone: '+92-300-0000003',
            sapId: '70000003',
            role: User_1.UserRole.STUDENT,
            isActive: true,
        });
        // Create StudentProfile
        await StudentProfile_1.default.create({
            userId: student1._id,
            registrationNumber: '49141',
            program: 'BS Computer Science',
            semester: '6th',
            cgpa: 3.8,
            basicInfo: {
                fullName: 'Nabiha Nasir',
                cmsId: '49141',
                email: 'student@xchango.com',
                phone: '+92-300-0000003',
                department: 'BS Computer Science',
                semester: 6,
            },
            preferences: {
                preferredCountries: ['South Korea', 'Malaysia'],
                degreeLevel: 'Undergraduate',
                fieldOfInterest: 'Computer Science',
                intake: 'Fall 2026',
            },
            transcript: {
                fileUrl: '',
                cgpa: 3.8,
                totalCredits: 18,
                semesters: [],
            },
        });
        const student2 = await User_1.default.create({
            name: 'Alice Johnson',
            email: 'alice@example.com',
            password,
            phone: '+92-300-0000004',
            sapId: '70000004',
            role: User_1.UserRole.STUDENT,
            isActive: true,
        });
        await StudentProfile_1.default.create({
            userId: student2._id,
            registrationNumber: '48220',
            program: 'BS Business Administration',
            semester: '4th',
            cgpa: 3.5,
            basicInfo: {
                fullName: 'Alice Johnson',
                cmsId: '48220',
                email: 'alice@example.com',
                phone: '+92-300-0000004',
                department: 'BS Business Administration',
                semester: 4,
            },
            preferences: {
                preferredCountries: ['Malaysia'],
                degreeLevel: 'Undergraduate',
                fieldOfInterest: 'Business Administration',
                intake: 'Spring 2026',
            },
            transcript: {
                fileUrl: '',
                cgpa: 3.5,
                totalCredits: 12,
                semesters: [],
            },
        });
        // Create Countries
        const sk = await Country_1.default.create({
            name: 'South Korea',
            code: 'KR',
        });
        const malaysia = await Country_1.default.create({
            name: 'Malaysia',
            code: 'MY',
        });
        // Create Universities
        const snu = await University_1.default.create({
            name: 'Seoul National University',
            countryId: sk._id,
            website: 'https://www.snu.ac.kr',
            seatLimit: 30,
        });
        const um = await University_1.default.create({
            name: 'University of Malaya',
            countryId: malaysia._id,
            website: 'https://www.um.edu.my',
            seatLimit: 40,
        });
        const homeUniversity = await University_1.default.create({
            name: 'FAST National University',
            countryId: malaysia._id,
            website: 'https://www.nu.edu.pk',
            seatLimit: 999,
        });
        // Create Applications
        await Application_1.default.create({
            studentId: student1._id,
            country: 'South Korea',
            university: 'KDU',
            program: 'BS Computer Science',
            travelHistory: {
                hasTravelHistory: true,
                details: 'Visited Malaysia for an academic event.',
            },
            passportValid: true,
            financialEligible: true,
            consentExtension: true,
            medicalCondition: {
                hasCondition: false,
                details: '',
            },
            registrationNumber: '49141',
            accommodationPreference: 'UNIVERSITY',
            status: Application_1.ApplicationStatus.SHORTLISTED,
            documents: [],
            selectedCourses: [],
        });
        await Application_1.default.create({
            studentId: student2._id,
            country: 'Malaysia',
            university: 'MMU',
            program: 'BS Business Administration',
            travelHistory: {
                hasTravelHistory: false,
                details: '',
            },
            passportValid: true,
            financialEligible: false,
            consentExtension: true,
            medicalCondition: {
                hasCondition: false,
                details: '',
            },
            registrationNumber: '48220',
            accommodationPreference: 'SELF',
            status: Application_1.ApplicationStatus.PENDING_INTERVIEW,
            documents: [],
            selectedCourses: [],
        });
        const hostCourse1 = await Course_1.default.create({
            name: 'Advanced Data Structures',
            code: 'SNU-CS301',
            description: 'Tree structures, graph representations, heaps, hashing, and algorithmic analysis.',
            outlineText: 'Trees, AVL trees, heaps, graphs, shortest path, hashing, amortized analysis, recursion, greedy methods.',
            creditHours: 3,
            universityId: snu._id,
            type: Course_1.CourseType.HOST,
        });
        const hostCourse2 = await Course_1.default.create({
            name: 'Database Systems',
            code: 'UM-CS240',
            description: 'Relational modelling, SQL design, transactions, concurrency, and normalization.',
            outlineText: 'ER modelling, relational algebra, SQL, normalization, indexing, transactions, concurrency control, query optimization.',
            creditHours: 3,
            universityId: um._id,
            type: Course_1.CourseType.HOST,
        });
        const homeCourse1 = await Course_1.default.create({
            name: 'Data Structures and Algorithms',
            code: 'CS2005',
            description: 'Core data structures and asymptotic analysis for problem solving.',
            outlineText: 'Arrays, linked lists, trees, heaps, graphs, hashing, recursion, greedy algorithms, dynamic programming, complexity analysis.',
            creditHours: 3,
            universityId: homeUniversity._id,
            type: Course_1.CourseType.HOME,
        });
        const homeCourse2 = await Course_1.default.create({
            name: 'Database Management Systems',
            code: 'CS3007',
            description: 'Relational databases, query languages, and transaction management.',
            outlineText: 'Data modelling, ER diagrams, SQL, normalization, indexing, transactions, concurrency, recovery, query optimization.',
            creditHours: 3,
            universityId: homeUniversity._id,
            type: Course_1.CourseType.HOME,
        });
        await CourseRequest_1.default.create({
            studentId: student1._id,
            status: 'pending',
            items: [
                {
                    hostCourseId: hostCourse1._id,
                    homeCourseId: homeCourse1._id,
                },
                {
                    hostCourseId: hostCourse2._id,
                    homeCourseId: homeCourse2._id,
                },
            ],
        });
        console.log('Data Seeded Successfully with Alignment and expanded scope!');
        process.exit();
    }
    catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};
seed();
