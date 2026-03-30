import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import Application from '../models/Application';

export const getStudentProfile = async (userId: string) => {
  return await StudentProfile.findOne({ userId }).populate('userId', '-password');
};

export const updateStudentProfile = async (userId: string, profileData: any) => {
  return await StudentProfile.findOneAndUpdate(
    { userId },
    { ...profileData },
    { new: true, upsert: true }
  );
};

export const applyToUniversity = async (studentId: string, applicationData: any) => {
  const { universityId, countryId, intake } = applicationData;

  const existingApplication = await Application.findOne({ 
    studentId, 
    selectedUniversity: universityId, 
    intake 
  });
  
  if (existingApplication) {
    throw new Error('Application already exists for this university and intake');
  }

  const application = await Application.create({
    studentId,
    selectedUniversity: universityId,
    selectedCountry: countryId,
    intake,
    status: 'submitted',
  });

  return application;
};

export const getStudentApplications = async (studentId: string) => {
  return await Application.find({ studentId }).populate('selectedUniversity selectedCountry');
};
