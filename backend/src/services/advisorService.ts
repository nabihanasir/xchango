import Application, { ApplicationStatus } from '../models/Application';
import AdvisorProfile from '../models/AdvisorProfile';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import { NotFoundError, ValidationError } from '../errors/AppError';
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

export interface AdvisorProfileUpdate {
  name?: unknown;
  designation?: unknown;
  department?: unknown;
  phone?: unknown;
  bio?: unknown;
  officeHours?: unknown;
}

const readText = (value: unknown, label: string, max: number, required: boolean) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError(
      `${label} must be text.`,
      `The ${label.toLowerCase()} value sent was not a string.`,
      `Enter ${label.toLowerCase()} as plain text.`
    );
  }
  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new ValidationError(
      `${label} is required.`,
      `The ${label.toLowerCase()} field was empty.`,
      `Enter a value for ${label.toLowerCase()}.`
    );
  }
  if (trimmed.length > max) {
    throw new ValidationError(
      `${label} must be at most ${max} characters.`,
      `The ${label.toLowerCase()} value is too long.`,
      `Shorten ${label.toLowerCase()} to ${max} characters or fewer.`
    );
  }
  return trimmed;
};

export const updateAdvisorProfile = async (userId: string, input: AdvisorProfileUpdate) => {
  const profile = await AdvisorProfile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError(
      'Advisor profile not found.',
      'No advisor profile is linked to this account.',
      'Contact an administrator to set up your advisor profile.'
    );
  }

  const name = readText(input.name, 'Name', 100, true);
  const designation = readText(input.designation, 'Designation', 100, true);
  const department = readText(input.department, 'Department', 100, true);
  const phone = readText(input.phone, 'Phone', 30, false);
  const bio = readText(input.bio, 'Bio', 1000, false);
  const officeHours = readText(input.officeHours, 'Office hours', 200, false);

  if (name !== undefined) {
    await User.findByIdAndUpdate(userId, { name });
  }
  if (designation !== undefined) profile.designation = designation;
  if (department !== undefined) profile.department = department;
  if (phone !== undefined) profile.phone = phone;
  if (bio !== undefined) profile.bio = bio;
  if (officeHours !== undefined) profile.officeHours = officeHours;
  await profile.save();

  return getAdvisorProfile(userId);
};
