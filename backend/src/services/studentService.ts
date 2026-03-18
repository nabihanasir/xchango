import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import Application from '../models/Application';

export const getStudentProfile = async (userId: string) => {
  return await StudentProfile.findOne({ user: userId }).populate('user', '-password');
};

export const updateStudentProfile = async (userId: string, profileData: any) => {
  return await StudentProfile.findOneAndUpdate(
    { user: userId },
    { ...profileData },
    { new: true, upsert: true }
  );
};

export const applyToUniversity = async (studentId: string, applicationData: any) => {
  const { universityId, program, sapId, semester, universityEmail, travelHistory, passportStatus, financialEligibility, degreeExtension } = applicationData;

  const existingApplication = await Application.findOne({ student: studentId, university: universityId, program });
  if (existingApplication) {
    throw new Error('Application already exists for this university and program');
  }

  const application = await Application.create({
    student: studentId,
    university: universityId,
    program,
    sapId,
    semester,
    universityEmail,
    travelHistory,
    passportStatus,
    financialEligibility,
    degreeExtension,
  });

  return application;
};

export const getStudentApplications = async (studentId: string) => {
  return await Application.find({ student: studentId }).populate('university');
};
