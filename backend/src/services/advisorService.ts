import Application, { ApplicationStatus } from '../models/Application';
import AdvisorProfile from '../models/AdvisorProfile';

export const getAssignedApplications = async (advisorId: string) => {
  return await Application.find({ advisor: advisorId }).populate('student university');
};

export const reviewApplication = async (applicationId: string, status: ApplicationStatus, remarks: string) => {
  return await Application.findByIdAndUpdate(
    applicationId,
    { status, remarks, reviewDate: new Date() },
    { new: true }
  );
};

export const getAdvisorProfile = async (userId: string) => {
  return await AdvisorProfile.findOne({ user: userId }).populate('user', '-password');
};
