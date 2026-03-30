import University from '../models/University';
import Course from '../models/Course';
import Application from '../models/Application';
import User from '../models/User';
import Country from '../models/Country';
import CourseMapping from '../models/CourseMapping';
import bcrypt from 'bcryptjs';

export const getAllStats = async () => {
  const studentCount = await User.countDocuments({ role: 'student' });
  const applicationCount = await Application.countDocuments();
  const approvedCount = await Application.countDocuments({ status: 'approved' });
  const pendingCount = await Application.countDocuments({ status: 'submitted' }); // Adjusted for new status

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
      const apps = await Application.countDocuments({ selectedCountry: c._id });
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

export const createUser = async (userData: any) => {
  const { password, ...rest } = userData;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return await User.create({ ...rest, password: hashedPassword });
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

  await Application.findByIdAndUpdate(applicationId, { status: 'offer_issued' });
  
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
