import University from '../models/University';
import Course from '../models/Course';
import Application, { ApplicationStatus } from '../models/Application';
import User, { UserRole } from '../models/User';
import Country from '../models/Country';
import CourseMapping from '../models/CourseMapping';
import AdvisorProfile from '../models/AdvisorProfile';
import AiModelConfig, { AiProvider, IAiModelConfig } from '../models/AiModelConfig';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as courseService from './courseService';
import { assignPendingApplicationsForCountry } from './applicationService';
import * as universityAdminService from './universityAdminService';
import { appUrl, notifyUserSafely } from './notificationService';
import { ValidationError } from '../errors/AppError';
import {
  NAME_PATTERN,
  PHONE_PATTERN,
  SAP_ID_PATTERN,
  assertObjectId,
  assertOneOf,
  readEmail,
  readNumber,
  readPassword,
  readString,
  readUrl,
} from '../utils/validators';
import { buildPage, paginateQuery, type PageRequest } from '../utils/pagination';

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

export const createUniversity = async (universityData: any) => universityAdminService.saveUniversity(null, universityData);

export const updateUniversity = async (universityId: string, universityData: any) =>
  universityAdminService.saveUniversity(universityId, universityData);

export const listUniversities = async () => universityAdminService.listUniversitiesForAdmin();

export const createHostCourse = async (adminId: string, courseData: any) =>
  universityAdminService.createHostCourse(adminId, courseData);

export const createCourse = async (adminId: string, courseData: any) => {
  return courseService.createHomeCourse(adminId, courseData);
};

/** Returns every user, or one page of them (newest first) when a page request is supplied. */
export const getAllUsers = async (page: PageRequest | null = null) => {
  const [users, total] = await Promise.all([
    page
      ? User.find().select('-password').sort({ createdAt: -1, _id: -1 }).skip(page.skip).limit(page.limit).lean()
      : User.find().select('-password').lean(),
    page ? User.countDocuments() : Promise.resolve(0),
  ]);
  const advisorIds = users.filter((user) => user.role === UserRole.ADVISOR).map((user) => user._id);
  const advisorProfiles = await AdvisorProfile.find(page ? { userId: { $in: advisorIds } } : {})
    .select('userId countries')
    .lean();
  const countriesByAdvisor = new Map(advisorProfiles.map((profile) => [String(profile.userId), profile.countries ?? []]));

  const withCountries = users.map((user) =>
    user.role === UserRole.ADVISOR ? { ...user, countries: countriesByAdvisor.get(String(user._id)) ?? [] } : user
  );
  return page ? buildPage(withCountries, total, page) : withCountries;
};

/** Countries come from the database, so any country an admin has added can be assigned to an advisor. */
const normalizeAdvisorCountries = async (countries: unknown): Promise<string[]> => {
  if (countries !== undefined && (!Array.isArray(countries) || countries.length > 100)) {
    throw new ValidationError('Countries are invalid.', 'Countries must be a list.', 'Select countries from the list.', 'ADVISOR_COUNTRIES_INVALID');
  }
  const requested = Array.isArray(countries) ? countries.map((country) => readString(country, 'Country', { required: true, max: 100 })) : [];
  const known = await Country.find({ isActive: { $ne: false } }).select('name');
  const allowed = known.map((country) => country.name);
  const invalid = requested.filter((country) => !allowed.includes(country));
  if (invalid.length) {
    throw new ValidationError(
      'Unsupported country.',
      `Unsupported countries: ${invalid.join(', ')}.`,
      `Choose from: ${allowed.join(', ')}.`,
      'ADVISOR_COUNTRIES_INVALID'
    );
  }
  return [...new Set(requested)];
};

export const setAdvisorCountries = async (rawUserId: unknown, countries: unknown) => {
  const userId = assertObjectId(rawUserId, 'Advisor', 'ADVISOR_INVALID');
  const normalized = await normalizeAdvisorCountries(countries);
  const profile = await AdvisorProfile.findOneAndUpdate({ userId }, { countries: normalized }, { new: true });
  if (!profile) {
    throw new Error('Advisor profile not found.');
  }
  // Applications that were waiting for an advisor in these countries can now be assigned.
  for (const country of normalized) {
    await assignPendingApplicationsForCountry(country);
  }
  return { _id: userId, countries: profile.countries };
};

export const getAllApplications = async (page: PageRequest | null = null) =>
  paginateQuery(
    populateApplications(Application.find().sort({ createdAt: -1, _id: -1 })),
    () => Application.countDocuments(),
    page,
  );

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

  const cleanName = readString(name, 'Name', {
    required: true,
    max: 100,
    pattern: NAME_PATTERN,
    patternHint: 'Name can only contain letters, spaces, apostrophes, dots and hyphens.',
  });
  const cleanEmail = readEmail(email, 'Email');
  const normalizedRole = assertOneOf(role, Object.values(UserRole) as UserRole[], 'Role', 'ROLE_INVALID');

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    throw new ValidationError(
      'User already exists.',
      'An account with this email address already exists.',
      'Use a different email address.',
      'USER_ALREADY_EXISTS'
    );
  }

  const cleanPhone = readString(phone, 'Phone', {
    required: normalizedRole === UserRole.STUDENT,
    max: 20,
    pattern: PHONE_PATTERN,
    patternHint: 'Phone number must be 7-15 digits and may start with +.',
  });
  const cleanSapId = readString(sapId, 'SAP ID', {
    required: normalizedRole === UserRole.STUDENT,
    max: 10,
    pattern: SAP_ID_PATTERN,
    patternHint: 'SAP ID must be 5-10 digits.',
  });

  let cleanDesignation = '';
  let cleanDepartment = '';
  let cleanExperience = 0;
  if (normalizedRole === UserRole.ADVISOR) {
    cleanDesignation = readString(designation, 'Designation', { required: true, max: 100 });
    cleanDepartment = readString(department, 'Department', { required: true, max: 100 });
    cleanExperience = readNumber(experience, 'Experience', { min: 0, max: 60, integer: true, required: false }) ?? 0;
  }

  const advisorCountries = normalizedRole === UserRole.ADVISOR ? await normalizeAdvisorCountries(userData.countries) : [];

  const suppliedPassword = typeof password === 'string' ? password.trim() : '';
  if (suppliedPassword) {
    readPassword(suppliedPassword, 'Password');
  }
  const plainPassword = suppliedPassword || generateTemporaryPassword();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: hashedPassword,
    role: normalizedRole,
    phone: cleanPhone || undefined,
    sapId: cleanSapId || undefined,
  });

  try {
    if (normalizedRole === UserRole.ADVISOR) {
      await AdvisorProfile.create({
        userId: user._id,
        designation: cleanDesignation,
        department: cleanDepartment,
        assignedStudents: [],
        experience: cleanExperience,
        countries: advisorCountries,
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
    designation: normalizedRole === UserRole.ADVISOR ? cleanDesignation : undefined,
    department: normalizedRole === UserRole.ADVISOR ? cleanDepartment : undefined,
    countries: normalizedRole === UserRole.ADVISOR ? advisorCountries : undefined,
    ...(suppliedPassword ? {} : { password: plainPassword }),
  };
};

export const updateApplicationOfferLetter = async (adminId: string, rawApplicationId: unknown, rawOfferLetterUrl: unknown) => {
  const applicationId = assertObjectId(rawApplicationId, 'Application', 'APPLICATION_INVALID');
  const offerLetterUrl = readString(rawOfferLetterUrl, 'Offer letter URL', {
    required: true,
    max: 2048,
    pattern: /^(\/uploads\/[A-Za-z0-9._\-\/]+|https?:\/\/\S+)$/,
    patternHint: 'Offer letter must be an uploaded file path or an http(s) link.',
  });
  // In the new schema, we have a separate OfferLetter model
  const OfferLetter = require('../models/OfferLetter').default;
  
  const application = await Application.findById(applicationId);
  if (!application) throw new Error('Application not found');

  const offerLetter = await OfferLetter.create({
    applicationId,
    fileUrl: offerLetterUrl,
    issuedBy: adminId,
  });

  await Application.findByIdAndUpdate(applicationId, { status: ApplicationStatus.READY_FOR_SUBMISSION });

  await notifyUserSafely({
    userId: application.studentId,
    subject: 'Offer letter issued',
    type: 'offer_letter',
    message: `Your offer letter for ${application.university} has been issued. Log in to download it.`,
    metadata: { applicationId: application._id, offerLetterId: offerLetter._id },
    action: { label: 'View application', url: appUrl(`/dashboard/applications/${application._id}`) },
  });
  
  return offerLetter;
};

export const createMapping = async (rawHomeCourseId: unknown, rawHostCourseId: unknown, rawApplicationId: unknown) => {
  const homeCourseId = assertObjectId(rawHomeCourseId, 'Home course', 'MAPPING_INVALID');
  const hostCourseId = assertObjectId(rawHostCourseId, 'Host course', 'MAPPING_INVALID');
  const applicationId = assertObjectId(rawApplicationId, 'Application', 'MAPPING_INVALID');
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

const toSafeAiModelConfig = (config: IAiModelConfig | null) => {
  if (!config) return null;

  return {
    _id: config._id,
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.modelName,
    isEnabled: config.isEnabled,
    apiKeySet: Boolean(config.apiKey),
    apiKeyPreview: config.apiKey ? `••••${config.apiKey.slice(-4)}` : null,
    updatedAt: config.updatedAt,
  };
};

// Raw config (including plaintext apiKey) for internal use by the course matcher only.
export const getAiModelConfigRaw = async () => {
  return await AiModelConfig.findOne();
};

export const getAiModelConfig = async () => {
  const config = await getAiModelConfigRaw();
  return toSafeAiModelConfig(config);
};

export const upsertAiModelConfig = async (adminId: string, payload: any) => {
  const { provider, baseUrl, apiKey, model, isEnabled } = payload;

  assertOneOf(provider, Object.values(AiProvider) as AiProvider[], 'Provider', 'AI_PROVIDER_INVALID');
  const cleanBaseUrl = readUrl(baseUrl, 'Base URL', true);
  const cleanModel = readString(model, 'Model name', {
    required: true,
    max: 200,
    pattern: /^[A-Za-z0-9._:\/@+\-]+$/,
    patternHint: 'Model name contains unsupported characters.',
  });
  const cleanApiKey = readString(apiKey, 'API key', { max: 500 });
  if (cleanApiKey && /\s/.test(cleanApiKey)) {
    throw new ValidationError('API key is invalid.', 'The API key must not contain spaces.', 'Paste the key exactly as issued.', 'AI_API_KEY_INVALID');
  }
  if (isEnabled !== undefined && typeof isEnabled !== 'boolean') {
    throw new ValidationError('Enabled flag is invalid.', 'Enabled must be true or false.', 'Reload the page and try again.', 'AI_ENABLED_INVALID');
  }

  const existing = await AiModelConfig.findOne();

  if (!existing && !cleanApiKey) {
    throw new ValidationError('API key is required.', 'No API key has been saved yet.', 'Enter the provider API key.', 'AI_API_KEY_REQUIRED');
  }

  const update = {
    provider,
    baseUrl: cleanBaseUrl,
    modelName: cleanModel,
    isEnabled: isEnabled !== false,
    updatedBy: adminId,
    ...(cleanApiKey ? { apiKey: cleanApiKey } : {}),
  };

  const saved = existing
    ? await AiModelConfig.findByIdAndUpdate(existing._id, update, { new: true })
    : await AiModelConfig.create(update);

  return toSafeAiModelConfig(saved);
};
