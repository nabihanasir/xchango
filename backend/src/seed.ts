import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { UserRole } from './models/User';
import Country from './models/Country';
import University from './models/University';
import Application, { ApplicationStatus } from './models/Application';
import StudentProfile from './models/StudentProfile';
import Course, { CourseType } from './models/Course';
import CourseRequest from './models/CourseRequest';
import CourseMatchResult from './models/CourseMatchResult';
import bcrypt from 'bcryptjs';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Country.deleteMany({});
    await University.deleteMany({});
    await Application.deleteMany({});
    await StudentProfile.deleteMany({});
    await Course.deleteMany({});
    await CourseRequest.deleteMany({});
    await CourseMatchResult.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@xchango.com',
      password,
      phone: '+92-300-0000001',
      sapId: '70000001',
      role: UserRole.ADMIN,
      isActive: true,
    });

    // Create Advisor
    const advisor = await User.create({
      name: 'Advisor One',
      email: 'advisor@xchango.com',
      password,
      phone: '+92-300-0000002',
      sapId: '70000002',
      role: UserRole.ADVISOR,
      isActive: true,
    });

    // Create Students
    const student1 = await User.create({
      name: 'Nabiha Nasir',
      email: 'student@xchango.com',
      password,
      phone: '+92-300-0000003',
      sapId: '70000003',
      role: UserRole.STUDENT,
      isActive: true,
    });

    // Create StudentProfile
    await StudentProfile.create({
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

    const student2 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password,
      phone: '+92-300-0000004',
      sapId: '70000004',
      role: UserRole.STUDENT,
      isActive: true,
    });

    await StudentProfile.create({
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
    const sk = await Country.create({
      name: 'South Korea',
      code: 'KR',
    });

    const malaysia = await Country.create({
      name: 'Malaysia',
      code: 'MY',
    });

    // Create Universities
    const snu = await University.create({
      name: 'Seoul National University',
      countryId: sk._id,
      website: 'https://www.snu.ac.kr',
      seatLimit: 30,
    });

    const um = await University.create({
      name: 'University of Malaya',
      countryId: malaysia._id,
      website: 'https://www.um.edu.my',
      seatLimit: 40,
    });

    const homeUniversity = await University.create({
      name: 'FAST National University',
      countryId: malaysia._id,
      website: 'https://www.nu.edu.pk',
      seatLimit: 999,
    });

    // Create Applications
    await Application.create({
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
      status: ApplicationStatus.SHORTLISTED,
      documents: [],
      selectedCourses: [],
    });

    await Application.create({
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
      status: ApplicationStatus.PENDING_INTERVIEW,
      documents: [],
      selectedCourses: [],
    });

    const hostCourse1 = await Course.create({
      name: 'Advanced Data Structures',
      code: 'SNU-CS301',
      description: 'Tree structures, graph representations, heaps, hashing, and algorithmic analysis.',
      outlineText: 'Trees, AVL trees, heaps, graphs, shortest path, hashing, amortized analysis, recursion, greedy methods.',
      creditHours: 3,
      universityId: snu._id,
      type: CourseType.HOST,
    });

    const hostCourse2 = await Course.create({
      name: 'Database Systems',
      code: 'UM-CS240',
      description: 'Relational modelling, SQL design, transactions, concurrency, and normalization.',
      outlineText: 'ER modelling, relational algebra, SQL, normalization, indexing, transactions, concurrency control, query optimization.',
      creditHours: 3,
      universityId: um._id,
      type: CourseType.HOST,
    });

    const homeCourse1 = await Course.create({
      name: 'Data Structures and Algorithms',
      code: 'CS2005',
      description: 'Core data structures and asymptotic analysis for problem solving.',
      outlineText: 'Arrays, linked lists, trees, heaps, graphs, hashing, recursion, greedy algorithms, dynamic programming, complexity analysis.',
      creditHours: 3,
      universityId: homeUniversity._id,
      type: CourseType.HOME,
    });

    const homeCourse2 = await Course.create({
      name: 'Database Management Systems',
      code: 'CS3007',
      description: 'Relational databases, query languages, and transaction management.',
      outlineText: 'Data modelling, ER diagrams, SQL, normalization, indexing, transactions, concurrency, recovery, query optimization.',
      creditHours: 3,
      universityId: homeUniversity._id,
      type: CourseType.HOME,
    });

    await CourseRequest.create({
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
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

seed();
