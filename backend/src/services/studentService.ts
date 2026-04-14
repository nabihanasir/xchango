import StudentProfile, {
  IStudentDocumentItem,
  IStudentProfile,
  IStudentTranscript,
} from '../models/StudentProfile';
import User from '../models/User';
import { NotFoundError } from '../errors/AppError';

interface StudentProfileUpdateInput {
  basicInfo?: Partial<IStudentProfile['basicInfo']>;
  preferences?: Partial<IStudentProfile['preferences']>;
}

interface CreateDocumentInput {
  type: string;
  fileUrl: string;
  status?: string;
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
  documents: [],
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

  profile.documents = Array.isArray(profile.documents) ? profile.documents : [];
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
  if (!profile.documents.length) missingFields.push('documents');

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

export const updateStudentProfile = async (userId: string, profileData: StudentProfileUpdateInput) => {
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

export const addDocument = async (userId: string, documentData: CreateDocumentInput) => {
  const profile = await ensureStudentProfile(userId);
  profile.documents.unshift({
    type: documentData.type,
    fileUrl: documentData.fileUrl,
    status: documentData.status || 'pending',
    uploadedAt: new Date(),
  } as IStudentDocumentItem);
  applyProfileCompletion(profile);
  await profile.save();
  return profile.documents;
};

export const getDocuments = async (userId: string) => {
  const profile = await ensureStudentProfile(userId);
  return profile.documents.sort(
    (left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
  );
};

export const removeDocument = async (userId: string, documentId: string) => {
  const profile = await ensureStudentProfile(userId);
  const documentIndex = profile.documents.findIndex(
    (document) => document._id?.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError(
      'Document not found.',
      'The requested student document does not exist.',
      'Refresh the page and try again.',
      'DOCUMENT_NOT_FOUND'
    );
  }

  profile.documents.splice(documentIndex, 1);
  applyProfileCompletion(profile);
  await profile.save();
  return profile.documents;
};
