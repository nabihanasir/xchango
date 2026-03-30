import Application, { ApplicationStatus } from '../models/Application';
import AdvisorProfile from '../models/AdvisorProfile';

export const getAssignedApplications = async (advisorId: string) => {
  return await Application.find({ advisorId }).populate('studentId selectedUniversity');
};

export const reviewApplication = async (applicationId: string, status: ApplicationStatus) => {
  return await Application.findByIdAndUpdate(
    applicationId,
    { status },
    { new: true }
  );
};

export const getAdvisorProfile = async (userId: string) => {
  return await AdvisorProfile.findOne({ userId }).populate('userId', '-password');
};
