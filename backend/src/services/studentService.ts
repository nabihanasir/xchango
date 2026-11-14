import StudentProfile, {
  IStudentProfile,
  IStudentTranscript,
} from '../models/StudentProfile';
import User from '../models/User';
import Country from '../models/Country';
import { NotFoundError, ValidationError } from '../errors/AppError';
import {
  INTAKE_PATTERN,
  NAME_PATTERN,
  PHONE_PATTERN,
  REGISTRATION_NUMBER_PATTERN,
  readEmail,
  readString,
} from '../utils/validators';

const MAX_SEMESTER = 8;

interface StudentProfileUpdateInput {
  basicInfo?: Partial<IStudentProfile['basicInfo']>;
  preferences?: Partial<IStudentProfile['preferences']>;
}

const buildDefaultProfile = (user: {
  _id: IStudentProfile['userId'];
  name: string;
  email: string;
  phone?: string;
  sapId?: string;
}) => ({
  userId: user._id,
  registrationNumber: user.sapId || '',
  program: '',
  semester: '1',
  cgpa: 0,
  isProfileComplete: false,
  profileCompletionIssues: [],
  basicInfo: {
    fullName: user.name || '',
    cmsId: user.sapId || '',
    email: user.email || '',
    phone: user.phone || '',
    department: '',
    semester: 1,
  },
  preferences: {
    preferredCountries: [],
    degreeLevel: '',
    fieldOfInterest: '',
    intake: '',
  },
  transcript: {
    fileUrl: '',
    cgpa: 0,
    totalCredits: 0,
    semesters: [],
  },
});

export interface ProfileCompletionResult {
  isComplete: boolean;
  missingFields: string[];
}

const ensureProfileShape = (profile: IStudentProfile) => {
  const basicInfo = profile.basicInfo as Partial<IStudentProfile['basicInfo']> | undefined;
  profile.basicInfo = {
    fullName: basicInfo?.fullName ?? '',
    cmsId: basicInfo?.cmsId ?? '',
    email: basicInfo?.email ?? '',
    phone: basicInfo?.phone ?? '',
    department: basicInfo?.department ?? '',
    semester: basicInfo?.semester ?? 1,
  };

  const preferences = profile.preferences as Partial<IStudentProfile['preferences']> | undefined;
  profile.preferences = {
    preferredCountries: preferences?.preferredCountries ?? [],
    degreeLevel: preferences?.degreeLevel ?? '',
    fieldOfInterest: preferences?.fieldOfInterest ?? '',
    intake: preferences?.intake ?? '',
  };

  const transcript = profile.transcript as Partial<IStudentTranscript> | undefined;
  profile.transcript = {
    fileUrl: transcript?.fileUrl ?? '',
    cgpa: transcript?.cgpa ?? 0,
    totalCredits: transcript?.totalCredits ?? 0,
    semesters: transcript?.semesters ?? [],
  };
};

const syncProfileWithLegacyFields = (profile: IStudentProfile) => {
  ensureProfileShape(profile);
  profile.registrationNumber = profile.basicInfo.cmsId || profile.registrationNumber || '';
  profile.program = profile.basicInfo.department || profile.program || '';
  profile.semester = profile.basicInfo.semester ? String(profile.basicInfo.semester) : profile.semester || '';
  profile.cgpa = profile.transcript.cgpa || 0;
};

export const checkProfileCompletion = (profile: IStudentProfile): ProfileCompletionResult => {
  ensureProfileShape(profile);

  const missingFields: string[] = [];

  if (!profile.basicInfo.fullName.trim()) missingFields.push('name');
  if (!profile.basicInfo.email.trim()) missingFields.push('email');
  if (!profile.basicInfo.phone.trim()) missingFields.push('phone');
  if (!profile.basicInfo.cmsId.trim()) missingFields.push('registration number');
  if (!profile.basicInfo.department.trim()) missingFields.push('program');
  if (!profile.preferences.degreeLevel.trim()) missingFields.push('degree level');
  if (!profile.preferences.fieldOfInterest.trim()) missingFields.push('field of interest');
  if (!profile.preferences.intake.trim()) missingFields.push('intake');
  if (!profile.preferences.preferredCountries.length) missingFields.push('preferred countries');
  if (!profile.transcript.fileUrl.trim()) missingFields.push('transcript');
  if ((profile.transcript.cgpa || 0) <= 0) missingFields.push('CGPA');

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
};

const applyProfileCompletion = (profile: IStudentProfile) => {
  const completion = checkProfileCompletion(profile);
  profile.isProfileComplete = completion.isComplete;
  profile.profileCompletionIssues = completion.missingFields;
};

const hydrateProfileFromUser = (
  profile: IStudentProfile,
  user: { name: string; email: string; phone?: string; sapId?: string }
) => {
  ensureProfileShape(profile);
  profile.basicInfo.fullName = profile.basicInfo.fullName || user.name || '';
  profile.basicInfo.email = profile.basicInfo.email || user.email || '';
  profile.basicInfo.phone = profile.basicInfo.phone || user.phone || '';
  profile.basicInfo.cmsId = profile.basicInfo.cmsId || user.sapId || '';
  syncProfileWithLegacyFields(profile);
};

export const ensureStudentProfile = async (userId: string) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new NotFoundError(
      'Student not found.',
      'No student account exists for the requested profile.',
      'Verify the student account and try again.',
      'STUDENT_NOT_FOUND'
    );
  }

  let profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    profile = await StudentProfile.create(buildDefaultProfile(user));
    applyProfileCompletion(profile);
    await profile.save();
  } else {
    hydrateProfileFromUser(profile, user);
    applyProfileCompletion(profile);
    await profile.save();
  }

  return profile;
};

export const getStudentProfile = async (userId: string) => ensureStudentProfile(userId);

const DEGREE_LEVELS = ['Undergraduate', 'Graduate'];
const MAX_PREFERRED_COUNTRIES = 20;

/** Validates and normalises every field the student can edit; throws on the first problem. */
const required = (code: string, label: string) =>
  new ValidationError(`${label} is required.`, `${label} cannot be empty.`, `Enter ${label.toLowerCase()} and try again.`, code);

const sanitizeProfileInput = async (
  profileData: StudentProfileUpdateInput,
  userId?: string
): Promise<StudentProfileUpdateInput> => {
  const result: StudentProfileUpdateInput = {};
  const raw = (profileData ?? {}) as Record<string, any>;

  if (raw.basicInfo === undefined && raw.preferences === undefined) {
    throw new ValidationError(
      'No profile fields were provided.',
      'The request did not include any profile information.',
      'Fill in the profile form and try again.',
      'PROFILE_EMPTY'
    );
  }

  if (raw.basicInfo !== undefined) {
    if (raw.basicInfo === null || typeof raw.basicInfo !== 'object' || Array.isArray(raw.basicInfo)) {
      throw new ValidationError('Basic info is invalid.', 'Basic info must be an object.', 'Reload the page and try again.', 'BASIC_INFO_INVALID');
    }
    const info = raw.basicInfo as Record<string, unknown>;
    const basicInfo: Partial<IStudentProfile['basicInfo']> = {};

    if (info.fullName !== undefined) {
      basicInfo.fullName = readString(info.fullName, 'Full name', { max: 100, pattern: NAME_PATTERN, patternHint: 'Full name can only contain letters, spaces, apostrophes, dots and hyphens.' });
    }
    if (basicInfo.fullName !== undefined && basicInfo.fullName.length < 2) {
      throw new ValidationError('Name is too short.', 'The full name must be at least 2 characters.', 'Enter your full name and try again.', 'NAME_TOO_SHORT');
    }
    if (info.email !== undefined) {
      basicInfo.email = readEmail(info.email, 'Email', false);
      if (basicInfo.email && userId && (await User.exists({ email: basicInfo.email, _id: { $ne: userId } }))) {
        throw new ValidationError(
          'Email already in use.',
          'Another account already uses this email address.',
          'Enter a different email address.',
          'EMAIL_ALREADY_EXISTS'
        );
      }
    }
    if (info.phone !== undefined) {
      const phone = readString(info.phone, 'Phone number', { max: 20, pattern: PHONE_PATTERN, patternHint: 'Phone number must be 7-15 digits and may start with +.' });
      const digits = phone.replace(/[^0-9]/g, '').length;
      if (phone && (digits < 7 || digits > 15)) {
        throw new ValidationError('Phone number is invalid.', 'Phone number must contain between 7 and 15 digits.', 'Enter a valid phone number.', 'PHONE_INVALID');
      }
      basicInfo.phone = phone;
    }
    if (info.cmsId !== undefined) {
      basicInfo.cmsId = readString(info.cmsId, 'Registration number', {
        max: 30,
        pattern: REGISTRATION_NUMBER_PATTERN,
        patternHint: 'Registration number may only contain letters, digits, dashes, dots and slashes (3-30 characters).',
      });
    }
    if (info.department !== undefined) {
      basicInfo.department = readString(info.department, 'Program', { max: 100 });
      if (!basicInfo.department) throw required('DEPARTMENT_REQUIRED', 'Department');
    }
    if (info.semester !== undefined) {
      const semester = info.semester;
      if (typeof semester !== 'number' || !Number.isInteger(semester) || semester < 1 || semester > MAX_SEMESTER) {
        throw new ValidationError(
          `Semester must be a whole number between 1 and ${MAX_SEMESTER}.`,
          `The submitted semester (${String(semester)}) is outside the allowed range.`,
          `Enter a semester from 1 to ${MAX_SEMESTER}.`,
          'INVALID_SEMESTER'
        );
      }
      basicInfo.semester = semester;
    }
    result.basicInfo = basicInfo;
  }

  if (raw.preferences !== undefined) {
    if (raw.preferences === null || typeof raw.preferences !== 'object' || Array.isArray(raw.preferences)) {
      throw new ValidationError('Preferences are invalid.', 'Preferences must be an object.', 'Reload the page and try again.', 'PREFERENCES_INVALID');
    }
    const prefs = raw.preferences as Record<string, unknown>;
    const preferences: Partial<IStudentProfile['preferences']> = {};

    if (prefs.preferredCountries !== undefined) {
      if (!Array.isArray(prefs.preferredCountries) || prefs.preferredCountries.length > MAX_PREFERRED_COUNTRIES) {
        throw new ValidationError('Preferred countries are invalid.', `Provide a list of up to ${MAX_PREFERRED_COUNTRIES} countries.`, 'Select countries from the list.', 'PREFERRED_COUNTRIES_INVALID');
      }
      const requested = [...new Set(prefs.preferredCountries.map((country) => readString(country, 'Country', { required: true, max: 100 })))];
      const known = (await Country.find({ isActive: { $ne: false } }).select('name')).map((country) => country.name);
      const invalid = requested.filter((country) => !known.includes(country));
      if (invalid.length) {
        throw new ValidationError('Preferred country is not supported.', `Unsupported: ${invalid.join(', ')}.`, 'Select countries from the list.', 'PREFERRED_COUNTRIES_INVALID');
      }
      preferences.preferredCountries = requested;
    }
    if (prefs.degreeLevel !== undefined) {
      const level = readString(prefs.degreeLevel, 'Degree level', { max: 50 });
      if (!level) throw required('DEGREE_LEVEL_REQUIRED', 'Degree level');
      if (level && !DEGREE_LEVELS.includes(level)) {
        throw new ValidationError('Degree level is invalid.', `"${level}" is not an allowed degree level.`, `Choose one of: ${DEGREE_LEVELS.join(', ')}.`, 'DEGREE_LEVEL_INVALID');
      }
      preferences.degreeLevel = level;
    }
    if (prefs.fieldOfInterest !== undefined) {
      preferences.fieldOfInterest = readString(prefs.fieldOfInterest, 'Field of interest', {
        max: 100,
        pattern: /^[A-Za-z][A-Za-z0-9 &/,.'()-]*$/,
        patternHint: 'Field of interest can only contain letters, numbers, spaces and common punctuation.',
      });
      if (!preferences.fieldOfInterest) throw required('FIELD_OF_INTEREST_REQUIRED', 'Field of interest');
    }
    if (prefs.intake !== undefined) {
      preferences.intake = readString(prefs.intake, 'Intake', { max: 20, pattern: INTAKE_PATTERN, patternHint: 'Intake must look like "Fall 2026" or "Spring 2027".' });
      if (!preferences.intake) throw required('INTAKE_REQUIRED', 'Intake');
    }
    result.preferences = preferences;
  }

  return result;
};

export const updateStudentProfile = async (userId: string, rawProfileData: StudentProfileUpdateInput) => {
  const profileData = await sanitizeProfileInput(rawProfileData, userId);

  const profile = await ensureStudentProfile(userId);

  if (profileData.basicInfo) {
    profile.basicInfo = {
      ...profile.basicInfo,
      ...profileData.basicInfo,
    };
  }

  if (profileData.preferences) {
    profile.preferences = {
      ...profile.preferences,
      ...profileData.preferences,
    };
  }

  syncProfileWithLegacyFields(profile);
  applyProfileCompletion(profile);
  await profile.save();
  return profile;
};

export const saveTranscript = async (userId: string, transcriptData: IStudentTranscript) => {
  const cgpa = Number(transcriptData?.cgpa);
  if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 4.5) {
    throw new ValidationError(
      'Transcript CGPA is out of range.',
      `The CGPA read from the transcript (${String(transcriptData?.cgpa)}) is not between 0 and 4.5.`,
      'Upload a transcript that lists a valid CGPA on a 4.0 scale.',
      'TRANSCRIPT_CGPA_INVALID'
    );
  }
  const profile = await ensureStudentProfile(userId);
  profile.transcript = transcriptData;
  syncProfileWithLegacyFields(profile);
  applyProfileCompletion(profile);
  await profile.save();
  return profile.transcript;
};

export const getTranscript = async (userId: string) => {
  const profile = await ensureStudentProfile(userId);
  return profile.transcript;
};
