import University from '../models/University';
import Course from '../models/Course';
import Application, { ApplicationStatus } from '../models/Application';
import User, { UserRole } from '../models/User';
import Country from '../models/Country';
import CourseMapping from '../models/CourseMapping';
import AdvisorProfile from '../models/AdvisorProfile';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const populateApplications = <T>(query: T) =>
  (query as any)
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

export const getAllStats = async () => {
  const studentCount = await User.countDocuments({ role: 'student' });
  const applicationCount = await Application.countDocuments();
  const approvedCount = await Application.countDocuments({ status: ApplicationStatus.SHORTLISTED });
  const pendingCount = await Application.countDocuments({ status: ApplicationStatus.PENDING_INTERVIEW });

  // Dashboard Stats matching frontend adminStats
  const adminStats = [
    { title: 'Total Users', value: studentCount.toString(), icon: 'users', trend: '+0%', color: 'blue' },
    { title: 'Total Applications', value: applicationCount.toString(), icon: 'file-text', trend: '+0%', color: 'yellow' },
    { title: 'Approved', value: approvedCount.toString(), icon: 'check-circle', trend: '+0%', color: 'green' },
    { title: 'Pending', value: pendingCount.toString(), icon: 'clock', trend: '+0%', color: 'purple' },
  ];

  // Applications per Country matching frontend countryData
  const countries = await Country.find();
  const countryData = await Promise.all(
    countries.map(async (c) => {
      const apps = await Application.countDocuments({ country: c.name });
      return { name: c.name, applications: apps };
    })
  );

  // Monthly Trend matching frontend monthlyTrend
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const monthlyTrend = months.map((month) => ({ month, apps: 0 })); 

  return {
    adminStats,
    countryData,
    monthlyTrend,
  };
};

export const createUniversity = async (universityData: any) => {
  return await University.create(universityData);
};

export const createCourse = async (courseData: any) => {
  return await Course.create(courseData);
};

export const getAllUsers = async () => {
  return await User.find().select('-password');
};

export const getAllApplications = async () =>
  populateApplications(Application.find().sort({ createdAt: -1 }));

export const getPendingApplications = async () =>
  populateApplications(
    Application.find({
      status: {
        $in: [
          ApplicationStatus.DRAFT,
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.PENDING,
          ApplicationStatus.PENDING_INTERVIEW,
        ],
      },
    }).sort({ createdAt: -1 })
  );

const generateTemporaryPassword = () => {
  return crypto.randomBytes(6).toString('base64url');
};

export const createUser = async (userData: any) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    sapId,
    designation,
    department,
    experience,
  } = userData;

  if (!name?.trim() || !email?.trim() || !role) {
    throw new Error('Name, email, and role are required.');
  }

  const normalizedRole = role as UserRole;
  const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists.');
  }

  if (normalizedRole === UserRole.ADVISOR) {
    if (!designation?.trim() || !department?.trim()) {
      throw new Error('Designation and department are required for advisors.');
    }
  }

  if (normalizedRole === UserRole.STUDENT && (!phone?.trim() || !sapId?.trim())) {
    throw new Error('Phone and SAP ID are required for student accounts.');
  }

  const plainPassword = password?.trim() || generateTemporaryPassword();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role: normalizedRole,
    phone: phone?.trim() || undefined,
    sapId: sapId?.trim() || undefined,
  });

  try {
    if (normalizedRole === UserRole.ADVISOR) {
      await AdvisorProfile.create({
        userId: user._id,
        designation: designation.trim(),
        department: department.trim(),
        assignedStudents: [],
        experience: typeof experience === 'number' ? experience : 0,
      });
    }
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    sapId: user.sapId,
    designation: normalizedRole === UserRole.ADVISOR ? designation?.trim() : undefined,
    department: normalizedRole === UserRole.ADVISOR ? department?.trim() : undefined,
    ...(password?.trim() ? {} : { password: plainPassword }),
  };
};

export const updateApplicationOfferLetter = async (applicationId: string, offerLetterUrl: string) => {
  // In the new schema, we have a separate OfferLetter model
  const OfferLetter = require('../models/OfferLetter').default;
  
  const application = await Application.findById(applicationId);
  if (!application) throw new Error('Application not found');

  const offerLetter = await OfferLetter.create({
    applicationId,
    fileUrl: offerLetterUrl,
    issuedBy: application.studentId, // Placeholder, usually an admin
  });

  await Application.findByIdAndUpdate(applicationId, { status: ApplicationStatus.READY_FOR_SUBMISSION });
  
  return offerLetter;
};

export const createMapping = async (homeCourseId: string, hostCourseId: string, applicationId: string) => {
  const homeCourse = await Course.findById(homeCourseId);
  const hostCourse = await Course.findById(hostCourseId);
  if (!homeCourse || !hostCourse) throw new Error('Course not found');

  const { calculateSimilarity } = require('../utils/similarity');
  const similarityScore = calculateSimilarity(homeCourse.name, hostCourse.name);

  return await CourseMapping.create({
    applicationId,
    homeCourseId,
    hostCourseId,
    similarityScore,
  });
};

export const getAllMappings = async () => {
  return await CourseMapping.find().populate('homeCourseId hostCourseId');
};
