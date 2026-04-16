import Application, { ApplicationStatus } from '../models/Application';
import AdvisorProfile from '../models/AdvisorProfile';
import StudentProfile from '../models/StudentProfile';
import * as applicationService from './applicationService';

export const getAssignedApplications = async (advisorId: string) => {
  return await Application.find({
    advisorId,
  }).populate('studentId', 'name email sapId');
};

export const getAssignedStudents = async (advisorId: string) => {
  const applications = await Application.find({ advisorId }).select('studentId');
  const studentIds = Array.from(
    new Set(applications.map((application) => application.studentId.toString()))
  );

  return StudentProfile.find({ userId: { $in: studentIds } }).sort({ updatedAt: -1 });
};

export const reviewApplication = async (
  applicationId: string,
  advisorId: string,
  status: ApplicationStatus
) => {
  return applicationService.updateStatus(applicationId, advisorId, status);
};

export const getAdvisorProfile = async (userId: string) => {
  return await AdvisorProfile.findOne({ userId }).populate('userId', '-password');
};
